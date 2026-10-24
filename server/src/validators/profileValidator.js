import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  username: z.string().min(3, 'Username tối thiểu 3 ký tự').max(40),
  fullName: z.string().min(2, 'Họ tên tối thiểu 2 ký tự').max(120),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự')
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Nhập mật khẩu')
});

export const googleLoginSchema = z.object({
  credential: z.string().min(20, 'Token Google không hợp lệ')
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().max(30).optional(),
  birthDate: z.string().max(32).optional(),
  country: z.string().max(80).optional(),
  address: z.string().max(240).optional(),
  username: z.string().min(3).max(40).optional()
});

export const settingsUpdateSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  language: z.enum(['vi', 'en']).optional(),
  twoFactorEnabled: z.boolean().optional(),
  privacyMode: z.boolean().optional()
});

export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự')
});
