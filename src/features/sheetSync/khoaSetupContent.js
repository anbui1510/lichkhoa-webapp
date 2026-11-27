/** Nội dung hướng dẫn triển khai khoa mới (F-304) — dùng trong app + đồng bộ với docs/SETUP-KHOA-MOI.md */

export function khoaSetupExample(exampleLabel = 'Khoa Tiêu hóa') {
  const slug = String(exampleLabel)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24) || 'tieuhoa';
  return {
    label: exampleLabel,
    sheetFileName: `Lichkhoa${slug.charAt(0).toUpperCase()}${slug.slice(1)}`,
    deptIdHint: `dept_${slug.replace(/-/g, '_')}`,
  };
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