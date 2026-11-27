import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gateBranding, HOSPITAL_BRAND, sessionDeptDisplayName } from '../src/config/appBranding.js';

// docs/specs/features/F-305-multi-khoa-tenant/spec.md — TC-F305-07
describe('F-305 app branding', () => {
  it('TC-F305-07 gate branding is hospital-wide', () => {
    const gate = gateBranding();
    assert.equal(gate.title, HOSPITAL_BRAND.title);
    assert.equal(gate.subtitle, HOSPITAL_BRAND.gateHint);
  });

  it('session title uses dept name when set', () => {
    assert.equal(
      sessionDeptDisplayName({ name: 'Khoa Tiêu hóa' }, null),
      'Khoa Tiêu hóa'
    );
    assert.equal(
      sessionDeptDisplayName(null, { deptLabel: 'Khoa Tim mạch' }),
      'Khoa Tim mạch'
    );
  });

  it('session falls back when dept name is placeholder', () => {
    assert.equal(
      sessionDeptDisplayName({ name: 'Chưa đặt tên khoa' }, null),
      HOSPITAL_BRAND.title
    );
    assert.equal(
      sessionDeptDisplayName({ name: 'Lịch làm việc bệnh viện' }, null),
      HOSPITAL_BRAND.title
    );
  });
});