import test from 'node:test';
import assert from 'node:assert/strict';
import { taskForRole, weekCodeForMonthRole } from '../src/logic/taskMatch.js';

// F-201 BR-201-02 — mã hóa vào gác

test('TC-F201-05: taskForRole truc_chinh khớp task TC encodeDuty', () => {
  const tasks = [
    { id: 'vg', code: 'VG', dutyRole: 'vao_gac', encodeDuty: false, category: 'THUONG_TRUC' },
    { id: 'tc', code: 'TC', name: 'Trực chính', scope: 'month', encodeDuty: true, category: 'THUONG_TRUC' },
  ];
  const role = { key: 'truc_chinh', label: 'Trực Chính' };
  const task = taskForRole(role, tasks);
  assert.equal(task?.code, 'TC');
  assert.equal(task?.encodeDuty, true);
});

test('TC-F201-06: đổ từ lịch tháng — trực chính Chiều cuối tuần → VG', () => {
  const taskList = [
    { id: 'vg', code: 'VG', dutyRole: 'vao_gac', encodeDuty: false, category: 'THUONG_TRUC', blocker: true },
    { id: 'tn', code: 'TN', dutyRole: 'truc_ngay', encodeDuty: false, category: 'THUONG_TRUC', blocker: true },
    { id: 'tc', code: 'TC', name: 'Trực chính', scope: 'month', encodeDuty: true, category: 'THUONG_TRUC', blocker: true },
  ];
  const role = { key: 'truc_chinh', label: 'Trực Chính' };
  assert.equal(weekCodeForMonthRole(role, 'C', taskList), 'VG', 'Thứ 7/CN Chiều phải VG');
  assert.equal(weekCodeForMonthRole(role, 'T', taskList), 'VG', 'Buổi tối encode → VG');
});