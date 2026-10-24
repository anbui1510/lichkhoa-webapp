export const ACCESS_TABS = [
  { id: 'week', label: 'Lịch tuần' },
  { id: 'month', label: 'Lịch tháng' },
  { id: 'leave', label: 'Lịch nghỉ' },
  { id: 'study', label: 'Lịch học' },
  { id: 'calendar', label: 'Lịch Google' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'staff', label: 'Quản lý bác sĩ' },
  { id: 'tasks', label: 'Quản lý task' }
];

export const ACCESS_LEVELS = [
  { id: 'none', label: 'Ẩn' },
  { id: 'view', label: 'Xem' },
  { id: 'edit', label: 'Sửa' }
];

export const MEMBER_DEFAULT = {
  week: 'edit',
  month: 'view',
  leave: 'edit',
  study: 'view',
  calendar: 'view',
  dashboard: 'none',
  staff: 'none',
  tasks: 'none'
};

const FULL = Object.fromEntries(ACCESS_TABS.map(tab => [tab.id, 'edit']));

export function normalizeAccess(raw) {
  const next = { ...MEMBER_DEFAULT };
  if (!raw || typeof raw !== 'object') return next;
  ACCESS_TABS.forEach((tab) => {
    const level = raw[tab.id];
    if (level === 'none' || level === 'view' || level === 'edit') next[tab.id] = level;
  });
  return next;
}

export function accountEmail(user) {
  return String(user?.email || '').trim().toLowerCase();
}

export function needsStaffLink(user) {
  if (!user || user.id === 'local') return false;
  const email = accountEmail(user);
  const username = String(user.username || '').trim().toLowerCase();
  if (!email || username === 'local_user' || username === 'admin') return false;
  return true;
}

export function findLinkedStaff(user, staffList) {
  const email = accountEmail(user);
  if (!email) return null;
  const people = staffList || [];
  const byLogin = people.find(person => String(person.loginEmail || '').trim().toLowerCase() === email);
  if (byLogin) return byLogin;
  return people.find(person => (
    !String(person.loginEmail || '').trim()
    && String(person.email || '').trim().toLowerCase() === email
  )) || null;
}

export function resolveActor(user, staffList) {
  const email = accountEmail(user);
  const username = String(user?.username || '').trim().toLowerCase();
  if (!user || user.id === 'local' || !email || username === 'local_user' || username === 'admin') {
    return { kind: 'admin', staff: null, access: FULL };
  }
  const staff = findLinkedStaff(user, staffList);
  if (!staff) return { kind: 'guest', staff: null, access: {} };
  if (staff.accessRole !== 'member') return { kind: 'admin', staff, access: FULL };
  return { kind: 'member', staff, access: normalizeAccess(staff.access) };
}

export function canSee(actor, tab) {
  if (!actor || actor.kind === 'admin') return true;
  if (actor.kind !== 'member') return false;
  const level = actor.access?.[tab];
  return level === 'view' || level === 'edit';
}

export function canEdit(actor, tab) {
  if (!actor || actor.kind === 'admin') return true;
  if (actor.kind !== 'member') return false;
  return actor.access?.[tab] === 'edit';
}

export function firstSheetPlan(actor) {
  return ['week', 'month', 'leave', 'study'].find(id => canSee(actor, id)) || null;
}

export function visibleNav(actor) {
  const views = [];
  if (['week', 'month', 'leave', 'study'].some(id => canSee(actor, id))) views.push('SHEET');
  if (canSee(actor, 'calendar')) views.push('CALENDAR');
  if (canSee(actor, 'dashboard')) views.push('DASHBOARD');
  if (canSee(actor, 'staff')) views.push('STAFF');
  if (canSee(actor, 'tasks')) views.push('TASKS');
  return views;
}

export function firstNav(actor) {
  return visibleNav(actor)[0] || 'ACCOUNT';
}

export function accessRoleLabel(person) {
  return person?.accessRole === 'member' ? 'Nhân viên' : 'Quản trị';
}
