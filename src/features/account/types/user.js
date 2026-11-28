export const EMPTY_PROFILE = {
  id: '',
  email: '',
  username: '',
  fullName: '',
  phone: '',
  birthDate: '',
  country: 'Việt Nam',
  address: '',
  avatarUrl: ''
};

export const EMPTY_SETTINGS = {
  emailNotifications: true,
  pushNotifications: true,
  darkMode: false,
  language: 'vi',
  twoFactorEnabled: false,
  privacyMode: false,
  /** Phút không hoạt động trước khi tự thoát; `null` = vô thời hạn */
  sessionTimeoutMinutes: 60,
};
