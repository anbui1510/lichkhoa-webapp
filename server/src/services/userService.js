import { prisma } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import { signToken } from '../config/jwt.js';
import { toProfilePayload } from '../utils/userDto.js';

async function defaultSettings(userId) {
  return prisma.userSetting.create({
    data: { userId }
  });
}

export async function registerUser({ email, username, fullName, password }) {
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });
  if (exists) {
    const err = new Error(exists.email === email ? 'Email đã được sử dụng.' : 'Username đã được sử dụng.');
    err.status = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      username: username.trim(),
      fullName: fullName.trim(),
      passwordHash,
      settings: { create: {} }
    },
    include: { settings: true }
  });
  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: toProfilePayload(user) };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { settings: true }
  });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    const err = new Error('Email hoặc mật khẩu không đúng.');
    err.status = 401;
    throw err;
  }
  if (!user.settings) await defaultSettings(user.id);
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    include: { settings: true }
  });
  const token = signToken({ sub: user.id, email: user.email });
  return { token, user: toProfilePayload(fresh) };
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true }
  });
  if (!user) {
    const err = new Error('Không tìm thấy người dùng.');
    err.status = 404;
    throw err;
  }
  return toProfilePayload(user);
}
