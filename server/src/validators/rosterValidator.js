import { z } from 'zod';
import { ROSTER_ROLES } from '../services/adminBootstrap.js';

const roleSchema = z.enum(ROSTER_ROLES, {
  errorMap: () => ({ message: 'Vai trò phải là Admin, Mod hoặc User.' })
});

export const rosterCreateSchema = z.object({
  displayName: z
    .string({ required_error: 'Nhập tên hiển thị.' })
    .trim()
    .min(1, 'Nhập tên hiển thị.')
    .max(120, 'Tên tối đa 120 ký tự.'),
  role: roleSchema
});

export const rosterUpdateSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Nhập tên hiển thị.')
      .max(120, 'Tên tối đa 120 ký tự.')
      .optional(),
    role: roleSchema.optional()
  })
  .refine((body) => body.displayName !== undefined || body.role !== undefined, {
    message: 'Cần ít nhất một trường để cập nhật.'
  });
