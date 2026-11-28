import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOGIN_EMAIL_CLEAR,
  mergeStaffLoginEmails,
  mergeStoreStaffLoginEmails,
  normalizeLoginEmail,
} from '../src/logic/sheetStore/staffIdentityMerge.js';
import { exportNhanSuRows, importNhanSuRows } from '../src/logic/sheetStore/nhanSu.js';

describe('F-304 staff loginEmail preserve', () => {
  it('TC-F304-25: local trống + remote có email → lấy remote', () => {
    const { staff, changed } = mergeStaffLoginEmails(
      [{ id: 's1', name: 'A', loginEmail: '' }],
      [{ id: 's1', name: 'A', loginEmail: 'a@gmail.com' }],
    );
    assert.equal(changed, true);
    assert.equal(staff[0].loginEmail, 'a@gmail.com');
  });

  it('TC-F304-26: local đã có email → không bị remote đè', () => {
    const { staff, changed } = mergeStaffLoginEmails(
      [{ id: 's1', loginEmail: 'local@gmail.com' }],
      [{ id: 's1', loginEmail: 'sheet@gmail.com' }],
    );
    assert.equal(changed, false);
    assert.equal(staff[0].loginEmail, 'local@gmail.com');
  });

  it('TC-F304-27: sentinel gỡ liên kết không bị remote restore', () => {
    const { staff, changed } = mergeStaffLoginEmails(
      [{ id: 's1', loginEmail: LOGIN_EMAIL_CLEAR }],
      [{ id: 's1', loginEmail: 'a@gmail.com' }],
    );
    assert.equal(changed, false);
    assert.equal(staff[0].loginEmail, LOGIN_EMAIL_CLEAR);
  });

  it('TC-F304-28: export/import sentinel `-` → loginEmail trống', () => {
    const rows = exportNhanSuRows([{
      id: 's1',
      name: 'A',
      shortName: 'A',
      title: 'BS',
      dutyQuota: 6,
      buBalance: 0,
      phepBalance: 0,
      email: 'a@x.vn',
      loginEmail: LOGIN_EMAIL_CLEAR,
      position: 'BS',
      access: {},
    }]);
    const header = rows[0];
    const loginIdx = header.indexOf('loginEmail');
    assert.equal(rows[1][loginIdx], '-');
    const back = importNhanSuRows(rows);
    assert.equal(back[0].loginEmail, '');
    assert.equal(normalizeLoginEmail('-'), '');
  });

  it('TC-F304-29: mergeStoreStaffLoginEmails theo dept', () => {
    const local = {
      departments: [{ id: 'd1', staff: [{ id: 's1', loginEmail: '' }] }],
    };
    const remote = {
      departments: [{ id: 'd1', staff: [{ id: 's1', loginEmail: 'x@gmail.com' }] }],
    };
    const { store, changed } = mergeStoreStaffLoginEmails(local, remote);
    assert.equal(changed, true);
    assert.equal(store.departments[0].staff[0].loginEmail, 'x@gmail.com');
  });
});
