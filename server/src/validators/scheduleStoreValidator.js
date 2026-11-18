import { z } from 'zod';

/** TC-F303-01 / TC-F303-04 — payload phải có departments[]. */
export const scheduleStorePutSchema = z.object({
  payload: z.object({
    departments: z.array(z.unknown()),
  }).passthrough(),
});
