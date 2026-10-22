import { prisma } from '../config/db.js';
import { comparePassword, hashPassword } from '../utils/hashPassword.js';
import { toProfilePayload } from '../utils/userDto.js';

export async function updateSettings(userId, data) {
  const settings = await prisma.userSetting.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data }
  });
  return settings;
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await comparePassword(currentPassword, user.passwordHash))) {
    const err = new Error('Mật khẩu hiện tại không đúng.');
    err.status = 400;
    throw err;
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
  return { ok: true };
}

export async function getFullAccount(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true }
  });
  return toProfilePayload(user);
}
