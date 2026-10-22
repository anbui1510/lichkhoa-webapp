import { prisma } from '../config/db.js';
import { toProfilePayload } from '../utils/userDto.js';
import { persistAvatar } from '../utils/uploadAvatar.js';

export async function updateProfile(userId, data) {
  if (data.username) {
    const clash = await prisma.user.findFirst({
      where: { username: data.username, NOT: { id: userId } }
    });
    if (clash) {
      const err = new Error('Username đã được sử dụng.');
      err.status = 409;
      throw err;
    }
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
      ...(data.birthDate !== undefined ? { birthDate: data.birthDate } : {}),
      ...(data.country !== undefined ? { country: data.country.trim() } : {}),
      ...(data.address !== undefined ? { address: data.address.trim() } : {}),
      ...(data.username !== undefined ? { username: data.username.trim() } : {})
    },
    include: { settings: true }
  });
  return toProfilePayload(user);
}

export async function updateAvatar(userId, file) {
  const avatarUrl = await persistAvatar(file);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    include: { settings: true }
  });
  return toProfilePayload(user);
}
