import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();

export function googleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || '').trim();
}

export async function verifyGoogleCredential(credential) {
  const clientId = googleClientId();
  if (!clientId) {
    const err = new Error('Chưa cấu hình GOOGLE_CLIENT_ID trên API.');
    err.status = 503;
    throw err;
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId
    });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified !== true || !payload.sub) {
      const err = new Error('Google chưa xác nhận email này.');
      err.status = 401;
      throw err;
    }
    return payload;
  } catch (error) {
    if (error.status) throw error;
    const err = new Error('Không xác thực được tài khoản Google.');
    err.status = 401;
    throw err;
  }
}
