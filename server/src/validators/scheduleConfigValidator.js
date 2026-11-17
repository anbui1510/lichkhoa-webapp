import { z } from 'zod';

export const scheduleConfigUpdateSchema = z
  .object({
    spreadsheetId: z.string().optional(),
    spreadsheetIdOrUrl: z.string().optional()
  })
  .refine(
    (body) =>
      String(body.spreadsheetIdOrUrl || '').trim() ||
      String(body.spreadsheetId || '').trim(),
    { message: 'Nhập ID hoặc đường dẫn Google Spreadsheet.' }
  );
