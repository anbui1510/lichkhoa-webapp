import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { taskLabelStyle } from '../logic/cellFormat';
import { orderCellText, leadingTask } from '../logic/cellOrder';
import {
  buildMonthTable,
  formatMonthLabel,
  resolveMonthRoles,
  sessionLabel,
  customCellKey
} from '../logic/monthSchedule';
import { roleShortLabel } from '../logic/taskMatch';
import { buildSessionAlertRow } from '../logic/warningResolve';
import { pdfAutoTableFontStyles, pinPdfCellFont, registerPdfUnicodeFont } from './pdfFonts';

const FIXED_COLS = 3;

function safeFileName(value) {
  return String(value || 'lich-khoa')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function hexRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
  if (h.length !== 6) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
}

function weekDescribe(staffList, days, sessions, noteCol, row, col) {
  const staff = staffList[row];
  if (!staff || col < 0) return null;
  if (col === 0) return { key: `w|${staff.shortName}|label` };
  if (col === 1) return { key: `w|${staff.shortName}|bu` };
  if (col === 2) return { key: `w|${staff.shortName}|phep` };
  if (col === noteCol) return { key: `w|${staff.shortName}|note` };
  const offset = col - FIXED_COLS;
  const day = days[Math.floor(offset / sessions.length)];
  if (!day) return null;
  const session = sessions[offset % sessions.length];
  return { key: `w|${staff.shortName}|${day.fullDateStr}|${session}` };
}

function monthCellStyle(meta, columns, taskList, styles, row, col) {
  const info = meta[row];
  const column = columns[col];
  if (!info || !column) return { style: null, defaults: {} };
  if (column.kind === 'task' && info.type === 'role') {
    const task = (taskList || []).find(t => t.id === info.role.taskId) || null;
    const defaults = {};
    if (task) {
      defaults.bg = task.bgColor;
      defaults.color = task.textColor;
      defaults.bold = true;
    }
    return { style: taskLabelStyle(styles, info.role.key), defaults };
  }
  if (column.kind === 'custom') {
    const slot = info.type === 'role' ? info.role.key : 'head';
    const key = `m|${customCellKey(column.id, info.weekStart, slot)}`;
    return { key, style: styles?.[key] || null, defaults: {} };
  }
  if (column.kind !== 'day' || info.type !== 'role') return { style: null, defaults: {} };
  const day = info.days[column.dayIndex];
  if (!day) return { style: null, defaults: {} };
  const key = `m|${day.iso}|${info.role.key}|${column.session}`;
  return { key, style: styles?.[key] || null, defaults: {} };
}

function applyPdfCellStyle(data, style, defaults = {}) {
  const bg = style?.bg || defaults.bg;
  const color = style?.color || defaults.color;
  if (bg) {
    const rgb = hexRgb(bg);
    if (rgb) data.cell.styles.fillColor = rgb;
  }
  if (color) {
    const rgb = hexRgb(color);
    if (rgb) data.cell.styles.textColor = rgb;
  }
  if (style?.bold || defaults.bold) {
    data.cell.styles.textColor = data.cell.styles.textColor || [17, 24, 39];
  }
}

export async function exportWeekScheduleToPdf({
  deptName,
  sheetLabel,
  staffList,
  days,
  sessions,
  grid,
  taskList,
  roomNames,
  alertRows,
  cellStyles,
  roomTable,
  freezeCols = 0
}) {
  const noteCol = FIXED_COLS + 7 * sessions.length;
  const weekWidth = noteCol + 1;

  const rowData = staffList.map((s) => {
    const sData = grid[s.shortName] || {};
    const row = [
      String(s.shortName || s.name || ''),
      s.buBalance ?? '',
      s.phepBalance ?? ''
    ];
    for (let d = 0; d < 7; d += 1) {
      sessions.forEach((id) => row.push(orderCellText(sData[d]?.[id] || '', taskList, roomNames)));
    }
    row.push(sData.note || '');
    return row;
  });
  const alertData = (alertRows || []).length
    ? [buildSessionAlertRow(alertRows, { days, sessions, weekWidth, noteCol })]
    : [];

  const headTop = [
    { content: '#', rowSpan: 2 },
    { content: 'BÁC SĨ', rowSpan: 2 },
    { content: 'BÙ', rowSpan: 2 },
    { content: 'PHÉP', rowSpan: 2 },
    ...days.map((day) => ({
      content: `${day.dayName} (${day.dateStr})`,
      colSpan: sessions.length
    })),
    { content: 'Ghi chú', rowSpan: 2 }
  ];
  const headSub = days.flatMap(() => sessions.map((id) => sessionLabel(id)));

  const body = [
    ...rowData.map((row, index) => [String(index + 1), ...row]),
    ...alertData.map((row) => ['', ...row])
  ];

  const doc = new jsPDF({
    orientation: weekWidth + 1 > 9 ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pdfFont = await registerPdfUnicodeFont(doc);
  const tableFont = pdfAutoTableFontStyles(pdfFont);

  doc.setFontSize(11);
  doc.setFont(pdfFont, 'normal');
  doc.setTextColor(32, 33, 36);
  doc.text(deptName || 'Lịch khoa', 40, 32);
  doc.setFontSize(9);
  doc.setTextColor(95, 99, 104);
  const from = days[0]?.dateStr;
  const to = days[6]?.dateStr;
  doc.text(`${sheetLabel || 'Lịch tuần'}${from && to ? ` · ${from} – ${to}` : ''}`, 40, 46);

  autoTable(doc, {
    startY: 56,
    head: [headTop, headSub],
    body,
    ...tableFont,
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 42 },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 }
    },
    didParseCell(data) {
      pinPdfCellFont(data, pdfFont);
      if (data.section === 'head') return;
      if (data.section !== 'body') return;
      const bodyRow = data.row.index;
      const isAlert = bodyRow >= staffList.length;
      const dataCol = data.column.index - 1;
      if (data.column.index === 0) return;
      if (isAlert) {
        const value = alertData[0]?.[dataCol] || '';
        if (String(value).trim()) {
          data.cell.styles.fillColor = [255, 244, 229];
          data.cell.styles.textColor = [154, 52, 18];
          data.cell.styles.halign = 'left';
          data.cell.styles.valign = 'top';
        }
        return;
      }
      const desc = weekDescribe(staffList, days, sessions, noteCol, bodyRow, dataCol);
      const style = desc ? cellStyles?.[desc.key] : null;
      const defaults = {};
      if (dataCol >= FIXED_COLS && dataCol < noteCol) {
        const value = rowData[bodyRow]?.[dataCol];
        const task = leadingTask(String(value || ''), taskList, roomNames);
        if (task) {
          defaults.bg = task.bgColor;
          defaults.color = task.textColor;
          defaults.bold = true;
        }
      }
      applyPdfCellStyle(data, style, defaults);
      if (dataCol === noteCol) data.cell.styles.halign = 'left';
      pinPdfCellFont(data, pdfFont);
    }
  });

  let y = doc.lastAutoTable.finalY + 16;
  if (roomTable?.labels?.length) {
    doc.setFontSize(10);
    doc.setFont(pdfFont, 'normal');
    doc.setTextColor(154, 52, 18);
    doc.text('Phân công bệnh phòng', 40, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [roomTable.labels],
      body: roomTable.matrix || [],
      ...pdfAutoTableFontStyles(pdfFont),
      didParseCell(data) {
        pinPdfCellFont(data, pdfFont);
      }
    });
  }

  const file = safeFileName(`${deptName || 'Khoa'} - ${sheetLabel || 'Lich tuan'} ${from || ''}-${to || ''}.pdf`);
  doc.save(file);
}

export async function exportMonthScheduleToPdf({
  deptName,
  monthKey,
  monthGrid,
  monthRoles,
  columnOrder,
  columnTitles,
  daySessions,
  cellStyles,
  taskList
}) {
  const roles = resolveMonthRoles(monthRoles);
  const model = buildMonthTable(monthKey, monthGrid || {}, roles, columnOrder, columnTitles, daySessions);
  const columns = model.columns;
  const taskCol = columns.findIndex(column => column.kind === 'task');
  const rowData = model.rows.map((row, index) => {
    const info = model.meta[index];
    if (info?.type !== 'role' || taskCol < 0) return row;
    const short = roleShortLabel(info.role, taskList || []);
    if (short === row[taskCol]) return row;
    const next = row.slice();
    next[taskCol] = short;
    return next;
  });

  const headTop = [{ content: '#', rowSpan: 2 }];
  const headSub = [];
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (column.kind === 'day') {
      let span = 1;
      while (
        columns[index + span]?.kind === 'day'
        && columns[index + span].dayIndex === column.dayIndex
      ) span += 1;
      headTop.push({ content: column.title || '', colSpan: span });
      for (let offset = 0; offset < span; offset += 1) {
        headSub.push(sessionLabel(columns[index + offset].session));
      }
      index += span - 1;
    } else if (column.kind === 'custom') {
      headTop.push({ content: column.title || 'Cột mới', rowSpan: 2 });
    } else if (column.kind === 'task') {
      headTop.push({ content: 'Nhiệm vụ', rowSpan: 2 });
    } else {
      headTop.push({ content: '', rowSpan: 2 });
    }
  }

  const body = rowData.map((row, index) => [String(index + 1), ...row]);

  const doc = new jsPDF({
    orientation: columns.length > 8 ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pdfFont = await registerPdfUnicodeFont(doc);
  const tableFont = pdfAutoTableFontStyles(pdfFont);

  doc.setFontSize(11);
  doc.setFont(pdfFont, 'normal');
  doc.setTextColor(32, 33, 36);
  doc.text(deptName || 'Lịch khoa', 40, 32);
  doc.setFontSize(9);
  doc.setTextColor(95, 99, 104);
  doc.text(`Lịch tháng · ${formatMonthLabel(monthKey)}`, 40, 46);

  autoTable(doc, {
    startY: 56,
    head: [headTop, headSub],
    body,
    ...tableFont,
    columnStyles: { 0: { cellWidth: 18 } },
    didParseCell(data) {
      pinPdfCellFont(data, pdfFont);
      if (data.section !== 'body') return;
      const rowIndex = data.row.index;
      const colIndex = data.column.index - 1;
      if (colIndex < 0) return;
      const { style, defaults } = monthCellStyle(model.meta, columns, taskList, cellStyles, rowIndex, colIndex);
      applyPdfCellStyle(data, style, defaults);
      pinPdfCellFont(data, pdfFont);
    }
  });

  const file = safeFileName(`${deptName || 'Khoa'} - Lich thang ${formatMonthLabel(monthKey).replace(/\//g, '-')}.pdf`);
  doc.save(file);
}
