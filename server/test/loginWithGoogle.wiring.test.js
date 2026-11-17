import test, { before, mock } from 'node:test';
import assert from 'node:assert/strict';
import { toProfilePayload } from '../src/utils/userDto.js';

// Wiring tests for loginWithGoogle + toProfilePayload (F-102). Fail if call-sites are removed.

const googleProfile = {
  email: 'newbie@example.com',
  sub: 'gid-new',
  name: 'Newbie',
  picture: ''
};

let prismaState;
let verifyImpl;

function resetPrismaState() {
  prismaState = {
    byGoogleId: null,
    byEmail: null,
    adminCount: 0,
    created: null,
    updated: null,
    fresh: null
  };
}

before(() => {
  resetPrismaState();
  verifyImpl = async () => googleProfile;

  mock.module('../src/services/googleAuth.js', {
    exports: {
      verifyGoogleCredential: async (credential) => verifyImpl(credential),
      googleClientId: () => 'test-client'
    }
  });

  mock.module('../src/utils/hashPassword.js', {
    exports: {
      hashPassword: async () => 'hashed',
      comparePassword: async () => false
    }
  });

  mock.module('../src/config/jwt.js', {
    exports: {
      signToken: (payload) => `tok:${payload.sub}:${payload.role || ''}`,
      verifyToken: () => ({})
    }
  });

  mock.module('../src/config/db.js', {
    exports: {
      prisma: {
        user: {
          findUnique: async ({ where }) => {
            if (where.googleId != null) return prismaState.byGoogleId;
            if (where.email != null) return prismaState.byEmail;
            if (where.id != null) return prismaState.fresh || prismaState.created || prismaState.updated;
            if (where.username != null) return null;
            return null;
          },
          count: async () => prismaState.adminCount,
          create: async ({ data }) => {
            prismaState.created = {
              id: 'u-created',
              email: data.email,
              username: data.username,
              role: data.role || '',
              fullName: data.fullName,
              googleId: data.googleId,
              avatarUrl: data.avatarUrl || '',
              phone: '',
              birthDate: '',
              country: '',
              address: '',
              createdAt: new Date(),
              updatedAt: new Date(),
              settings: { id: 's1', userId: 'u-created' }
            };
            prismaState.fresh = prismaState.created;
            return prismaState.created;
          },
          update: async ({ where, data }) => {
            const base = prismaState.byEmail || prismaState.byGoogleId || { id: where.id };
            prismaState.updated = {
              ...base,
              ...data,
              id: where.id || base.id,
              phone: base.phone || '',
              birthDate: base.birthDate || '',
              country: base.country || '',
              address: base.address || '',
              createdAt: base.createdAt || new Date(),
              updatedAt: new Date(),
              settings: base.settings || { id: 's1', userId: where.id || base.id }
            };
            prismaState.fresh = prismaState.updated;
            return prismaState.updated;
          }
        },
        userSetting: {
          create: async () => ({ id: 's-new' })
        }
      }
    }
  });
});

test('toProfilePayload includes role Admin and empty default', () => {
  const withAdmin = toProfilePayload({
    id: '1',
    email: 'a@b.co',
    username: 'a',
    role: 'Admin',
    fullName: 'A',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  assert.equal(withAdmin.role, 'Admin');

  const empty = toProfilePayload({
    id: '2',
    email: 'b@b.co',
    username: 'b',
    fullName: 'B',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  assert.equal(empty.role, '');
});

test('loginWithGoogle: policy reject → err.status 403', async () => {
  resetPrismaState();
  prismaState.adminCount = 1;
  const prev = process.env.BOOTSTRAP_ADMIN_EMAILS;
  process.env.BOOTSTRAP_ADMIN_EMAILS = '';
  verifyImpl = async () => ({ ...googleProfile, email: 'outsider@example.com', sub: 'gid-out' });

  const { loginWithGoogle } = await import('../src/services/userService.js');
  try {
    await assert.rejects(
      () => loginWithGoogle('credential-token-xxxxxxxx'),
      (err) => err.status === 403
    );
  } finally {
    process.env.BOOTSTRAP_ADMIN_EMAILS = prev;
  }
});

test('loginWithGoogle: first-user grant persists role Admin on profile', async () => {
  resetPrismaState();
  prismaState.adminCount = 0;
  const prev = process.env.BOOTSTRAP_ADMIN_EMAILS;
  process.env.BOOTSTRAP_ADMIN_EMAILS = '';
  verifyImpl = async () => ({ ...googleProfile, email: 'first@example.com', sub: 'gid-first' });

  const { loginWithGoogle } = await import('../src/services/userService.js');
  try {
    const result = await loginWithGoogle('credential-token-xxxxxxxx');
    assert.equal(prismaState.created?.role, 'Admin');
    assert.equal(result.user.role, 'Admin');
  } finally {
    process.env.BOOTSTRAP_ADMIN_EMAILS = prev;
  }
});

test('loginWithGoogle: allowlist grant persists role Admin on profile', async () => {
  resetPrismaState();
  prismaState.adminCount = 2;
  const prev = process.env.BOOTSTRAP_ADMIN_EMAILS;
  process.env.BOOTSTRAP_ADMIN_EMAILS = 'allow@example.com';
  verifyImpl = async () => ({ ...googleProfile, email: 'allow@example.com', sub: 'gid-allow' });

  const { loginWithGoogle } = await import('../src/services/userService.js');
  try {
    const result = await loginWithGoogle('credential-token-xxxxxxxx');
    assert.equal(prismaState.created?.role, 'Admin');
    assert.equal(result.user.role, 'Admin');
  } finally {
    process.env.BOOTSTRAP_ADMIN_EMAILS = prev;
  }
});

test('loginWithGoogle reaches assertNoGoogleIdConflict → 409', async () => {
  resetPrismaState();
  prismaState.byGoogleId = null;
  prismaState.byEmail = {
    id: 'u-existing',
    email: 'clash@example.com',
    username: 'clash',
    role: '',
    fullName: 'Clash',
    googleId: 'gid-old',
    avatarUrl: '',
    settings: { id: 's1', userId: 'u-existing' }
  };
  verifyImpl = async () => ({ ...googleProfile, email: 'clash@example.com', sub: 'gid-new' });

  const { loginWithGoogle } = await import('../src/services/userService.js');
  await assert.rejects(
    () => loginWithGoogle('credential-token-xxxxxxxx'),
    (err) => err.status === 409 && /Google khác/i.test(err.message)
  );
});
