import test, { before, mock } from 'node:test';
import assert from 'node:assert/strict';

// TC-F104 / TC-F105 roster service matrix

let store;

function resetStore() {
  store = {
    people: [],
    users: new Map()
  };
}

before(() => {
  resetStore();

  mock.module('../src/config/jwt.js', {
    namedExports: {
      signToken: (payload) => `tok:${payload.sub}:${payload.role || ''}`,
      verifyToken: () => ({})
    }
  });

  mock.module('../src/config/db.js', {
    namedExports: {
      prisma: {
        rosterPerson: {
          findMany: async (args = {}) => {
            let rows = [...store.people];
            if (args?.select) {
              rows = rows.map((p) => {
                const out = {};
                for (const key of Object.keys(args.select)) {
                  if (args.select[key]) out[key] = p[key];
                }
                return out;
              });
            }
            if (args?.orderBy) {
              rows.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));
            }
            return rows;
          },
          findUnique: async ({ where }) => store.people.find((p) => p.id === where.id) || null,
          findFirst: async ({ where }) => {
            return (
              store.people.find((p) => {
                if (where.linkedUserId != null && p.linkedUserId !== where.linkedUserId) return false;
                if (where.NOT?.id && p.id === where.NOT.id) return false;
                return true;
              }) || null
            );
          },
          create: async ({ data }) => {
            const person = {
              id: `rp-${store.people.length + 1}`,
              displayName: data.displayName,
              role: data.role,
              linkedUserId: data.linkedUserId || null,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            store.people.push(person);
            return person;
          },
          update: async ({ where, data }) => {
            const idx = store.people.findIndex((p) => p.id === where.id);
            if (idx < 0) throw Object.assign(new Error('not found'), { code: 'P2025' });
            store.people[idx] = {
              ...store.people[idx],
              ...data,
              updatedAt: new Date()
            };
            return store.people[idx];
          },
          delete: async ({ where }) => {
            const idx = store.people.findIndex((p) => p.id === where.id);
            if (idx < 0) throw Object.assign(new Error('not found'), { code: 'P2025' });
            const [removed] = store.people.splice(idx, 1);
            return removed;
          }
        },
        user: {
          findUnique: async ({ where }) => store.users.get(where.id) || null,
          update: async ({ where, data, include }) => {
            const prev = store.users.get(where.id) || {
              id: where.id,
              email: 'u@example.com',
              username: 'u',
              role: '',
              fullName: 'U',
              phone: '',
              birthDate: '',
              country: '',
              address: '',
              avatarUrl: '',
              createdAt: new Date(),
              updatedAt: new Date(),
              settings: { id: 's1', userId: where.id }
            };
            const next = { ...prev, ...data, updatedAt: new Date() };
            if (include?.settings && !next.settings) {
              next.settings = { id: 's1', userId: where.id };
            }
            store.users.set(where.id, next);
            return next;
          }
        },
        $transaction: async (fn) => fn({
          rosterPerson: {
            update: async ({ where, data }) => {
              const idx = store.people.findIndex((p) => p.id === where.id);
              store.people[idx] = { ...store.people[idx], ...data, updatedAt: new Date() };
              return store.people[idx];
            }
          },
          user: {
            findUnique: async ({ where }) => store.users.get(where.id) || null,
            update: async ({ where, data, include }) => {
              const prev = store.users.get(where.id);
              const next = { ...prev, ...data, updatedAt: new Date() };
              if (include?.settings && !next.settings) {
                next.settings = { id: 's1', userId: where.id };
              }
              store.users.set(where.id, next);
              return next;
            }
          }
        })
      }
    }
  });
});

test('TC-F104-01 / TC-F104-06 create roster person', async () => {
  resetStore();
  const { createRosterPerson, toRosterDto } = await import('../src/services/rosterService.js');
  const person = await createRosterPerson({ displayName: '  BS. An  ', role: 'User' });
  assert.equal(person.displayName, 'BS. An');
  assert.equal(person.role, 'User');
  assert.equal(person.linked, false);
  assert.equal(toRosterDto({ ...person, linkedUserId: 'u1' }).linked, true);
});

test('TC-F104-02 role không hợp lệ → 400', async () => {
  resetStore();
  const { createRosterPerson } = await import('../src/services/rosterService.js');
  await assert.rejects(
    () => createRosterPerson({ displayName: 'X', role: 'Guest' }),
    (err) => err.status === 400
  );
});

test('TC-F104-03 duplicate displayName case-insensitive → 409', async () => {
  resetStore();
  const { createRosterPerson } = await import('../src/services/rosterService.js');
  await createRosterPerson({ displayName: 'An', role: 'Mod' });
  await assert.rejects(
    () => createRosterPerson({ displayName: 'an', role: 'User' }),
    (err) => err.status === 409
  );
});

test('TC-F104-07 delete khi linked → 409', async () => {
  resetStore();
  const { createRosterPerson, deleteRosterPerson } = await import('../src/services/rosterService.js');
  const person = await createRosterPerson({ displayName: 'Linked', role: 'User' });
  store.people[0].linkedUserId = 'u-linked';
  await assert.rejects(
    () => deleteRosterPerson(person.id),
    (err) => err.status === 409
  );
});

test('TC-F105-02 link free User → User.role + linked', async () => {
  resetStore();
  store.users.set('u-new', {
    id: 'u-new',
    email: 'new@example.com',
    username: 'new',
    role: '',
    fullName: 'New',
    phone: '',
    birthDate: '',
    country: '',
    address: '',
    avatarUrl: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: { id: 's1', userId: 'u-new' }
  });
  const { createRosterPerson, linkRosterPerson } = await import('../src/services/rosterService.js');
  const person = await createRosterPerson({ displayName: 'User A', role: 'User' });
  const result = await linkRosterPerson(person.id, 'u-new');
  assert.equal(result.user.role, 'User');
  assert.equal(result.person.linked, true);
  assert.equal(result.person.linkedUserId, 'u-new');
  assert.match(result.token, /^tok:u-new:User$/);
});

test('TC-F105-03 link taken → 409', async () => {
  resetStore();
  const { createRosterPerson, linkRosterPerson } = await import('../src/services/rosterService.js');
  const person = await createRosterPerson({ displayName: 'Taken', role: 'Mod' });
  store.people[0].linkedUserId = 'u-other';
  await assert.rejects(
    () => linkRosterPerson(person.id, 'u-me'),
    (err) => err.status === 409
  );
});
