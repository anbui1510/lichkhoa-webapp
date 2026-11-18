import { prisma } from '../config/db.js';

export async function getStoreForUser(userId) {
  return prisma.scheduleStore.findUnique({
    where: { userId },
    select: { payload: true, updatedAt: true, createdAt: true }
  });
}

export async function upsertStoreForUser(userId, payload) {
  return prisma.scheduleStore.upsert({
    where: { userId },
    create: { userId, payload },
    update: { payload },
    select: { payload: true, updatedAt: true, createdAt: true }
  });
}
