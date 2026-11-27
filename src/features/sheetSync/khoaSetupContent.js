/** Nội dung hướng dẫn triển khai khoa mới (F-304) — dùng trong app + đồng bộ với docs/SETUP-KHOA-MOI.md */

export function khoaSetupExample(exampleLabel = 'Khoa Tiêu hóa') {
  const raw = String(exampleLabel)
    .replace(/^khoa\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const slug = raw.replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'tieuhoa';
  const deptId = `dept_${slug.replace(/-/g, '_')}`;
  return {
    label: exampleLabel,
    sheetFileName: `Lichkhoa${slug.charAt(0).toUpperCase()}${slug.slice(1)}`,
    deptIdHint: deptId,
    deptCodeHint: deptId.replace(/^dept_/, '').toUpperCase(),
  };
}

/** Gợi ý tab _meta trên Google Sheet (sau khi link khoa). */
export function suggestedSheetMeta(exampleLabel = 'Khoa Tiêu hóa') {
  const ex = khoaSetupExample(exampleLabel);
  return [
    { key: 'schemaVersion', value: '1', note: 'Giữ nguyên' },
    { key: 'updatedAt', value: '(tự động)', note: 'App cập nhật khi đồng bộ — không sửa tay' },
    { key: 'activeDeptId', value: ex.deptIdHint, note: 'Bắt buộc khớp id khoa' },
    { key: 'deptName', value: ex.label, note: 'Tên hiển thị' },
    { key: 'deptCode', value: ex.deptCodeHint, note: 'Mã viết tắt (tuỳ chọn)' },
  ];
}

export const KHOA_SETUP_PREREQ = {
  title: 'Trước khi bắt đầu',
  lines: [
    'Bệnh viện đã có một URL web (vd. lichkhoa-webapp.pages.dev) và IT đã bật bridge Sheet (Apps Script) — admin khoa không cần dán code.',
    'Mỗi khoa = một file Google Sheet riêng (Tim mạch một file, Tiêu hóa một file khác).',
  ],
};

/** @type {{ id: string, title: string, detail: string }[]} */
export const KHOA_SETUP_ADMIN_STEPS = [
  {
    id: 'sheet',
    title: 'Tạo hoặc copy Google Sheet',
    detail:
      'Trên Google Drive: tạo Spreadsheet mới (vd. tên «LichkhoaTieuhoa») hoặc copy file mẫu khoa khác rồi đổi tên. Giữ quyền sở hữu với admin khoa.',
  },
  {
    id: 'share',
    title: 'Chia sẻ với Gmail IT (bridge)',
    detail:
      'Nút Chia sẻ → thêm Gmail mà IT dùng khi deploy Apps Script → quyền Biên tập viên. Không share «bất kỳ ai có link» cho toàn bệnh viện.',
  },
  {
    id: 'login',
    title: 'Đăng nhập Google trên web',
    detail:
      'Mở URL chung của bệnh viện → Đăng nhập bằng Google (Gmail trưởng khoa / quản trị). Không dùng «Vào xem trước».',
  },
  {
    id: 'link',
    title: 'Lưu link Sheet trong app',
    detail:
      'Tài khoản → Tùy chọn → Sổ lịch Google Sheet → dán link file khoa → Lưu kết nối sổ. Chỉ cần một lần / khoa.',
  },
  {
    id: 'sync',
    title: 'Đồng bộ từ Sheet',
    detail:
      'Đợi app kéo dữ liệu (hoặc bấm Đồng bộ từ Sheet trên header). Nếu Sheet đã có tab NhanSu/Task — không bấm «Thiết lập khoa mới» (chỉ khi Sheet trống nhân sự).',
  },
  {
    id: 'meta',
    title: 'Tab _meta — đặt đúng tên khoa',
    detail:
      'Kiểm tra cột B: activeDeptId, deptName, deptCode phải đúng khoa (vd. Tiêu hóa), không để slug preview như chdmanagement…. schemaVersion=1; updatedAt để app tự cập nhật. Xem bảng gợi ý ngay dưới checklist.',
  },
  {
    id: 'nhansu',
    title: 'Tab NhanSu — quyền & đăng nhập',
    detail:
      'Trên Sheet hoặc Quản lý BS: mỗi người cần cột loginEmail = Gmail đăng nhập app; trưởng khoa đặt accessRole = admin; nhân viên member + cột access_* nếu cần.',
  },
  {
    id: 'tasks',
    title: 'Task & lịch',
    detail:
      'Chỉnh task trong Quản lý Task hoặc tab Task trên Sheet. Lịch tuần/tháng sau khi nhân sự & task đã khớp.',
  },
];

export const KHOA_SETUP_STAFF_STEPS = [
  'Mở cùng URL web với khoa (không cần link Sheet riêng).',
  'Đăng nhập Google — email phải khớp loginEmail (hoặc email nếu loginEmail trống) trên tab NhanSu.',
  'Quyền xem/sửa từng tab do admin khai báo trên NhanSu.',
];

export const KHOA_SETUP_IT_NOTE =
  'IT (một lần): bridge Apps Script + OAuth + biến Cloudflare. Chi tiết: SETUP-BRIDGE-IT-ONCE trong repo / tài liệu triển khai.';

export const KHOA_SETUP_AVOID = [
  'Không thêm biến Cloudflare mới cho từng khoa (chế độ một URL chung).',
  'Không «Thiết lập khoa» khi Sheet đã có danh sách bác sĩ (tránh ghi đè).',
  'Không dán Apps Script vào từng file Sheet — dùng bridge chung.',
];