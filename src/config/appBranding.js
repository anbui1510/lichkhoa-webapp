/** Branding chung bệnh viện — trước đăng nhập / sau đăng xuất (F-305). */

export const HOSPITAL_BRAND = {
  title: 'Lịch làm việc bệnh viện',
  subtitle: 'Webapp xếp lịch đa khoa phòng',
  gateHint: 'Hệ thống xếp lịch đa khoa phòng',
};

const PLACEHOLDER_DEPT_NAMES = new Set([
  'lịch khoa',
  'lịch làm việc bệnh viện',
  'chưa đặt tên khoa',
  'khoa',
]);

export function gateBranding() {
  return {
    title: HOSPITAL_BRAND.title,
    subtitle: HOSPITAL_BRAND.gateHint,
  };
}

/**
 * Sau đăng nhập: tên khoa từ Sheet/store (admin đã cài trong Tùy chọn).
 * @param {{ name?: string, code?: string } | null | undefined} activeDept
 * @param {{ deptLabel?: string, deptId?: string } | null | undefined} linkedStaff
 */
export function sessionDeptDisplayName(activeDept, linkedStaff) {
  const candidates = [
    linkedStaff?.deptLabel,
    activeDept?.name,
  ];
  for (const raw of candidates) {
    const n = String(raw || '').trim();
    if (!n) continue;
    if (PLACEHOLDER_DEPT_NAMES.has(n.toLowerCase())) continue;
    return n;
  }
  return HOSPITAL_BRAND.title;
}