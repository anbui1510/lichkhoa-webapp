import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNoiseHostSlug, resolveTenant } from '../src/config/tenant.js';
import { importNhanSuRows } from '../src/logic/sheetStore/nhanSu.js';
import { NHAN_SU_HEADERS } from '../src/logic/sheetStore/constants.js';

describe('F-305 tenant', () => {
  it('TC-F305-01: resolveTenant from hostname pages.dev slug', () => {
    const t = resolveTenant('timmach-lichkhoa-webapp.pages.dev');
    assert.equal(t.slug, 'timmach');
    assert.ok(Array.isArray(t.departments));
  });

  it('TC-F305-04: preview hostname slug không làm id khoa', () => {
    assert.equal(isNoiseHostSlug('cursor-f214-leave-lock-windo'), true);
    assert.equal(isNoiseHostSlug('chdmanagementwebapp5'), true);
    assert.equal(isNoiseHostSlug('lichkhoa-webapp'), true);
    assert.equal(isNoiseHostSlug('timmach'), false);
    const t = resolveTenant('chdmanagementwebapp5-lichkhoa-webapp.pages.dev');
    assert.notEqual(t.departments?.[0]?.id, 'dept_chdmanagementwebapp5');
  });

  it('TC-F305-03: NhanSu deptId round-trip', () => {
    const rows = [NHAN_SU_HEADERS, ['s1', 'A', 'A', 'BS', 0, 0, 0, 'a@x.vn', 'g@x.vn', 'BS', 'dept_a', 'Phong A', 'member', 'edit', 'view', 'edit', 'view', 'view', 'none', 'none', 'none']];
    const staff = importNhanSuRows(rows);
    assert.equal(staff[0].deptId, 'dept_a');
    assert.equal(staff[0].deptLabel, 'Phong A');
  });
});
