# F-305 — Implementation plan

1. [`src/config/tenant.js`](../../../../src/config/tenant.js) — parse env + hostname
2. [`sheetStorage.js`](../../../../src/features/sheetSync/sheetStorage.js) — tenant trong getSpreadsheetId
3. [`App.jsx`](../../../../src/App.jsx) — auto activeDept, hide dept selector
4. [`constants.js`](../../../../src/logic/sheetStore/constants.js) + [`nhanSu.js`](../../../../src/logic/sheetStore/nhanSu.js)
5. [`StaffManager.jsx`](../../../../src/components/StaffManager.jsx) — dept picker
6. [`docs/DEPLOY-MULTI-KHOA.md`](../../../../docs/DEPLOY-MULTI-KHOA.md)
7. Tests `tests/tenant.test.js`
8. [`server/src/corsOrigins.js`](../../../../server/src/corsOrigins.js) + [`server/src/app.js`](../../../../server/src/app.js) — `createCorsOriginValidator()`
9. [`render.yaml`](../../../../render.yaml), [`server/.env.example`](../../../../server/.env.example), [`docs/DEPLOY-SUPABASE.md`](../../../../docs/DEPLOY-SUPABASE.md)
10. Tests `server/test/corsOrigins.test.js` (TC-F305-06)
11. Runbook &lt; 20 khoa: [`docs/DEPLOY-MULTI-KHOA.md`](../../../../docs/DEPLOY-MULTI-KHOA.md), [`docs/templates/cloudflare-env-khoa.example.env`](../../../../docs/templates/cloudflare-env-khoa.example.env), [`docs/PILOT-NHIEM-KHOA.md`](../../../../docs/PILOT-NHIEM-KHOA.md)
