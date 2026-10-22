import { verifyToken } from '../config/jwt.js';
import { prisma } from '../config/db.js';

export async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Chưa đăng nhập.' });
    }
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { settings: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại.' });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ.' });
  }
}
