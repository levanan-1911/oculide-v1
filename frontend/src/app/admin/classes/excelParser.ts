/**
 * Tiện ích đọc và phân tích tệp Excel (.xlsx, .xls) và CSV trực tiếp trên trình duyệt
 * Đồng bộ chuẩn hiển thị thông báo lỗi, cảnh báo và bảng xem trước như module Người dùng & Phân quyền.
 */

export interface ParsedStudentRow {
  rowNumber: number;
  id: string; // Mã SV
  name: string; // Họ tên
  email: string; // Email
  status: 'Đang học';
  missingFields: string[];
  hasAccount?: boolean;
  homeroomClass?: string;
}

export interface ClassMetadataFromExcel {
  classCode?: string; // Mã lớp học phần (VD: CMU-CS 316 AIS, CS 252 DDIS)
  courseCode?: string; // Mã môn học (VD: CMU-CS 316, CS 252)
  classSection?: string; // Mã lớp / phân lớp (VD: AIS, DDIS)
  className?: string; // Tên môn học (VD: Fundamentals of Computing 2)
  credits?: number; // Số tín chỉ (VD: 3)
  studentCount?: number; // Sĩ số lớp
  lecturerName?: string;
  semester?: string;
  department?: string;
}

export interface StudentParseResult {
  file: File;
  totalRows: number;
  parsedStudents: ParsedStudentRow[];
  warnings: string[];
  errorMessage?: string;
  metadata?: ClassMetadataFromExcel;
}

// Giải mã trực tiếp tệp .xlsx (ZIP + XML chuẩn Office Open XML) ngay trên trình duyệt
export async function extractRowsFromXlsxBuffer(buffer: ArrayBuffer): Promise<string[][]> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Tìm End of Central Directory (0x06054b50)
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error('Không tìm thấy cấu trúc ZIP hợp lệ trong tệp Excel (.xlsx).');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  const zipEntries = new Map<string, { method: number; data: Uint8Array }>();
  let ptr = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (ptr + 46 > bytes.length || view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const entryName = new TextDecoder('utf-8').decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    if (localHeaderOffset + 30 <= bytes.length) {
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compressedData = bytes.subarray(dataStart, dataStart + compressedSize);
      zipEntries.set(entryName, { method, data: compressedData });
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }

  async function readZipEntryText(entryPath: string): Promise<string | null> {
    const entry = zipEntries.get(entryPath);
    if (!entry) return null;
    if (entry.method === 0) {
      return new TextDecoder('utf-8').decode(entry.data);
    }
    if (entry.method === 8) {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(new Uint8Array(entry.data));
      writer.close();
      const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
      return new TextDecoder('utf-8').decode(decompressedBuffer);
    }
    return null;
  }

  const domParser = new DOMParser();

  // 1. Đọc bảng chuỗi dùng chung (xl/sharedStrings.xml)
  const sharedStrings: string[] = [];
  const sharedStringsXml = await readZipEntryText('xl/sharedStrings.xml');
  if (sharedStringsXml) {
    const ssDoc = domParser.parseFromString(sharedStringsXml, 'application/xml');
    const siNodes = Array.from(ssDoc.getElementsByTagName('si'));
    siNodes.forEach((si) => {
      const tNodes = Array.from(si.getElementsByTagName('t'));
      sharedStrings.push(tNodes.map((t) => t.textContent || '').join(''));
    });
  }

  // 2. Tìm trang tính đầu tiên (xl/worksheets/sheet1.xml)
  let sheetPath = 'xl/worksheets/sheet1.xml';
  if (!zipEntries.has(sheetPath)) {
    const found = Array.from(zipEntries.keys())
      .filter((k) => k.startsWith('xl/worksheets/sheet') && k.endsWith('.xml'))
      .sort()[0];
    if (found) sheetPath = found;
  }

  const sheetXml = await readZipEntryText(sheetPath);
  if (!sheetXml) {
    throw new Error('Không tìm thấy trang tính dữ liệu trong tệp Excel.');
  }

  const sheetDoc = domParser.parseFromString(sheetXml, 'application/xml');
  const rowElements = Array.from(sheetDoc.getElementsByTagName('row'));
  const extractedRows: string[][] = [];

  rowElements.forEach((rowEl) => {
    const cellElements = Array.from(rowEl.getElementsByTagName('c'));
    const rowValues: string[] = [];
    let nextFallbackCol = 0;

    cellElements.forEach((cEl) => {
      const ref = cEl.getAttribute('r') || '';
      const colLetters = ref.replace(/[0-9]/g, '');
      let colIndex = nextFallbackCol;
      if (colLetters) {
        let computed = 0;
        for (let i = 0; i < colLetters.length; i++) {
          computed = computed * 26 + (colLetters.toUpperCase().charCodeAt(i) - 64);
        }
        colIndex = Math.max(0, computed - 1);
      }
      nextFallbackCol = colIndex + 1;

      while (rowValues.length <= colIndex) {
        rowValues.push('');
      }

      const cellType = cEl.getAttribute('t');
      let cellText = '';
      const tNodes = Array.from(cEl.getElementsByTagName('t'));
      if (tNodes.length > 0) {
        cellText = tNodes.map((t) => t.textContent || '').join('');
      } else {
        const vNode = cEl.getElementsByTagName('v')[0];
        const rawVal = vNode?.textContent ?? '';
        if (cellType === 's') {
          const idx = parseInt(rawVal, 10);
          cellText = !Number.isNaN(idx) && sharedStrings[idx] !== undefined ? sharedStrings[idx] : rawVal;
        } else {
          cellText = rawVal;
        }
      }

      rowValues[colIndex] = cellText.trim();
    });

    if (rowValues.some((cell) => cell !== '')) {
      extractedRows.push(rowValues);
    }
  });

  return extractedRows;
}

// Tách dòng CSV/TSV giữ nguyên cả các cột rỗng
export function parseTextToRows(text: string): string[][] {
  const trimmedText = text.trim();
  if (!trimmedText) return [];

  // Hỗ trợ trường hợp tệp .xls được xuất dưới dạng bảng HTML/XML
  if (trimmedText.toLowerCase().includes('<table') || trimmedText.toLowerCase().includes('<tr')) {
    const doc = new DOMParser().parseFromString(trimmedText, 'text/html');
    const trList = Array.from(doc.querySelectorAll('tr'));
    if (trList.length > 0) {
      return trList
        .map((tr) => {
          const cells: string[] = [];
          Array.from(tr.querySelectorAll('th, td')).forEach((cell) => {
            const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
            const text = (cell.textContent || '').trim();
            cells.push(text);
            for (let c = 1; c < colspan; c++) {
              cells.push('');
            }
          });
          return cells;
        })
        .filter((r) => r.some((c) => c !== ''));
    }
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' || ch === "'") {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

// Phân tích và kiểm tra tính hợp lệ của các dòng dữ liệu sinh viên
export async function parseStudentFile(file: File): Promise<StudentParseResult> {
  const fileName = file.name.toLowerCase();
  const isCsv = fileName.endsWith('.csv');
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

  if (!isCsv && !isExcel) {
    return {
      file,
      totalRows: 0,
      parsedStudents: [],
      warnings: [],
      errorMessage: 'Định dạng tệp không được hỗ trợ. Vui lòng tải lên tệp .csv, .xlsx hoặc .xls.',
    };
  }

  if (file.size > 10 * 1024 * 1024) {
    return {
      file,
      totalRows: 0,
      parsedStudents: [],
      warnings: [],
      errorMessage: 'Dung lượng tệp vượt quá giới hạn cho phép (Tối đa 10MB).',
    };
  }

  let rawRows: string[][] = [];
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isZipSignature =
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04;

    if (isZipSignature) {
      rawRows = await extractRowsFromXlsxBuffer(buffer);
    } else {
      const text = new TextDecoder('utf-8').decode(buffer);
      rawRows = parseTextToRows(text);
    }
  } catch (err) {
    return {
      file,
      totalRows: 0,
      parsedStudents: [],
      warnings: [],
      errorMessage:
        err instanceof Error
          ? err.message
          : 'Không thể đọc nội dung tệp. Vui lòng kiểm tra lại định dạng tệp Excel / CSV.',
    };
  }

  if (rawRows.length === 0) {
    return {
      file,
      totalRows: 0,
      parsedStudents: [],
      warnings: [],
      errorMessage: 'Tệp rỗng hoặc không tìm thấy dữ liệu nào.',
    };
  }

  const warnings: string[] = [];

  // 1. Quét tìm dòng tiêu đề thật sự (Bỏ qua các dòng quốc hiệu, tiêu ngữ, tên trường phía trên)
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const cells = rawRows[i].map((c) => (c || '').trim().toLowerCase());
    const hasCodeCol = cells.some(
      (c) =>
        (c.includes('mã') ||
          c.includes('mssv') ||
          c.includes('code') ||
          c.includes('studentid') ||
          c.includes('student_id') ||
          c.includes('sinh viên')) &&
        !c.includes('stt') &&
        !c.includes('thứ tự') &&
        !c.includes('môn') &&
        !c.includes('lớp')
    );
    const hasNameCol = cells.some(
      (c) =>
        c.includes('họ') ||
        c.includes('tên') ||
        c.includes('name') ||
        c.includes('firstname') ||
        c.includes('lastname')
    );

    if (hasCodeCol && hasNameCol) {
      headerRowIndex = i;
      break;
    }
  }

  // 1.1. Trích xuất thông tin lớp học từ các hàng đầu trang (Header Metadata nếu có theo mẫu trường)
  const metadata: ClassMetadataFromExcel = {};
  const topRowsLimit = headerRowIndex >= 0 ? headerRowIndex : Math.min(rawRows.length, 10);
  for (let r = 0; r < topRowsLimit; r++) {
    const rowClean = rawRows[r].join(' ').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

    // Tách mã lớp và mã môn (VD: LỚP: CMU-CS 316 AIS - MÔN: ... hoặc LỚP: CS 252 DDIS - MÔN: ...)
    const codeMatch = rowClean.match(/(?:lớp|class)\s*:\s*(.*?)(?=\s*-\s*(?:môn|mon|học phần|sĩ số|số tc|gv|giảng viên)|$)/i);
    if (codeMatch && !metadata.classCode) {
      const fullClassCode = codeMatch[1].trim();
      metadata.classCode = fullClassCode;
      const parts = fullClassCode.split(/\s+/);
      if (parts.length >= 2) {
        metadata.classSection = parts[parts.length - 1]; // "AIS" hoặc "DDIS" (Mã lớp / phân lớp)
        metadata.courseCode = parts.slice(0, -1).join(' '); // "CMU-CS 316" hoặc "CS 252" (Mã môn)
      } else {
        metadata.classSection = fullClassCode;
      }
    }

    // Tách tên môn (VD: MÔN: Fundamentals of Computing 2)
    const monMatch = rowClean.match(/(?:môn|mon|course|subject)\s*:\s*(.*?)(?=\s*-\s*(?:lớp|học phần|sĩ số|số tc|gv|giảng viên)|$)/i);
    if (monMatch && !metadata.className) {
      metadata.className = monMatch[1].trim();
    }

    // Tách số tín chỉ (VD: SỐ TC: 3)
    const tcMatch = rowClean.match(/(?:số tc|so tc|tc|credits?)\s*:\s*(\d+)/i);
    if (tcMatch && !metadata.credits) {
      metadata.credits = parseInt(tcMatch[1], 10);
    }

    // Tách sĩ số nếu ghi rõ trong tiêu đề (VD: SĨ SỐ: 45)
    const siSoMatch = rowClean.match(/(?:sĩ số|si so|sỉ số|si so lop|sĩ số lớp|tổng số sv|tổng số sinh viên)\s*[:*]?\s*(\d+)/i);
    if (siSoMatch && !metadata.studentCount) {
      metadata.studentCount = parseInt(siSoMatch[1], 10);
    }

    // Tách tên giảng viên (VD: GIẢNG VIÊN: HUỲNH BÁ DIỆU)
    const gvMatch = rowClean.match(/(?:giảng viên|giang vien|lecturer|instructor|gv)\s*:\s*([^–—\-]+?)(?=\s*-\s*|$)/i);
    if (gvMatch && !metadata.lecturerName) {
      metadata.lecturerName = gvMatch[1].trim();
    }

    // Tách khoa (VD: Khoa Công nghệ Phần mềm Việt - Mỹ (CMU))
    if ((rowClean.toLowerCase().includes('khoa ') || rowClean.toLowerCase().includes('viện ')) && !metadata.department) {
      metadata.department = rawRows[r].find((c) => c.toLowerCase().includes('khoa') || c.toLowerCase().includes('viện')) || '';
    }
  }

  // 1.2. Nhận diện Học kỳ & Năm học thông minh dựa vào từ khóa hoặc ngày tháng lập bảng
  const fullTextAllRows = rawRows.map((r) => r.join(' ')).join('\n');
  const hkExplicitMatch = fullTextAllRows.match(/(?:học kỳ|hoc ky|hk)\s*[:*]?\s*([123]|hè|he|t)\b/i);
  const yearMatch = fullTextAllRows.match(/(?:năm học|nam hoc)\s*[:*]?\s*([0-9]{4}\s*[-–]\s*[0-9]{4})/i);
  const dateMatch = fullTextAllRows.match(/tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i);

  let detectedTerm = 'HK1';
  let academicYearStr = yearMatch ? yearMatch[1].replace(/\s+/g, '') : '';

  if (hkExplicitMatch) {
    const rawTerm = hkExplicitMatch[1].toLowerCase();
    if (rawTerm === '1') detectedTerm = 'HK1';
    else if (rawTerm === '2') detectedTerm = 'HK2';
    else detectedTerm = 'HKT';
  } else if (dateMatch) {
    const month = parseInt(dateMatch[1], 10);
    const year = parseInt(dateMatch[2], 10);
    // Tháng 8 đến Tháng 1 năm sau -> Học kỳ 1 (Thu)
    if (month >= 8 || month === 1) {
      detectedTerm = 'HK1';
      if (!academicYearStr) {
        academicYearStr = month === 1 ? `${year - 1}–${year}` : `${year}–${year + 1}`;
      }
    } else if (month >= 2 && month <= 5) {
      // Tháng 2 đến Tháng 5 -> Học kỳ 2 (Xuân)
      detectedTerm = 'HK2';
      if (!academicYearStr) {
        academicYearStr = `${year - 1}–${year}`;
      }
    } else {
      // Tháng 6, 7 -> Học kỳ Hè (HKT)
      detectedTerm = 'HKT';
      if (!academicYearStr) {
        academicYearStr = `${year - 1}–${year}`;
      }
    }
  }

  if (academicYearStr) {
    metadata.semester = `${detectedTerm} ${academicYearStr}`;
  }

  const isHeaderRow = headerRowIndex >= 0;
  const maxCols = Math.max(...rawRows.map((r) => r.length), 0);
  let headerRow = isHeaderRow ? rawRows[headerRowIndex].map((c) => c.trim().toLowerCase()) : [];
  while (headerRow.length < maxCols) {
    headerRow.push('');
  }

  let codeIdx = -1;
  let nameIdx = -1;
  let firstNameIdx = -1;
  let middleNameIdx = -1;
  let lastNameIdx = -1;
  let splitLastNameIdx = -1;
  let emailIdx = -1;
  let classColIdx = -1;
  let actualDataStartIndex = isHeaderRow ? headerRowIndex + 1 : 0;

  const sttIdx = isHeaderRow
    ? headerRow.findIndex(
        (c) => c === 'stt' || c === 'tt' || c === 'no' || c === 'no.' || c.includes('thứ tự')
      )
    : -1;

  if (isHeaderRow) {
    // Tự động bỏ qua các dòng tiêu đề phụ (Sub-header điểm số, phần trăm, chia cột Họ/Tên)
    while (actualDataStartIndex < rawRows.length) {
      const nextRow = rawRows[actualDataStartIndex];
      const nextRowLower = nextRow.map((c) => (c || '').trim().toLowerCase());
      const hasRealCode = nextRow.some((c) =>
        /^(?:[123]\d{8,10}|SV\d{4,10}|\d{8,12})$/i.test(c.trim())
      );
      const isPercentRow = nextRow.some((c) => (c || '').includes('%'));
      const hasGradeSubheaders = nextRowLower.some((c) =>
        ['chuyên cần', 'bài tập', 'thực hành', 'kiểm tra', 'đồ án', 'cuối kỳ', 'giữa kỳ', 'quá trình', 'kthp'].some(
          (k) => c.includes(k)
        )
      );
      const hasNameSubheaders = nextRowLower.some((c) =>
        ['họ', 'tên', 'ho', 'ten', 'họ đệm', 'họ lót', 'chữ đệm', 'tên đệm'].includes(c)
      );

      if (!hasRealCode && (isPercentRow || hasGradeSubheaders || hasNameSubheaders)) {
        if (hasNameSubheaders) {
          const subLastName = nextRowLower.findIndex(
            (c) => c === 'tên' || c === 'ten' || c === 'name' || c === 'tên riêng'
          );
          if (subLastName >= 0) {
            splitLastNameIdx = subLastName;
          }
        }
        actualDataStartIndex++;
      } else {
        break;
      }
    }

    codeIdx = headerRow.findIndex(
      (c) =>
        (c.includes('mssv') ||
          c.includes('mã sv') ||
          c.includes('studentid') ||
          c.includes('student_id') ||
          c.includes('mã sinh viên') ||
          c.includes('mã số sinh viên') ||
          c.includes('mã tài khoản') ||
          c.includes('code') ||
          c === 'id') &&
        !c.includes('stt') &&
        !c.includes('thứ tự') &&
        !c.includes('lớp')
    );

    firstNameIdx = headerRow.findIndex(
      (c, idx) => idx !== codeIdx && (c === 'họ' || c === 'ho' || c === 'firstname' || c === 'first_name')
    );
    middleNameIdx = headerRow.findIndex(
      (c, idx) =>
        idx !== codeIdx &&
        idx !== firstNameIdx &&
        (c.includes('tên đệm') ||
          c.includes('ten dem') ||
          c.includes('chữ đệm') ||
          c === 'middlename' ||
          c === 'middle_name')
    );
    lastNameIdx = headerRow.findIndex(
      (c, idx) =>
        idx !== codeIdx &&
        idx !== firstNameIdx &&
        idx !== middleNameIdx &&
        (c === 'tên' || c === 'ten' || c === 'lastname' || c === 'last_name')
    );

    nameIdx = headerRow.findIndex(
      (c, idx) =>
        idx !== codeIdx &&
        (c.includes('họ và tên') ||
          c.includes('họ & tên') ||
          c.includes('họ tên') ||
          c.includes('họ và tên đệm') ||
          c.includes('fullname') ||
          c.includes('full name'))
    );

    if (nameIdx === -1 && firstNameIdx >= 0) {
      nameIdx = firstNameIdx;
    }

    // Nhận diện cột Tên riêng kế tiếp nếu dùng kiểu ghép 2 cột (Họ đệm + Tên, hoặc Merged Header 'HỌ VÀ TÊN')
    if (nameIdx >= 0 && lastNameIdx === -1 && splitLastNameIdx === -1 && nameIdx + 1 < maxCols) {
      const nextHeader = headerRow[nameIdx + 1] || '';
      const isNextColExplicitTen =
        nextHeader === 'tên' || nextHeader === 'ten' || nextHeader === 'name' || nextHeader === 'tên riêng';
      const isNextColEmpty = nextHeader === '';

      // Kiểm tra các dòng dữ liệu sinh viên thực tế đầu tiên sau tiêu đề để xác nhận cột kế tiếp là Tên riêng
      // Lọc bỏ qua các dòng tiêu đề phụ điểm số (Chuyên cần, 5.00%, ...)
      const sampleRows = rawRows
        .slice(actualDataStartIndex)
        .filter((r) => {
          const cCheck = codeIdx >= 0 ? (r[codeIdx] || '').trim() : '';
          return cCheck && !cCheck.includes('%') && !cCheck.toLowerCase().includes('mã');
        })
        .slice(0, 15);

      const nextColVals = sampleRows
        .map((r) => (r[nameIdx + 1] || '').trim())
        .filter((v) => v.length > 0);

      const isGenderOnly =
        nextColVals.length > 0 &&
        nextColVals.every((v) => ['nam', 'nữ', 'male', 'female', 'm', 'f'].includes(v.toLowerCase()));

      const isNextColSingleWordName =
        nextColVals.length > 0 &&
        !isGenderOnly &&
        nextColVals.every((val) => {
          return (
            val.length <= 25 &&
            !/\d/.test(val) &&
            !val.includes('/') &&
            !val.includes('-') &&
            !val.includes('@') &&
            !val.includes('%') &&
            val.split(/\s+/).length <= 2
          );
        });

      if (isNextColExplicitTen || (isNextColEmpty && isNextColSingleWordName)) {
        splitLastNameIdx = nameIdx + 1;
      }
    }

    emailIdx = headerRow.findIndex(
      (c, idx) =>
        idx !== codeIdx &&
        idx !== nameIdx &&
        idx !== firstNameIdx &&
        idx !== middleNameIdx &&
        idx !== lastNameIdx &&
        (c.includes('email') || c.includes('mail') || c.includes('thư'))
    );

    classColIdx = headerRow.findIndex(
      (c, idx) =>
        idx !== codeIdx &&
        idx !== nameIdx &&
        idx !== firstNameIdx &&
        idx !== middleNameIdx &&
        idx !== lastNameIdx &&
        idx !== splitLastNameIdx &&
        idx !== emailIdx &&
        (c === 'lớp' || c === 'lop' || c === 'class' || c.includes('lớp sinh hoạt') || c.includes('mã lớp'))
    );

    const missingHeaderCols: string[] = [];
    if (codeIdx === -1) missingHeaderCols.push('Mã sinh viên');
    if (nameIdx === -1 && firstNameIdx === -1) missingHeaderCols.push('Họ và tên');

    if (missingHeaderCols.length > 0) {
      warnings.push(
        `Tệp thiếu cột tiêu đề bắt buộc: [${missingHeaderCols.join(', ')}]. Các trường thiếu sẽ được cảnh báo để bổ sung sau.`
      );
    }
  } else {
    codeIdx = 0;
    nameIdx = 1;
    emailIdx = maxCols > 2 ? 2 : -1;
    if (maxCols < 3) {
      const missingCount = 3 - maxCols;
      warnings.push(
        `Tệp chỉ có ${maxCols}/3 cột (thiếu ${missingCount} cột so với chuẩn: Mã sinh viên, Họ và tên, Email).`
      );
    }
  }

  const dataRows = isHeaderRow ? rawRows.slice(actualDataStartIndex) : rawRows;
  if (dataRows.length === 0) {
    return {
      file,
      totalRows: 0,
      parsedStudents: [],
      warnings,
      errorMessage: 'Tệp chỉ có dòng tiêu đề, chưa có dữ liệu sinh viên nào.',
    };
  }

  const NON_STUDENT_WORDS = [
    'bài tập', 'chuyên cần', 'thực hành', 'kiểm tra', 'đồ án', 'cuối kỳ', 'giữa kỳ',
    'quá trình', 'kthp', 'ghi chú', 'giáo vụ', 'giảng viên', 'lãnh đạo', 'khoa',
    'viện', 'trưởng khoa', 'đà nẵng', 'hà nội', 'tổng cộng', 'tổng số', 'chữ ký',
    'mã sv', 'mssv', 'họ và tên', 'họ tên', 'môn học', 'học phần', 'tỷ lệ', 'trọng số'
  ];

  const FOOTER_KEYWORDS = [
    'đà nẵng', 'hà nội', 'tp. hồ chí minh', 'giảng viên bộ môn', 'chữ ký',
    'giáo vụ', 'lãnh đạo khoa', 'trưởng khoa', 'ban giám hiệu', 'tổng số', 'tổng cộng'
  ];

  const parsedStudents: ParsedStudentRow[] = [];

  for (let index = 0; index < dataRows.length; index++) {
    const cols = dataRows[index];
    const displayRowNum = isHeaderRow ? actualDataStartIndex + 1 + index : index + 1;
    const lowerRowFull = cols.join(' ').toLowerCase();

    // 1. DỪNG LẠI NGAY LẬP TỨC khi chạm tới phần chân trang (chữ ký GV, giáo vụ, lãnh đạo, ngày tháng...)
    const isFooter =
      FOOTER_KEYWORDS.some((k) => lowerRowFull.includes(k)) ||
      (lowerRowFull.includes('ngày') && lowerRowFull.includes('tháng') && lowerRowFull.includes('năm'));

    if (isFooter) {
      break;
    }

    // 2. Bỏ qua các dòng tỷ lệ phần trăm điểm (như 5.00%, 10.00%, ...)
    if (cols.some((c) => (c || '').includes('%'))) {
      continue;
    }

    // 3. Kiểm tra số thứ tự (STT) nếu có: STT của sinh viên thật phải là số nguyên dương (1, 2, 3...)
    if (sttIdx >= 0) {
      const sttVal = (cols[sttIdx] ?? '').trim();
      if (sttVal && !/^\d+$/.test(sttVal)) {
        continue;
      }
    }

    // 4. Lấy và kiểm tra Mã sinh viên
    const rawCode = codeIdx >= 0 ? (cols[codeIdx] ?? '').trim() : '';
    const rawCodeLower = rawCode.toLowerCase();

    // Bỏ qua nếu mã chứa từ khóa tiêu đề hoặc có khoảng trắng (tiêu đề thành phần điểm)
    if (
      !rawCode ||
      rawCode.includes(' ') ||
      NON_STUDENT_WORDS.some((w) => rawCodeLower.includes(w)) ||
      /^\d+(\.\d+)?%$/.test(rawCode)
    ) {
      continue;
    }

    // Kiểm tra định dạng mã sinh viên hợp lệ (Mã DTU 9-11 số, hoặc SVxxxxx, hoặc mã ký tự 4-20)
    const isValidStudentCode =
      /^(?:[123]\d{8,10}|\d{7,12}|SV\d{4,10}|[A-Za-z0-9_\-]{4,20})$/i.test(rawCode);
    if (!isValidStudentCode) {
      continue;
    }

    // 5. Trích xuất và ghép Họ tên chuẩn
    let rawName = '';

    if (firstNameIdx >= 0 && lastNameIdx >= 0) {
      const parts = [
        (cols[firstNameIdx] ?? '').trim(),
        middleNameIdx >= 0 ? (cols[middleNameIdx] ?? '').trim() : '',
        (cols[lastNameIdx] ?? '').trim(),
      ].filter(Boolean);
      rawName = parts.join(' ');
    } else if (nameIdx >= 0) {
      rawName = (cols[nameIdx] ?? '').trim();

      // Kiểm tra ghép cột Tên riêng kế tiếp (ví dụ: 'Nguyễn Văn' ở nameIdx + 'An' ở nameIdx + 1)
      const nextColIdx = splitLastNameIdx >= 0 ? splitLastNameIdx : nameIdx + 1;
      if (nextColIdx < cols.length) {
        const nextVal = (cols[nextColIdx] ?? '').trim();
        const nextHeader = (headerRow[nextColIdx] ?? '').toLowerCase();
        const isExcludedHeader = ['lớp', 'class', 'stt', 'mã', 'email', 'điểm', 'ghi chú'].some((k) =>
          nextHeader.includes(k)
        );

        if (
          nextVal &&
          !isExcludedHeader &&
          !/\d/.test(nextVal) &&
          !['@', '%', '/', ':', '(', ')', '_'].some((ch) => nextVal.includes(ch)) &&
          nextVal.split(/\s+/).length <= 2 &&
          nextVal.length <= 25 &&
          !rawName.endsWith(nextVal)
        ) {
          rawName = `${rawName} ${nextVal}`.trim();
        }
      }
    }

    rawName = rawName.replace(/\s+/g, ' ').trim();

    // 6. Nhận diện email hoặc tự sinh email @dtu.edu.vn chuẩn
    const isDtuStudent = /^(?:[123]\d)\d{7,9}$/.test(rawCode) || /^\d{9,11}$/.test(rawCode) || /^SV\d+$/i.test(rawCode);
    let rawEmail = emailIdx >= 0 ? (cols[emailIdx] ?? '').trim() : '';
    if (!rawEmail && rawCode && isDtuStudent) {
      rawEmail = `${rawCode.toLowerCase()}@dtu.edu.vn`;
    }

    // Bỏ qua dòng hoàn toàn rỗng
    if (!rawCode && !rawName && !rawEmail) continue;

    const missingFields: string[] = [];
    if (!rawCode) missingFields.push('Thiếu Mã SV');
    if (!rawName) missingFields.push('Thiếu Họ và tên');

    const finalEmail = rawEmail || (rawCode ? `${rawCode.toLowerCase()}@dtu.edu.vn` : '');
    if (!finalEmail) {
      missingFields.push('Thiếu Email');
    } else if (rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      missingFields.push('Email sai định dạng');
    }

    if (missingFields.length > 0) {
      warnings.push(`Dòng ${displayRowNum}: ${missingFields.join(', ')}`);
    }

    const rawClassVal = classColIdx >= 0 ? (cols[classColIdx] ?? '').trim() : '';
    if (rawClassVal && !metadata.classCode) {
      metadata.classCode = rawClassVal;
      const parts = rawClassVal.split(/\s+/);
      if (parts.length >= 2) {
        metadata.classSection = parts[parts.length - 1];
        metadata.courseCode = parts.slice(0, -1).join(' ');
      } else {
        metadata.classSection = rawClassVal;
      }
    }

    parsedStudents.push({
      rowNumber: displayRowNum,
      id: rawCode ? rawCode.toUpperCase() : '',
      name: rawName,
      email: finalEmail,
      homeroomClass: rawClassVal || undefined,
      status: 'Đang học',
      missingFields,
    });
  }

  if (parsedStudents.length === 0) {
    return {
      file,
      totalRows: 0,
      parsedStudents: [],
      warnings,
      errorMessage: 'Không tìm thấy dữ liệu sinh viên hợp lệ nào trong tệp.',
    };
  }

  if (metadata && !metadata.studentCount) {
    metadata.studentCount = parsedStudents.length;
  }

  return {
    file,
    totalRows: dataRows.length,
    parsedStudents,
    warnings,
    metadata,
  };
}

// Tải tệp CSV mẫu chuẩn
export function downloadStudentSampleTemplate() {
  const sampleCsv = `Mã sinh viên,Họ và tên,Email\nSV184801,Nguyễn Văn An,an.nv@school.edu.vn\nSV184802,Trần Thu Bình,binh.tt@school.edu.vn\nSV184803,Lê Hải Nam,nam.lh@school.edu.vn\nSV184804,Phạm Minh Châu,chau.pm@school.edu.vn`;
  const blob = new Blob(['\uFEFF' + sampleCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Oculide_Mau_Danh_Sach_Sinh_Vien.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

