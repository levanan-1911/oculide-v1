"use client";

import { useMemo, useState } from "react";
import { Bold, Code2, Eye, Heading2, List, Pencil, Quote } from "lucide-react";

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

type InlinePart = { text: string; kind: "text" | "bold" | "code" | "italic" };

function parseInline(source: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ text: source.slice(cursor, index), kind: "text" });
    const token = match[0];
    if (token.startsWith("**")) parts.push({ text: token.slice(2, -2), kind: "bold" });
    else if (token.startsWith("`")) parts.push({ text: token.slice(1, -1), kind: "code" });
    else parts.push({ text: token.slice(1, -1), kind: "italic" });
    cursor = index + token.length;
  }
  if (cursor < source.length) parts.push({ text: source.slice(cursor), kind: "text" });
  return parts;
}

function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, index) => {
        if (part.kind === "bold") return <strong key={index}>{part.text}</strong>;
        if (part.kind === "italic") return <em key={index}>{part.text}</em>;
        if (part.kind === "code") return <code key={index} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-rose-700">{part.text}</code>;
        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
}

function MarkdownPreview({ source }: { source: string }) {
  const blocks = useMemo(() => {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const output: Array<{ type: "heading" | "paragraph" | "bullet" | "number" | "quote" | "code"; text: string; level?: number }> = [];
    let inCode = false;
    let codeLines: string[] = [];
    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        if (inCode) {
          output.push({ type: "code", text: codeLines.join("\n") });
          codeLines = [];
          inCode = false;
        } else inCode = true;
        continue;
      }
      if (inCode) { codeLines.push(line); continue; }
      if (!line.trim()) continue;
      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      if (heading) output.push({ type: "heading", text: heading[2], level: heading[1].length });
      else if (/^\s*[-*]\s+/.test(line)) output.push({ type: "bullet", text: line.replace(/^\s*[-*]\s+/, "") });
      else if (/^\s*\d+\.\s+/.test(line)) output.push({ type: "number", text: line.replace(/^\s*\d+\.\s+/, "") });
      else if (/^\s*>\s?/.test(line)) output.push({ type: "quote", text: line.replace(/^\s*>\s?/, "") });
      else output.push({ type: "paragraph", text: line });
    }
    if (inCode) output.push({ type: "code", text: codeLines.join("\n") });
    return output;
  }, [source]);

  return (
    <div className="min-h-64 space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
      {blocks.length === 0 ? <p className="text-slate-400">Chưa có nội dung xem trước. Hãy nhập Markdown trong tab Chỉnh sửa.</p> : blocks.map((block, index) => {
        if (block.type === "heading") {
          const className = block.level === 1 ? "text-2xl font-bold text-slate-900" : block.level === 2 ? "text-xl font-semibold text-slate-900" : "text-lg font-semibold text-slate-900";
          return <div key={index} className={className}><InlineMarkdown text={block.text} /></div>;
        }
        if (block.type === "bullet" || block.type === "number") {
          return <div key={index} className="flex gap-2 pl-2"><span aria-hidden="true">{block.type === "bullet" ? "•" : `${index + 1}.`}</span><span><InlineMarkdown text={block.text} /></span></div>;
        }
        if (block.type === "quote") return <blockquote key={index} className="border-l-2 border-indigo-300 pl-3 italic text-slate-600"><InlineMarkdown text={block.text} /></blockquote>;
        if (block.type === "code") return <pre key={index} className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100"><code>{block.text}</code></pre>;
        return <p key={index}><InlineMarkdown text={block.text} /></p>;
      })}
    </div>
  );
}

export default function MarkdownEditor({ value, onChange, error, disabled = false }: MarkdownEditorProps) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  function wrapSelection(before: string, after = before) {
    const textarea = document.getElementById("question-description") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || "text";
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefixLine(prefix: string) {
    const textarea = document.getElementById("question-description") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    onChange(`${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`);
    requestAnimationFrame(() => { textarea.focus(); textarea.setSelectionRange(start + prefix.length, start + prefix.length); });
  }

  const tabClass = (active: boolean) => `inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${active ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Chế độ soạn thảo đề bài">
          <button type="button" role="tab" aria-selected={tab === "edit"} onClick={() => setTab("edit")} className={tabClass(tab === "edit")}><Pencil size={14} /> Chỉnh sửa</button>
          <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")} className={tabClass(tab === "preview")}><Eye size={14} /> Xem trước</button>
        </div>
        {tab === "edit" && <div className="flex items-center gap-1">
          <button type="button" disabled={disabled} onClick={() => wrapSelection("**")} aria-label="In đậm văn bản đã chọn" title="Bold" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><Bold size={15} /></button>
          <button type="button" disabled={disabled} onClick={() => prefixLine("## ")} aria-label="Thêm tiêu đề" title="Tiêu đề" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><Heading2 size={15} /></button>
          <button type="button" disabled={disabled} onClick={() => prefixLine("- ")} aria-label="Add bullet" title="Danh sách gạch đầu dòng" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><List size={15} /></button>
          <button type="button" disabled={disabled} onClick={() => wrapSelection("`")} aria-label="Inline code" title="Inline code" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><Code2 size={15} /></button>
          <button type="button" disabled={disabled} onClick={() => prefixLine("> ")} aria-label="Trích dẫn" title="Trích dẫn" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><Quote size={15} /></button>
        </div>}
      </div>
      {tab === "edit" ? <textarea
        id="question-description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={13}
        placeholder={"## Đề bài\nMô tả đề bài rõ ràng...\n\n## Dữ liệu vào\nMô tả định dạng dữ liệu đầu vào.\n\n## Kết quả\nMô tả kết quả cần trả về."}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "question-description-error" : undefined}
        className={`w-full resize-y rounded-xl border bg-white p-4 font-mono text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:bg-slate-50 ${error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 focus:border-indigo-400 focus:ring-indigo-100"}`}
      /> : <MarkdownPreview source={value} />}
      {error && <p id="question-description-error" className="mt-1.5 text-sm text-rose-600">{error}</p>}
      <p className="mt-1.5 text-xs text-slate-400">Hỗ trợ tiêu đề, đoạn văn, danh sách, trích dẫn, chữ đậm/nghiêng, mã lệnh và khối mã. Nội dung xem trước được hiển thị an toàn.</p>
    </section>
  );
}
