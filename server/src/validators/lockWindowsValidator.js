import { z } from 'zod';

const lockField = z.union([z.string(), z.null()]).optional();

export const lockWindowsUpdateSchema = z
  .object({
    leaveLockAt: lockField,
    monthLockAt: lockField
  })
  .refine(
    (body) =>
      Object.prototype.hasOwnProperty.call(body, 'leaveLockAt') ||
      Object.prototype.hasOwnProperty.call(body, 'monthLockAt'),
    { message: 'Cần ít nhất một trong leaveLockAt hoặc monthLockAt.' }
  );
