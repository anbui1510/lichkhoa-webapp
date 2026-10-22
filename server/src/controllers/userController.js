import * as userService from '../services/userService.js';

export async function register(req, res) {
  try {
    const result = await userService.registerUser(req.validated);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Đăng ký thất bại.' });
  }
}

export async function login(req, res) {
  try {
    const result = await userService.loginUser(req.validated);
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Đăng nhập thất bại.' });
  }
}

export async function me(req, res) {
  try {
    const user = await userService.getMe(req.user.id);
    return res.json({ user });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'Không lấy được tài khoản.' });
  }
}
