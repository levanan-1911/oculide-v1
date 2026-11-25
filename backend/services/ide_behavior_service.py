"""Dịch vụ phân tích hành vi gõ phím trong IDE (Keystroke Dynamics) và phát hiện đạo văn dựa trên AST/Token."""
import ast
import re
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Set, Tuple

_C_STYLE_KEYWORDS: Set[str] = {
    "int", "long", "double", "float", "char", "bool", "void", "string", "auto",
    "const", "static", "struct", "class", "public", "private", "protected",
    "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
    "return", "using", "namespace", "std", "include", "import", "new", "try",
    "catch", "throw", "true", "false", "null", "nullptr", "vector", "map", "set",
}


def analyze_ide_telemetry(
    prev_len: int,
    curr_len: int,
    elapsed_sec: float,
    keystroke_count: int,
) -> Dict[str, Any]:
    """
    Phân tích nhịp độ gõ phím và phát hiện mã nguồn xuất hiện đột ngột:
    - Nếu số ký tự tăng đột biến (>= 120 ký tự trong <= 10s) nhưng số phím bấm thực tế quá thấp
      (< 25% số ký tự tăng thêm) -> nghi vấn dán/tiêm code từ ngoài vào trình soạn thảo.
    """
    delta_chars = max(0, int(curr_len) - int(prev_len))
    safe_elapsed = max(0.5, float(elapsed_sec))
    typing_speed_cpm = round((max(0, int(keystroke_count)) / safe_elapsed) * 60.0, 1)

    is_suspicious_burst = (
        delta_chars >= 120
        and safe_elapsed <= 10.0
        and int(keystroke_count) < int(delta_chars * 0.25)
    )
    reason = None
    if is_suspicious_burst:
        reason = (
            f"Phát hiện {delta_chars} ký tự mã nguồn xuất hiện đột ngột trong {round(safe_elapsed, 1)}s "
            f"(chỉ ghi nhận {keystroke_count} lần bấm phím)"
        )

    return {
        "delta_chars": delta_chars,
        "typing_speed_cpm": typing_speed_cpm,
        "is_suspicious_burst": is_suspicious_burst,
        "reason": reason,
    }


def _normalize_python_ast(code: str) -> Optional[List[str]]:
    """Chuẩn hóa cây cú pháp AST Python: ẩn tên biến/hàm và hằng số để chống đổi tên biến."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return None

    tokens: List[str] = []
    for node in ast.walk(tree):
        node_name = type(node).__name__
        if isinstance(node, ast.Name):
            tokens.append("NAME_ID")
        elif isinstance(node, ast.FunctionDef):
            tokens.append("FUNC_DEF")
        elif isinstance(node, ast.arg):
            tokens.append("ARG_ID")
        elif isinstance(node, ast.Constant):
            tokens.append(f"CONST_{type(node.value).__name__}")
        elif isinstance(node, (ast.Load, ast.Store, ast.Del)):
            continue
        else:
            tokens.append(node_name)
    return tokens


def normalize_code_tokens(code: str, language: str = "cpp") -> List[str]:
    """Chuẩn hóa mã nguồn thành chuỗi token chuẩn (AST cho Python, Lexer chuẩn hóa cho C/C++/Java)."""
    if not code or not code.strip():
        return []

    lang = (language or "cpp").strip().lower()
    if lang in ("python", "py"):
        ast_tokens = _normalize_python_ast(code)
        if ast_tokens:
            return ast_tokens

    # Loại bỏ comment //, /* ... */ và # ...
    cleaned = re.sub(r"//.*?$", " ", code, flags=re.MULTILINE)
    cleaned = re.sub(r"/\*.*?\*/", " ", cleaned, flags=re.DOTALL)
    if lang in ("python", "py"):
        cleaned = re.sub(r"#.*?$", " ", cleaned, flags=re.MULTILINE)

    # Chuẩn hóa chuỗi và số
    cleaned = re.sub(r'"(?:\\.|[^"\\])*"', " STR ", cleaned)
    cleaned = re.sub(r"'(?:\\.|[^'\\])*'", " CHR ", cleaned)
    cleaned = re.sub(r"\b\d+(?:\.\d+)?\b", " NUM ", cleaned)

    raw_tokens = re.findall(r"[A-Za-z_]\w*|==|!=|<=|>=|&&|\|\||<<|>>|[^\s]", cleaned)
    normalized: List[str] = []
    for tok in raw_tokens:
        if re.match(r"^[A-Za-z_]\w*$", tok):
            normalized.append(tok if tok in _C_STYLE_KEYWORDS else "ID")
        else:
            normalized.append(tok)
    return normalized


def compute_code_similarity(code_a: str, code_b: str, language: str = "cpp") -> float:
    """Tính độ tương đồng cấu trúc AST/token giữa 2 bài nộp (0.0 - 1.0)."""
    toks_a = normalize_code_tokens(code_a, language)
    toks_b = normalize_code_tokens(code_b, language)
    if len(toks_a) < 8 or len(toks_b) < 8:
        return 0.0

    # Shingles 4-gram
    k = 4
    shingles_a = {tuple(toks_a[i : i + k]) for i in range(len(toks_a) - k + 1)}
    shingles_b = {tuple(toks_b[i : i + k]) for i in range(len(toks_b) - k + 1)}
    union = shingles_a | shingles_b
    jaccard = (len(shingles_a & shingles_b) / len(union)) if union else 0.0

    seq_ratio = SequenceMatcher(None, toks_a, toks_b).ratio()
    return round(0.5 * jaccard + 0.5 * seq_ratio, 4)


def find_room_plagiarism_pairs(
    submissions: List[Dict[str, Any]],
    threshold: float = 0.78,
) -> List[Dict[str, Any]]:
    """
    So sánh bài nộp mới nhất của từng sinh viên theo từng câu hỏi trong cùng phòng thi,
    trả về các cặp có độ tương đồng AST/token >= threshold.
    """
    latest_by_sq: Dict[Tuple[int, int], Dict[str, Any]] = {}
    for sub in submissions:
        sid = sub.get("student_id")
        qid = sub.get("question_id")
        if sid is None or qid is None:
            continue
        key = (int(qid), int(sid))
        existing = latest_by_sq.get(key)
        if not existing or int(sub.get("submission_id", 0)) > int(existing.get("submission_id", 0)):
            latest_by_sq[key] = sub

    by_question: Dict[int, List[Dict[str, Any]]] = {}
    for (qid, _), sub in latest_by_sq.items():
        by_question.setdefault(qid, []).append(sub)

    flagged: List[Dict[str, Any]] = []
    for qid, q_subs in by_question.items():
        n = len(q_subs)
        for i in range(n):
            for j in range(i + 1, n):
                sa, sb = q_subs[i], q_subs[j]
                lang = sa.get("language") or sb.get("language") or "cpp"
                sim = compute_code_similarity(
                    sa.get("code_content") or "",
                    sb.get("code_content") or "",
                    lang,
                )
                if sim >= threshold:
                    flagged.append({
                        "question_id": qid,
                        "question_title": sa.get("question_title") or f"Câu #{qid}",
                        "student_a_id": sa.get("student_id"),
                        "student_a_name": sa.get("student_name") or f"SV #{sa.get('student_id')}",
                        "student_a_code": sa.get("student_code"),
                        "submission_a_id": sa.get("submission_id"),
                        "student_b_id": sb.get("student_id"),
                        "student_b_name": sb.get("student_name") or f"SV #{sb.get('student_id')}",
                        "student_b_code": sb.get("student_code"),
                        "submission_b_id": sb.get("submission_id"),
                        "language": lang,
                        "similarity_pct": round(sim * 100, 1),
                    })

    flagged.sort(key=lambda x: x["similarity_pct"], reverse=True)
    return flagged
