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
