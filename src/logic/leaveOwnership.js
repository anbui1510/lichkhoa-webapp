import { findLinkedStaff } from './access.js';

function norm(value) {
  return String(value || '').trim().toUpperCase();
}

/**
 * Tập shortName / tên User được phép gắn vào lịch nghỉ.
 * @param {object | null | undefined} user
 * @param {object[]} [staffList]
 * @param {object[]} [rosterPeople]
 * @returns {Set<string>}
 */
export function resolveActorLeaveKeys(user, staffList = [], rosterPeople = []) {
  const keys = new Set();
  const staff = findLinkedStaff(user, staffList);
  if (staff?.shortName) keys.add(norm(staff.shortName));
  if (staff?.name) keys.add(norm(staff.name));

  const uid = user?.id;
  const linked = (rosterPeople || []).find(
    (person) => person?.linkedUserId && uid && person.linkedUserId === uid
  );
  if (linked?.displayName) {
    const display = norm(linked.displayName);
    keys.add(display);
    for (const person of staffList || []) {
      if (norm(person.name) === display || norm(person.shortName) === display) {
        if (person.shortName) keys.add(norm(person.shortName));
      }
    }
  }
  return keys;
}

/**
 * @param {{ kind?: string } | null | undefined} actor
 * @param {{ shortName?: string } | null | undefined} entry
 * @param {Set<string>} leaveKeys
 */
export function canMutateLeaveEntry(actor, entry, leaveKeys) {
  if (!actor || actor.kind === 'admin') return true;
  if (actor.kind !== 'member') return false;
  const key = norm(entry?.shortName);
  if (!key) return false;
  return leaveKeys instanceof Set ? leaveKeys.has(key) : false;
}
