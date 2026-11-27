import test from 'node:test';
import assert from 'node:assert/strict';

test('TC-F102-08: sheet backend — resolveGoogleClientId không gọi API', async () => {
  const { resolveGoogleClientId } = await import('../src/config/googleClient.js');
  const { isSheetBackend } = await import('../src/config/dataBackend.js');
  let called = false;
  const id = await resolveGoogleClientId(async () => {
    called = true;
    return { clientId: 'from-api.apps.googleusercontent.com' };
  });
  if (isSheetBackend()) {
    assert.equal(called, false, 'Sheet Pages không lấy clientId qua Render');
    assert.equal(id, '');
  } else {
    assert.equal(called, true);
    assert.equal(id, 'from-api.apps.googleusercontent.com');
  }
});