import jwt from 'jsonwebtoken';

const secret = () => process.env.JWT_SECRET || 'lichkhoa-dev-secret';
const expiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload) {
  return jwt.sign(payload, secret(), { expiresIn: expiresIn() });
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}
