import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export async function hashPassword(plain) {
  return bcrypt.hash(String(plain), ROUNDS);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(String(plain), hash);
}
