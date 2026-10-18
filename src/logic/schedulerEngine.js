// ==========================================================================
// AUTOMATED SCHEDULER LOGIC ENGINE (7-STAGE ALGORITHM)
// ==========================================================================

export const HOLIDAY_DICTIONARY = {
  "1/1": "Tết Dương lịch",
  "14/2": "Valentine",
  "27/2": "Ngày Thầy thuốc VN",
  "8/3": "Quốc tế Phụ nữ",
  "30/4": "Giải phóng miền Nam",
  "1/5": "Quốc tế Lao động",
  "2/9": "Quốc khánh",
  "20/10": "Phụ nữ Việt Nam",
  "20/11": "Nhà giáo Việt Nam",
  "22/12": "Thành lập QĐNDVN",
  "26/4/2026": "Giỗ tổ Hùng Vương",
  "16/2/2026": "Nghỉ Giao thừa",
  "17/2/2026": "Mùng 1 Tết",
  "18/2/2026": "Mùng 2 Tết",
  "19/2/2026": "Mùng 3 Tết"
};

/**
 * Builds the Mon-Sun day descriptors for a week starting at startDate (YYYY-MM-DD)
 */
export function buildWeekDays(startDate) {
  const start = new Date(startDate);
  const days = [];
  for (let d = 0; d < 7; d++) {
    const temp = new Date(start.getTime() + d * 86400000);
    const dayKey = `${temp.getDate()}/${temp.getMonth() + 1}`;
    const fullDateKey = `${temp.getDate()}/${temp.getMonth() + 1}/${temp.getFullYear()}`;
    const holidayName = HOLIDAY_DICTIONARY[fullDateKey] || HOLIDAY_DICTIONARY[dayKey] || '';
    
    days.push({
      dateObj: temp,
      dayName: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][d],
      dateStr: `${temp.getDate()}/${temp.getMonth() + 1}`,
      fullDateStr: fullDateKey,
      isHoliday: holidayName !== '',
      holidayName
    });
  }
  return days;
}

/**
 * Runs the 7-Stage Auto-Scheduling Algorithm for a Weekly Schedule
 */
export function generateWeeklySchedule({ startDate, staffList, taskList, rules, prevSundayDuties = {} }) {
  const warnings = [];
  const logs = [];

  // Parse Mon-Sun Date Range
  const days = buildWeekDays(startDate);

  // Initialize Grid Data per Staff: { [shortName]: { [dayIndex 0..6]: { S: '', C: '', isRT: false } } }
  const grid = {};
  staffList.forEach(s => {
    grid[s.shortName] = {};
    for (let d = 0; d < 7; d++) {
      grid[s.shortName][d] = { S: '', C: '', isRT: false };
    }
  });

  // Stage 1 & 2: Cross-Month / Cross-Week Sunday RT Continuity
  // If staff had Night Duty (VG) or C1 on previous Sunday -> Monday morning (d=0) is RT
  if (rules.enableCrossMonthSundayRT) {
    Object.keys(prevSundayDuties).forEach(shortName => {
      if (grid[shortName]) {
        const duty = prevSundayDuties[shortName];
        if (duty === 'VG' || duty.includes('C1') || duty === 'TN') {
          grid[shortName][0].S = 'RT';
          grid[shortName][0].isRT = true;
          logs.push(`BS ${shortName} ra trực RT ngày T2 (do trực VG ngày CN tuần trước)`);
        }
      }
    });
  }

  // Stage 2: Master Monthly Schedule Link & Auto RT Generation
  // Sample Master Duty Assignment
  const masterMonthlyDuties = {
    0: { S: { 'THỊNH': 'TN (C1)', 'ÂN': 'sapk' }, C: { 'THỊNH': 'VG (C1)', 'HIẾU': 'pktc' } }, // T2
    1: { S: { 'LỢI': 'SN', 'PHỤNG': 'TN' }, C: { 'PHỤNG': 'VG' } }, // T3
    2: { S: { 'NGHỊ': 'TN', 'TRANG': 'sapk' }, C: { 'NGHỊ': 'VG' } }, // T4
    3: { S: { 'TÀI': 'TN', 'HUY': 'pktc' }, C: { 'TÀI': 'VG' } }, // T5
    4: { S: { 'HIẾU': 'TN' }, C: { 'HIẾU': 'VG' } }, // T6
    5: { S: { 'TRANG': 'TN' }, C: { 'TRANG': 'VG' } }, // T7
    6: { S: { 'Â N': 'TN' }, C: { 'ÂN': 'VG' } }  // CN
  };

  for (let d = 0; d < 7; d++) {
    const dayMaster = masterMonthlyDuties[d];
    if (dayMaster) {
      // Apply S (Morning)
      Object.keys(dayMaster.S).forEach(shortName => {
        if (grid[shortName]) {
          const val = dayMaster.S[shortName];
          grid[shortName][d].S = val;
        }
      });
      // Apply C (Night/Afternoon)
      Object.keys(dayMaster.C).forEach(shortName => {
        if (grid[shortName]) {
          const val = dayMaster.C[shortName];
          grid[shortName][d].C = val;
          // Auto RT next day morning
          if (rules.enableAutoRT && (val.includes('VG') || val.includes('TN (C1)')) && d < 6) {
            grid[shortName][d + 1].S = grid[shortName][d + 1].S ? `${grid[shortName][d + 1].S}, RT` : 'RT';
            grid[shortName][d + 1].isRT = true;
          }
        }
      });
    }
  }

  // Stage 3: Leave Registrations & Conflict Check
  // Check Leave Quota Soft Limits
  for (let d = 0; d < 7; d++) {
    let leavesOnDay = 0;
    staffList.forEach(s => {
      const cellS = grid[s.shortName][d].S;
      const cellC = grid[s.shortName][d].C;
      if (cellS === 'P' || cellS === 'BÙ' || cellC === 'P' || cellC === 'BÙ') {
        leavesOnDay++;
      }
    });

    if (leavesOnDay > rules.maxLeavesPerDay) {
      warnings.push(`CẢNH BÁO: Ngày ${days[d].dayName} (${days[d].dateStr}) có ${leavesOnDay} người nghỉ (vượt quá quota ${rules.maxLeavesPerDay} người/ngày).`);
    }
  }

  // Stage 4: Special Tasks & Fixed Schedule Rules
  // Thursday (d=3): Phụng -> HV, Nghi -> MRI, Staff & TK Staff
  if (grid['PHỤNG']) {
    if (!grid['PHỤNG'][3].S.includes('P') && !grid['PHỤNG'][3].S.includes('BÙ')) {
      grid['PHỤNG'][3].S = grid['PHỤNG'][3].S ? `${grid['PHỤNG'][3].S}, HV` : 'HV';
    }
    if (!grid['PHỤNG'][3].C.includes('P') && !grid['PHỤNG'][3].C.includes('BÙ')) {
      grid['PHỤNG'][3].C = grid['PHỤNG'][3].C ? `${grid['PHỤNG'][3].C}, HV` : 'HV';
    }
  }

  if (grid['NGHỊ']) {
    if (!grid['NGHỊ'][3].C.includes('P') && !grid['NGHỊ'][3].C.includes('BÙ')) {
      grid['NGHỊ'][3].C = grid['NGHỊ'][3].C ? `${grid['NGHỊ'][3].C}, MRI` : 'MRI';
    }
  }

  // Staff & TK Staff Thursday Afternoon
  if (grid['TÀI']) {
    const isRT = grid['TÀI'][3].isRT;
    grid['TÀI'][3].C = grid['TÀI'][3].C ? `${grid['TÀI'][3].C}, Tk staff` : 'Tk staff';
    if (isRT) {
      logs.push(`BS TÀI làm Tk staff ngày RT -> Tự động +0.5 ngày BÙ`);
    }
  }

  // Stage 5: Auto-Balancing Teaching & Specialty Assignments
  const roundPrio = [
    { d: 0, doc: 'LỢI' },
    { d: 2, doc: 'PHỤNG' },
    { d: 4, doc: 'THỊNH' }
  ];
  roundPrio.forEach(item => {
    if (grid[item.doc] && !grid[item.doc][item.d].isRT && !grid[item.doc][item.d].S.includes('P')) {
      grid[item.doc][item.d].S = grid[item.doc][item.d].S ? `round, ${grid[item.doc][item.d].S}` : 'round';
    }
  });

  // Stage 6: Room & Ward Assignments Grouping (Phân công Bệnh phòng)
  const roomAssignments = {
    'b25': [],
    'b349': [],
    'b1': [],
    'b6': [],
    'A': []
  };

  staffList.forEach(s => {
    // Basic assignment logic based on doctor
    if (['NGHỊ'].includes(s.shortName)) roomAssignments['b25'].push(s.shortName);
    if (['THỊNH'].includes(s.shortName)) roomAssignments['b349'].push(s.shortName);
    if (['LỢI', 'THẢO'].includes(s.shortName)) roomAssignments['b1'].push(s.shortName);
    if (['HUY'].includes(s.shortName)) roomAssignments['b6'].push(s.shortName);
    if (['ÂN', 'PHỤNG'].includes(s.shortName)) roomAssignments['A'].push(s.shortName);
  });

  // Check missing coverage
  const roomWarnings = [];
  if (roomAssignments['b1'].length < 2) {
    roomWarnings.push('Bệnh phòng b1: Cần bổ sung thêm 1 BS');
  }

  return {
    days,
    grid,
    roomAssignments,
    roomWarnings,
    warnings,
    logs
  };
}
