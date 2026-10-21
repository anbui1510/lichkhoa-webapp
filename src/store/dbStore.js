// ==========================================================================
// DATABASE & LOCAL STORAGE PERSISTENCE ENGINE (INSTANT & OFFLINE READY)
// ==========================================================================

import { derivePositionFromTitle } from './constants';

const LOCAL_STORAGE_KEY = 'LICHKHOA_DATA_STORE_V1';

// Sample Default Templates for Departments
export const DEPARTMENT_TEMPLATES = {
  TIM_MACH: {
    id: 'dept_tim_mach',
    name: 'Khoa Tim Mạch',
    code: 'TIM_MACH',
    staff: [
      { id: 'doc_1', name: 'Phan Tiến Lợi', shortName: 'LỢI', title: 'Trưởng Khoa', dutyQuota: 2, buBalance: 0.5, phepBalance: 11.0, email: 'loi.pt@hospital.vn' },
      { id: 'doc_2', name: 'Trần Công Bảo Phụng', shortName: 'PHỤNG', title: 'Phó Khoa', dutyQuota: 4, buBalance: 14.0, phepBalance: 14.0, email: 'phung.tcb@hospital.vn' },
      { id: 'doc_3', name: 'Bùi Đạt Thịnh', shortName: 'THỊNH', title: 'BS CK1', dutyQuota: 6, buBalance: 1.5, phepBalance: 11.5, email: 'thinh.bd@hospital.vn' },
      { id: 'doc_4', name: 'Phạm Đức Nghị', shortName: 'NGHỊ', title: 'BS CK1', dutyQuota: 6, buBalance: 1.0, phepBalance: 12.0, email: 'nghi.pd@hospital.vn' },
      { id: 'doc_5', name: 'Đỗ Hữu Tài', shortName: 'TÀI', title: 'BS CK1', dutyQuota: 6, buBalance: 1.5, phepBalance: 4.0, email: 'tai.dh@hospital.vn' },
      { id: 'doc_6', name: 'Lương Hoài Ân', shortName: 'ÂN', title: 'BS Trẻ', dutyQuota: 7, buBalance: 2.0, phepBalance: 5.0, email: 'an.lh@hospital.vn' },
      { id: 'doc_7', name: 'Nguyễn Văn Hiếu', shortName: 'HIẾU', title: 'BS Trẻ', dutyQuota: 7, buBalance: 1.5, phepBalance: 3.5, email: 'hieu.nv@hospital.vn' },
      { id: 'doc_8', name: 'Hồ Thị Trang', shortName: 'TRANG', title: 'BS Trẻ', dutyQuota: 7, buBalance: 1.0, phepBalance: 8.0, email: 'trang.ht@hospital.vn' },
      { id: 'doc_9', name: 'Lê Thị Thảo', shortName: 'THẢO', title: 'BS Trẻ', dutyQuota: 7, buBalance: 0.0, phepBalance: 0.0, email: 'thao.lt@hospital.vn' },
      { id: 'doc_10', name: 'Nguyễn Văn Huy', shortName: 'HUY', title: 'BS CK1', dutyQuota: 6, buBalance: 0.0, phepBalance: 0.0, email: 'huy.nv@hospital.vn' },
      { id: 'hv_1', name: 'Học viên 1', shortName: 'HV_A', title: 'Học Viên', dutyQuota: 9, buBalance: 0, phepBalance: 0, email: 'hv1@hospital.vn' },
      { id: 'hv_2', name: 'Học viên 2', shortName: 'HV_B', title: 'Học Viên', dutyQuota: 9, buBalance: 0, phepBalance: 0, email: 'hv2@hospital.vn' }
    ],
    tasks: [
      // 1. Thường trực
      { id: 'task_tn', code: 'TN', name: 'Trực Ngày', category: 'THUONG_TRUC', session: 'SANG', triggerRT: false, delta: 0, blocker: true, bgColor: '#fff2cc', textColor: '#cc0000', dutyRole: 'truc_ngay' },
      { id: 'task_vg', code: 'VG', name: 'Vào Gác (Trực Đêm)', category: 'THUONG_TRUC', session: 'DEM', triggerRT: true, delta: 0, blocker: true, bgColor: '#ffe599', textColor: '#cc0000', dutyRole: 'vao_gac' },
      { id: 'task_c1', code: 'C1', name: 'Trực Cột 1 BV', category: 'THUONG_TRUC', session: 'SANG_DEM', triggerRT: false, delta: 0, blocker: true, bgColor: '#fce5cd', textColor: '#b45f06', encodeDuty: true },
      { id: 'task_rt', code: 'RT', name: 'Ra Trực (Nghỉ bắt buộc)', category: 'THUONG_TRUC', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#e6ecef', textColor: '#555555', dutyRole: 'ra_truc' },
      { id: 'task_ro_shift', code: 'RO', name: 'Nghỉ bù sau trực', category: 'THUONG_TRUC', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#fff2cc', textColor: '#7f6000' },
      
      // 2. Phòng khám
      { id: 'task_sapk', code: 'SAPK', name: 'Siêu âm Phòng Khám', category: 'PHONG_KHAM', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#d9d9d9', textColor: '#000000' },
      { id: 'task_pktc', code: 'PKTC', name: 'PK Tim Cấu Trúc', category: 'PHONG_KHAM', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#d9d9d9', textColor: '#000000' },
      { id: 'task_sn', code: 'SN', name: 'PK Siêu Nhân', category: 'PHONG_KHAM', session: 'SANG', triggerRT: false, delta: 0, blocker: true, bgColor: '#d9ead3', textColor: '#274e13' },
      
      // 3. Thủ thuật
      { id: 'task_tt', code: 'TT', name: 'Thông tim Can thiệp', category: 'THU_THUAT', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#f4ccd8', textColor: '#990000' },
      
      // 4. Chuyên môn đặc thù
      { id: 'task_hsss', code: 'hsss', name: 'HC Hồi sức sơ sinh', category: 'CHUYEN_MON', session: 'SANG', triggerRT: false, delta: 0, blocker: true, bgColor: '#d0e0e3', textColor: '#1c4587' },
      { id: 'task_sahc', code: 'sahc', name: 'SA Hội chẩn Cột 1', category: 'CHUYEN_MON', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#c9daf8', textColor: '#1c4587' },
      { id: 'task_round', code: 'round', name: 'Visit Buồng Bệnh', category: 'CHUYEN_MON', session: 'SANG', triggerRT: false, delta: 0, blocker: true, bgColor: '#d9ead3', textColor: '#274e13' },
      { id: 'task_staff', code: 'staff', name: 'Hội chẩn Staff T5', category: 'CHUYEN_MON', session: 'CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#ead1dc', textColor: '#4c1130' },
      { id: 'task_tkstaff', code: 'Tk staff', name: 'Thư ký Staff T5', category: 'CHUYEN_MON', session: 'CHIEU', triggerRT: false, delta: 0.5, blocker: false, bgColor: '#ead1dc', textColor: '#4c1130' },
      { id: 'task_mri', code: 'MRI', name: 'Chụp MRI Tim', category: 'CHUYEN_MON', session: 'CHIEU', triggerRT: false, delta: 0, blocker: false, bgColor: '#c9daf8', textColor: '#0b5394' },
      { id: 'task_hv', code: 'HV', name: 'Khám Tim thai HV', category: 'CHUYEN_MON', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#efefef', textColor: '#000000' },
      
      // 5. Giảng dạy
      { id: 'task_day12', code: 'Dạy 12th', name: 'Dạy Lớp 12 Tháng', category: 'GIANG_DAY', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#fff2cc', textColor: '#7f6000' },
      { id: 'task_daysv', code: 'Dạy sv', name: 'Dạy Sinh Viên HT', category: 'GIANG_DAY', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#fff2cc', textColor: '#7f6000' },
      { id: 'task_daytmcb', code: 'Dạy TMCB', name: 'Dạy CME Tim mạch', category: 'GIANG_DAY', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#fff2cc', textColor: '#7f6000' },

      // 6. Nghỉ / Công tác
      { id: 'task_phep', code: 'P', name: 'Nghỉ Phép Năm', category: 'NGHI_VANG', session: 'SANG_CHIEU', triggerRT: false, delta: -0.5, blocker: true, bgColor: '#f44336', textColor: '#ffffff' },
      { id: 'task_bu', code: 'BÙ', name: 'Nghỉ Bù', category: 'NGHI_VANG', session: 'SANG_CHIEU', triggerRT: false, delta: -0.5, blocker: true, bgColor: '#ff9800', textColor: '#ffffff' },
      { id: 'task_ct', code: 'CT', name: 'Đi Công Tác', category: 'NGHI_VANG', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#9c27b0', textColor: '#ffffff' },
      { id: 'task_hoc', code: 'H', name: 'Đi Học Bên Ngoài', category: 'NGHI_VANG', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#2196f3', textColor: '#ffffff' },
      { id: 'task_benh_phong', code: 'Bệnh phòng', name: 'Bệnh phòng', category: 'PHONG_KHAM', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: false, bgColor: '#d9ead3', textColor: '#274e13', description: 'Gắn theo bảng Phân công bệnh phòng. Task khác khóa task này thì ô đó không nhận bệnh phòng.' }
    ],
    rules: {
      maxLeavesPerDay: 2,
      enableAutoRT: true,
      enableBalancingTeaching: true,
      enableCrossMonthSundayRT: true
    }
  },
  TIEU_HOA: {
    id: 'dept_tieu_hoa',
    name: 'Khoa Tiêu Hóa',
    code: 'TIEU_HOA',
    staff: [
      { id: 'th_1', name: 'Nguyễn Văn Minh', shortName: 'MINH', title: 'Trưởng Khoa', dutyQuota: 2, buBalance: 1.0, phepBalance: 10.0, email: 'minh.nv@hospital.vn' },
      { id: 'th_2', name: 'Lê Thị Hà', shortName: 'HÀ', title: 'Phó Khoa', dutyQuota: 4, buBalance: 5.0, phepBalance: 12.0, email: 'ha.lt@hospital.vn' }
    ],
    tasks: [
      { id: 'th_tn', code: 'TN', name: 'Trực Ngày', category: 'THUONG_TRUC', session: 'SANG', triggerRT: false, delta: 0, blocker: true, bgColor: '#fff2cc', textColor: '#cc0000', dutyRole: 'truc_ngay' },
      { id: 'th_vg', code: 'VG', name: 'Trực Đêm', category: 'THUONG_TRUC', session: 'DEM', triggerRT: true, delta: 0, blocker: true, bgColor: '#ffe599', textColor: '#cc0000', dutyRole: 'vao_gac' },
      { id: 'th_rt', code: 'RT', name: 'Ra trực', category: 'THUONG_TRUC', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#e6ecef', textColor: '#555555', dutyRole: 'ra_truc' },
      { id: 'th_ns', code: 'NS', name: 'Nội Soi Tiêu Hóa', category: 'THU_THUAT', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: true, bgColor: '#d0e0e3', textColor: '#1c4587' },
      { id: 'th_phep', code: 'P', name: 'Nghỉ Phép Năm', category: 'NGHI_VANG', session: 'SANG_CHIEU', triggerRT: false, delta: -0.5, blocker: true, bgColor: '#f44336', textColor: '#ffffff' },
      { id: 'th_bu', code: 'BÙ', name: 'Nghỉ Bù', category: 'NGHI_VANG', session: 'SANG_CHIEU', triggerRT: false, delta: -0.5, blocker: true, bgColor: '#ff9800', textColor: '#ffffff' },
      { id: 'task_benh_phong', code: 'Bệnh phòng', name: 'Bệnh phòng', category: 'PHONG_KHAM', session: 'SANG_CHIEU', triggerRT: false, delta: 0, blocker: false, bgColor: '#d9ead3', textColor: '#274e13', description: '' }
    ],
    rules: {
      maxLeavesPerDay: 2,
      enableAutoRT: true,
      enableBalancingTeaching: true
    }
  }
};

function withWardTask(tasks) {
  const has = (tasks || []).some(task => `${task.code || ''} ${task.name || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .includes('benh phong'));
  if (has) return tasks;
  return [...(tasks || []), {
    id: 'task_benh_phong',
    code: 'Bệnh phòng',
    name: 'Bệnh phòng',
    category: 'PHONG_KHAM',
    session: 'SANG_CHIEU',
    triggerRT: false,
    delta: 0,
    blocker: false,
    bgColor: '#d9ead3',
    textColor: '#274e13',
    description: 'Gắn theo bảng Phân công bệnh phòng. Task khác khóa task này thì ô đó không nhận bệnh phòng.'
  }];
}

function foldDuty(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function withDutyFields(tasks) {
  const list = (tasks || []).map(task => ({ ...task }));
  const taken = new Set(list.map(task => task.dutyRole).filter(Boolean));
  const claim = (role, match) => {
    if (taken.has(role)) return;
    const task = list.find(item => item.dutyRole === undefined && match(item));
    if (!task) return;
    task.dutyRole = role;
    taken.add(role);
  };
  claim('vao_gac', task => foldDuty(task.code) === 'vg');
  claim('ra_truc', task => foldDuty(task.code) === 'rt');
  claim('truc_ngay', task => foldDuty(task.code) === 'tn');
  list.forEach((task) => {
    if (task.dutyRole === undefined) task.dutyRole = '';
    if (task.encodeDuty !== undefined) return;
    const code = foldDuty(task.code);
    task.encodeDuty = code === 'tc' || code === 'tk1' || code === 'c1';
  });
  return list;
}

// Bổ sung các trường mới cho dữ liệu cũ (Vị trí, Nhóm nghiệp vụ tự tạo, Mô tả nghiệp vụ, Sheets)
function normalizeStore(store) {
  return {
    ...store,
    sheetsByDept: store.sheetsByDept || {},
    departments: (store.departments || []).map(dept => ({
      ...dept,
      customCategories: dept.customCategories || [],
      staff: (dept.staff || []).map(s => ({
        ...s,
        position: s.position || derivePositionFromTitle(s.title)
      })),
      tasks: withDutyFields(withWardTask((dept.tasks || []).map(t => ({
        ...t,
        description: t.description || ''
      }))))
    }))
  };
}

// Initial Store Setup
export function getInitialStore() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return normalizeStore(JSON.parse(saved));
    } catch (e) {
      console.error('Error parsing local storage:', e);
    }
  }

  const initial = normalizeStore({
    departments: [
      DEPARTMENT_TEMPLATES.TIM_MACH,
      DEPARTMENT_TEMPLATES.TIEU_HOA
    ],
    activeDeptId: 'dept_tim_mach',
    weeklySchedules: {},
    monthlySchedules: {}
  });
  saveStore(initial);
  return initial;
}

export function saveStore(store) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save store to LocalStorage:', e);
  }
}
