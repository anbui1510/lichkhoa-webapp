# F-305 — Implementation plan

1. [`src/config/tenant.js`](../../../../src/config/tenant.js) — parse env + hostname
2. [`sheetStorage.js`](../../../../src/features/sheetSync/sheetStorage.js) — tenant trong getSpreadsheetId
3. [`App.jsx`](../../../../src/App.jsx) — auto activeDept, hide dept selector
4. [`constants.js`](../../../../src/logic/sheetStore/constants.js) + [`nhanSu.js`](../../../../src/logic/sheetStore/nhanSu.js)
5. [`StaffManager.jsx`](../../../../src/components/StaffManager.jsx) — dept picker
6. [`docs/DEPLOY-MULTI-KHOA.md`](../../../../docs/DEPLOY-MULTI-KHOA.md)
7. Tests `tests/tenant.test.js`
