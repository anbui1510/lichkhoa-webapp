import { prisma } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import { toProfilePayload } from '../utils/userDto.js';
import { isRosterRole, ROLE_ADMIN } from './adminBootstrap.js';

export function toRosterDto(person) {
  if (!person) return null;
  return {
    id: person.id,
    displayName: person.displayName,
    role: person.role,
    linkedUserId: person.linkedUserId || null,
    linked: Boolean(person.linkedUserId),
    createdAt: person.createdAt,
    updatedAt: person.updatedAt
  };
}

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function nameKey(name) {
  return normalizeName(name).toLowerCase();
}

async function findDuplicateName(displayName, excludeId = null) {
  const key = nameKey(displayName);
  if (!key) return null;
  const people = await prisma.rosterPerson.findMany({
    select: { id: true, displayName: true }
  });
  return people.find(
    (p) => nameKey(p.displayName) === key && (!excludeId || p.id !== excludeId)
  ) || null;
}

export async function listRoster() {
  const people = await prisma.rosterPerson.findMany({
    orderBy: [{ displayName: 'asc' }]
  });
  return people.map(toRosterDto);
}

export async function createRosterPerson({ displayName, role }) {
  const name = normalizeName(displayName);
  if (!name) {
    const err = new Error('Nhập tên hiển thị.');
    err.status = 400;
    throw err;
  }
  if (!isRosterRole(role)) {
    const err = new Error('Vai trò phải là Admin, Mod hoặc User.');
    err.status = 400;
    throw err;
  }
  const dup = await findDuplicateName(name);
  if (dup) {
    const err = new Error('Tên này đã có trong danh sách (không phân biệt hoa thường).');
    err.status = 409;
    throw err;
  }
  const person = await prisma.rosterPerson.create({
    data: { displayName: name, role: String(role) }
  });
  return toRosterDto(person);
}

export async function updateRosterPerson(id, { displayName, role }) {
  const existing = await prisma.rosterPerson.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Không tìm thấy người trong danh sách.');
    err.status = 404;
    throw err;
  }
  const data = {};
  if (displayName !== undefined) {
    const name = normalizeName(displayName);
    if (!name) {
      const err = new Error('Nhập tên hiển thị.');
      err.status = 400;
      throw err;
    }
    const dup = await findDuplicateName(name, id);
    if (dup) {
      const err = new Error('Tên này đã có trong danh sách (không phân biệt hoa thường).');
      err.status = 409;
      throw err;
    }
    data.displayName = name;
  }
  if (role !== undefined) {
    if (!isRosterRole(role)) {
      const err = new Error('Vai trò phải là Admin, Mod hoặc User.');
      err.status = 400;
      throw err;
    }
    data.role = String(role);
  }
  if (Object.keys(data).length === 0) {
    return toRosterDto(existing);
  }
  const person = await prisma.rosterPerson.update({ where: { id }, data });
  return toRosterDto(person);
}

export async function deleteRosterPerson(id) {
  const existing = await prisma.rosterPerson.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Không tìm thấy người trong danh sách.');
    err.status = 404;
    throw err;
  }
  if (existing.linkedUserId) {
    const err = new Error('Không xóa được: tên đang được liên kết. Hủy liên kết trước.');
    err.status = 409;
    throw err;
  }
  await prisma.rosterPerson.delete({ where: { id } });
  return { ok: true };
}

/**
 * User tự liên kết một tên chưa taken → copy role + set linkedUserId; cấp JWT mới.
 */
export async function linkRosterPerson(personId, userId) {
  const person = await prisma.rosterPerson.findUnique({ where: { id: personId } });
  if (!person) {
    const err = new Error('Không tìm thấy người trong danh sách.');
    err.status = 404;
    throw err;
  }
  if (person.linkedUserId && person.linkedUserId !== userId) {
    const err = new Error('Tên này đã được tài khoản khác liên kết.');
    err.status = 409;
    throw err;
  }

  const already = await prisma.rosterPerson.findFirst({
    where: { linkedUserId: userId, NOT: { id: personId } }
  });
  if (already) {
    const err = new Error('Tài khoản đã liên kết một tên khác. Nhờ Admin hủy liên kết trước.');
    err.status = 409;
    throw err;
  }

  const [updatedPerson, user] = await prisma.$transaction(async (tx) => {
    const nextPerson = await tx.rosterPerson.update({
      where: { id: personId },
      data: { linkedUserId: userId }
    });
    const nextUser = await tx.user.update({
      where: { id: userId },
      data: { role: person.role },
      include: { settings: true }
    });
    return [nextPerson, nextUser];
  });

  const token = signToken({ sub: user.id, email: user.email, role: user.role || '' });
  return {
    token,
    user: toProfilePayload(user),
    person: toRosterDto(updatedPerson)
  };
}

/**
 * Admin hủy liên kết; nếu User.role khớp roster role thì về "".
 */
export async function unlinkRosterPerson(personId) {
  const person = await prisma.rosterPerson.findUnique({ where: { id: personId } });
  if (!person) {
    const err = new Error('Không tìm thấy người trong danh sách.');
    err.status = 404;
    throw err;
  }
  if (!person.linkedUserId) {
    return toRosterDto(person);
  }

  const linkedUserId = person.linkedUserId;
  const rosterRole = person.role;

  const updated = await prisma.$transaction(async (tx) => {
    const nextPerson = await tx.rosterPerson.update({
      where: { id: personId },
      data: { linkedUserId: null }
    });
    const user = await tx.user.findUnique({ where: { id: linkedUserId } });
    if (user) {
      const current = String(user.role || '');
      // Không demote Admin bootstrap; chỉ clear Mod/User khi khớp roster.
      if (current === rosterRole && current !== ROLE_ADMIN) {
        await tx.user.update({
          where: { id: linkedUserId },
          data: { role: '' }
        });
      }
    }
    return nextPerson;
  });

  return toRosterDto(updated);
}
