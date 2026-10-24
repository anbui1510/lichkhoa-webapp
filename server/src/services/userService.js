import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/hashPassword.js';
import { signToken } from '../config/jwt.js';
import { toProfilePayload } from '../utils/userDto.js';
import { verifyGoogleCredential } from './googleAuth.js';

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

async function uniqueUsername(email) {
  const raw = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
  let base = raw.slice(0, 24);
  if (base.length < 3) base = `${base}user`.slice(0, 24);
  let candidate = base;
  for (let i = 0; i < 20; i += 1) {
    const taken = await prisma.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
    candidate = `${base.slice(0, 18)}${i + 2}`;
  }
  return `${base.slice(0, 12)}${Date.now().toString(36)}`;
}

export async function loginWithGoogle(credential) {
  const profile = await verifyGoogleCredential(credential);
  const email = profile.email.toLowerCase().trim();
  const googleId = profile.sub;
  let user = await prisma.user.findUnique({
    where: { googleId },
    include: { settings: true }
  });
  if (!user) {
    const existing = await prisma.user.findUnique({
      where: { email },
      include: { settings: true }
    });
    if (existing?.googleId && existing.googleId !== googleId) {
      const err = new Error('Email này đã liên kết với tài khoản Google khác.');
      err.status = 409;
      throw err;
    }
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          googleId,
          avatarUrl: existing.avatarUrl || profile.picture || '',
          fullName: existing.fullName || profile.name || email
        },
        include: { settings: true }
      });
    }
  }
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        username: await uniqueUsername(email),
        fullName: String(profile.name || email).slice(0, 120),
        passwordHash: await hashPassword(crypto.randomBytes(32).toString('hex')),
        googleId,
        avatarUrl: profile.picture || '',
        settings: { create: {} }
      },
      include: { settings: true }
    });
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
