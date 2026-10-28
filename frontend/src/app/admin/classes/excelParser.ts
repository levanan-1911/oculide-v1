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
}

export interface StudentParseResult {
  file: File;
  totalRows: number;
  parsedStudents: ParsedStudentRow[];
  warnings: string[];
  errorMessage?: string;
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
      if (cellType === 'inlineStr') {
        const tNodes = Array.from(cEl.getElementsByTagName('t'));
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
        .map((tr) =>
          Array.from(tr.querySelectorAll('th, td')).map((cell) => (cell.textContent || '').trim())
        )
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
  const firstRow = rawRows[0].map((c) => c.trim().toLowerCase());

  const isHeaderRow = firstRow.some(
    (cell) =>
      cell.includes('mã') ||
      cell.includes('mssv') ||
      cell.includes('code') ||
      cell.includes('sinh viên') ||
      cell.includes('họ') ||
      cell.includes('tên') ||
      cell.includes('name') ||
      cell.includes('email') ||
      cell.includes('mail')
  );

  let codeIdx = 0;
  let nameIdx = 1;
  let emailIdx = 2;

  if (isHeaderRow) {
    const foundCodeIdx = firstRow.findIndex(
      (c) =>
        c.includes('mã') ||
        c.includes('mssv') ||
        c.includes('code') ||
        c === 'id' ||
        c.includes('tài khoản')
    );
    const foundNameIdx = firstRow.findIndex(
      (c, idx) =>
        idx !== foundCodeIdx &&
        (c.includes('họ') || c.includes('tên') || c.includes('name'))
    );
    const foundEmailIdx = firstRow.findIndex(
      (c) => c.includes('email') || c.includes('mail') || c.includes('thư')
    );

    const missingHeaderCols: string[] = [];
    if (foundCodeIdx === -1) missingHeaderCols.push('Mã sinh viên');
    if (foundNameIdx === -1) missingHeaderCols.push('Họ và tên');
    if (foundEmailIdx === -1) missingHeaderCols.push('Email');

    if (missingHeaderCols.length > 0) {
      warnings.push(
        `Tệp thiếu cột tiêu đề bắt buộc: [${missingHeaderCols.join(', ')}]. Các trường thiếu sẽ được cảnh báo để bổ sung sau.`
      );
    }

    codeIdx = foundCodeIdx;
    nameIdx = foundNameIdx;
    emailIdx = foundEmailIdx;
  } else {
    const maxCols = Math.max(...rawRows.map((r) => r.length));
    if (maxCols < 3) {
      const missingCount = 3 - maxCols;
      warnings.push(
        `Tệp chỉ có ${maxCols}/3 cột (thiếu ${missingCount} cột so với chuẩn: Mã sinh viên, Họ và tên, Email).`
      );
    }
  }

  const dataRows = isHeaderRow ? rawRows.slice(1) : rawRows;
  if (dataRows.length === 0) {
    return {
      file,
      totalRows: 0,
      parsedStudents: [],
      warnings,
      errorMessage: 'Tệp chỉ có dòng tiêu đề, chưa có dữ liệu sinh viên nào.',
    };
  }

  const parsedStudents: ParsedStudentRow[] = [];

  dataRows.forEach((cols, index) => {
    const displayRowNum = isHeaderRow ? index + 2 : index + 1;
    const rawCode = codeIdx >= 0 ? (cols[codeIdx] ?? '').trim() : '';
    const rawName = nameIdx >= 0 ? (cols[nameIdx] ?? '').trim() : '';
    const rawEmail = emailIdx >= 0 ? (cols[emailIdx] ?? '').trim() : '';

    // Bỏ qua dòng hoàn toàn rỗng
    if (!rawCode && !rawName && !rawEmail) return;

    const missingFields: string[] = [];
    if (!rawCode) missingFields.push('Thiếu Mã SV');
    if (!rawName) missingFields.push('Thiếu Họ và tên');
    if (!rawEmail) {
      missingFields.push('Thiếu Email');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      missingFields.push('Email sai định dạng');
    }

    if (missingFields.length > 0) {
      warnings.push(`Dòng ${displayRowNum}: ${missingFields.join(', ')}`);
    }

    parsedStudents.push({
      rowNumber: displayRowNum,
      id: rawCode ? rawCode.toUpperCase() : '',
      name: rawName,
      email: rawEmail,
      status: 'Đang học',
      missingFields,
    });
  });

  if (parsedStudents.length === 0) {
    return {
      file,
      totalRows: 0,
      parsedStudents: [],
      warnings,
      errorMessage: 'Không tìm thấy dữ liệu sinh viên hợp lệ nào trong tệp.',
    };
  }

  return {
    file,
    totalRows: dataRows.length,
    parsedStudents,
    warnings,
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

