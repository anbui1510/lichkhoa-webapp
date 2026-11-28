import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPeriodLimitedStaff,
  traineeOnWeek,
  traineeCovers,
  parseShowInWeek,
} from '../src/logic/traineePeriod.js';
import { exportNhanSuRows, importNhanSuRows } from '../src/logic/sheetStore/nhanSu.js';

const week = (isos) => isos.map((iso) => ({ iso }));

describe('F-217 traineePeriod', () => {
  it('TC-F217-01: hỗ trợ trong khoảng → traineeOnWeek true', () => {
    const person = {
      title: 'Hỗ trợ',
      position: 'Hỗ trợ',
      studyFrom: '2026-11-10',
      studyTo: '2026-11-20',
      showInWeek: true,
    };
    assert.equal(isPeriodLimitedStaff(person), true);
    assert.equal(traineeOnWeek(person, week(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'])), true);
    assert.equal(traineeCovers(person, '2026-11-12'), true);
  });

  it('TC-F217-02: ngoài khoảng → false', () => {
    const person = {
      title: 'Học Viên',
      position: 'BS Học viên',
      studyFrom: '2026-11-10',
      studyTo: '2026-11-20',
      showInWeek: true,
    };
    assert.equal(
      traineeOnWeek(person, week(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07'])),
      false,
    );
  });

  it('TC-F217-03: showInWeek off → false dù trong khoảng', () => {
    const person = {
      title: 'Hỗ trợ',
      studyFrom: '2026-11-10',
      studyTo: '2026-11-20',
      showInWeek: false,
    };
    assert.equal(parseShowInWeek(person.showInWeek), false);
    assert.equal(
      traineeOnWeek(person, week(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16'])),
      false,
    );
  });

  it('TC-F217-04: NhanSu import/export studyFrom/studyTo/showInWeek', () => {
    const staff = [{
      id: 'hv1',
      name: 'Nguyễn Quốc Huy',
      shortName: 'HUY',
      title: 'Hỗ trợ',
      dutyQuota: 9,
      buBalance: 0,
      phepBalance: 0,
      email: 'huy@hospital.vn',
      loginEmail: '',
      position: 'Hỗ trợ',
      studyFrom: '2026-11-10',
      studyTo: '2026-12-01',
      showInWeek: false,
      accessRole: 'member',
      access: {
        week: 'view', month: 'view', leave: 'none', study: 'none',
        calendar: 'none', dashboard: 'none', staff: 'none', tasks: 'none',
      },
    }];
    const rows = exportNhanSuRows(staff);
    assert.equal(rows[0].includes('showInWeek'), true);
    const back = importNhanSuRows(rows);
    assert.equal(back[0].studyFrom, '2026-11-10');
    assert.equal(back[0].studyTo, '2026-12-01');
    assert.equal(back[0].showInWeek, false);
  });

  it('BR-217-02: trống ngày + On → hiện mọi tuần', () => {
    const person = { title: 'Hỗ trợ', showInWeek: 'on', studyFrom: '', studyTo: '' };
    assert.equal(traineeOnWeek(person, week(['2026-01-05', '2026-01-06'])), true);
  });
});
