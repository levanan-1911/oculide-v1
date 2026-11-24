/**
 * Tiện ích xuất dữ liệu ra file Excel (.xls) theo chuẩn Microsoft XML Spreadsheet.
 * - Hỗ trợ đầy đủ định dạng: Kẻ viền (Borders), Tô màu nền Header/Zebra (Cell Fills), Font chữ in đậm.
 * - Tự động thiết lập độ rộng cột theo nội dung (Column Width).
 * - Không phụ thuộc thư viện bên ngoài (Zero npm dependencies, siêu nhẹ).
 */

export interface ExcelColumn {
  header: string;
  width?: number; // Độ rộng ký tự xấp xỉ (mặc định 120-180px)
  align?: 'left' | 'center' | 'right';
}

export interface ExportStyledExcelOptions {
  title: string;
  subtitle?: string;
  filename: string;
  sheetName?: string;
  columns: (string | ExcelColumn)[];
  data: (string | number | null | undefined)[][];
}

function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportStyledExcel({
  title,
  subtitle,
  filename,
  sheetName = 'Sheet1',
  columns,
  data,
}: ExportStyledExcelOptions) {
  // Chuẩn hóa cột
  const normalizedCols: ExcelColumn[] = columns.map((col) => {
    if (typeof col === 'string') {
      return { header: col, width: 140, align: 'left' };
    }
    return {
      header: col.header,
      width: col.width || 140,
      align: col.align || 'left',
    };
  });

  const totalCols = normalizedCols.length;
  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(
    now.getMonth() + 1
  ).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(
    2,
    '0'
  )}:${String(now.getMinutes()).padStart(2, '0')}`;

  const defaultSubtitle = subtitle || `Ngày xuất báo cáo: ${dateFormatted} | Nền tảng Oculide`;

  // Xây dựng XML Spreadsheet
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <!-- Style mặc định -->
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#1E293B"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <!-- Tiêu đề lớn -->
  <Style ss:ID="sTitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="14" ss:Color="#0F172A" ss:Bold="1"/>
  </Style>
  <!-- Tiêu đề phụ -->
  <Style ss:ID="sSubtitle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="9" ss:Color="#64748B" ss:Italic="1"/>
  </Style>
  <!-- Header bảng -->
  <Style ss:ID="sHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <!-- Hàng chẵn -->
  <Style ss:ID="sDataEvenLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sDataEvenCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sDataEvenRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <!-- Hàng lẻ (Zebra striping) -->
  <Style ss:ID="sDataOddLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sDataOddCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sDataOddRight">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table ss:DefaultRowHeight="20">
`;

  // Thêm thiết lập độ rộng các cột
  normalizedCols.forEach((col) => {
    xml += `   <Column ss:Width="${col.width || 140}"/>\n`;
  });

  // Hàng Tiêu đề chính (Merge across các cột)
  xml += `   <Row ss:Height="30">\n`;
  xml += `    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="sTitle"><Data ss:Type="String">${escapeXml(title)}</Data></Cell>\n`;
  xml += `   </Row>\n`;

  // Hàng Tiêu đề phụ (Thời gian xuất / Ghi chú)
  xml += `   <Row ss:Height="20">\n`;
  xml += `    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="sSubtitle"><Data ss:Type="String">${escapeXml(defaultSubtitle)}</Data></Cell>\n`;
  xml += `   </Row>\n`;

  // Hàng trống tạo khoảng cách
  xml += `   <Row ss:Height="10"/>\n`;

  // Hàng Header cột
  xml += `   <Row ss:Height="26">\n`;
  normalizedCols.forEach((col) => {
    xml += `    <Cell ss:StyleID="sHeader"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  // Các hàng dữ liệu (Có border và màu xen kẽ)
  data.forEach((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    xml += `   <Row ss:Height="22">\n`;
    normalizedCols.forEach((col, colIndex) => {
      const val = row[colIndex];
      const isNum = typeof val === 'number' && !isNaN(val);
      const align = col.align || 'left';
      
      let styleId = isEven
        ? align === 'center'
          ? 'sDataEvenCenter'
          : align === 'right'
          ? 'sDataEvenRight'
          : 'sDataEvenLeft'
        : align === 'center'
        ? 'sDataOddCenter'
        : align === 'right'
        ? 'sDataOddRight'
        : 'sDataOddLeft';

      const typeAttr = isNum ? 'Number' : 'String';
      const cellVal = escapeXml(val);

      xml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="${typeAttr}">${cellVal}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
  });

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  // Tải file .xls về máy
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanFilename = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
