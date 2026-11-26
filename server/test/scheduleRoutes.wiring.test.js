import test from 'node:test';
import assert from 'node:assert/strict';
import scheduleRoutes from '../src/routes/scheduleRoutes.js';

// Fail nếu requireAdmin bị gỡ khỏi PUT /config (BR-103-04 call-site).

test('TC-F103-14 PUT /config stack vẫn gắn requireAdmin', () => {
  const putLayer = scheduleRoutes.stack.find(
    (layer) => layer.route?.path === '/config' && layer.route.methods?.put
  );
  assert.ok(putLayer, 'Thiếu route PUT /config');
  const handlerNames = putLayer.route.stack.map((layer) => layer.handle?.name || '');
  assert.ok(
    handlerNames.includes('requireAdmin'),
    `PUT /config thiếu requireAdmin; stack=${handlerNames.join(',')}`
  );
});

test('TC-F214 wiring: PUT /lock-windows + requireAdmin; PUT /data dùng requireScheduleWrite', () => {
  const lockLayer = scheduleRoutes.stack.find(
    (layer) => layer.route?.path === '/lock-windows' && layer.route.methods?.put
  );
  assert.ok(lockLayer, 'Thiếu route PUT /lock-windows');
  const lockNames = lockLayer.route.stack.map((layer) => layer.handle?.name || '');
  assert.ok(
    lockNames.includes('requireAdmin'),
    `PUT /lock-windows thiếu requireAdmin; stack=${lockNames.join(',')}`
  );

  const dataLayer = scheduleRoutes.stack.find(
    (layer) => layer.route?.path === '/data' && layer.route.methods?.put
  );
  assert.ok(dataLayer, 'Thiếu route PUT /data');
  const dataNames = dataLayer.route.stack.map((layer) => layer.handle?.name || '');
  assert.ok(
    dataNames.includes('requireScheduleWrite'),
    `PUT /data thiếu requireScheduleWrite; stack=${dataNames.join(',')}`
  );
});
