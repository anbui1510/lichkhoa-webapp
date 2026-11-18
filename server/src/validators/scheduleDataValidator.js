import { z } from 'zod';

export const scheduleDataPutSchema = z.object({
  payload: z
    .object({})
    .passthrough()
    .refine((v) => v !== null && typeof v === 'object' && !Array.isArray(v), {
      message: 'payload phải là object JSON lịch.'
    }),
  baseRevision: z.coerce.number().int().min(0, {
    message: 'baseRevision phải là số nguyên ≥ 0.'
  })
});
