/**
 * F-304 — Lịch khoa Sheet bridge
 * Deploy: Execute as Me | Who has access: Anyone with Google account
 */
var REQUIRED_TABS = ['_meta', 'NhanSu', 'Task', 'LichTuan', 'LichThang'];

var TAB_ACCESS = {
  NhanSu: 'staff',
  Task: 'tasks',
  LichTuan: 'week',
  LichThang: 'month',
  LichNghi: 'leave',
  LichHoc: 'study',
  Dashboard: 'dashboard'
};

var KHOA_CATALOG_TAB = 'KhoaCatalog';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action;
    var idToken = body.idToken;
    if (!idToken) {
      return jsonOut({ error: 'Thiếu idToken.' }, 400);
    }
    var email;
    try {
      email = verifyIdToken_(idToken);
    } catch (tokenErr) {
      return jsonOut({ error: String(tokenErr.message || tokenErr) }, 401);
    }

  if (action === 'discoverKhoas') {
    return handleDiscoverKhoas_(body, email);
  }

    var spreadsheetId = assertSpreadsheetId_(body.spreadsheetId);
    if (!spreadsheetId) {
      return jsonOut({ error: 'Thiếu spreadsheetId hoặc idToken.' }, 400);
    }

    var ss = SpreadsheetApp.openById(spreadsheetId);
    ensureTabs_(ss);

    var staffRows = sheetValues_(ss, 'NhanSu');
    var staff = rowsToStaff_(staffRows);
    var nhanSuEmpty = isNhanSuEmpty_(staff);

    if (action === 'getProfile') {
      if (nhanSuEmpty) {
        return jsonOut({
          email: email,
          bootstrapEligible: true,
          updatedAt: metaUpdatedAt_(ss)
        });
      }
      var actorProfile = resolveActor_(email, staff);
      if (!actorProfile.allowed) {
        return jsonOut({ error: 'Email chưa có trong NhanSu. Liên hệ trưởng khoa.' }, 403);
      }
      return jsonOut({
        email: email,
        actor: actorProfile,
        updatedAt: metaUpdatedAt_(ss)
      });
    }

    if (action === 'bootstrap') {
      if (!nhanSuEmpty) {
        return jsonOut({ error: 'Khoa đã có nhân sự trên Sheet. Không thể bootstrap lại.' }, 409);
      }
      var incomingBootstrap = body.tabs || {};
      writeBootstrapTabs_(ss, incomingBootstrap);
      touchMetaUpdatedAt_(ss);
      staffRows = sheetValues_(ss, 'NhanSu');
      staff = rowsToStaff_(staffRows);
      var actorBoot = resolveActor_(email, staff);
      if (!actorBoot.allowed) {
        return jsonOut({ error: 'Bootstrap xong nhưng email chưa có trong NhanSu. Kiểm tra tab NhanSu.' }, 500);
      }
      return jsonOut({ updatedAt: metaUpdatedAt_(ss), actor: actorBoot, email: email });
    }

    var actor = resolveActor_(email, staff);
    if (!actor.allowed) return jsonOut({ error: 'Email chưa có trong NhanSu. Liên hệ trưởng khoa.' }, 403);

    if (action === 'pull') {
      var tabs = {};
      Object.keys(TAB_ACCESS).forEach(function (tabName) {
        var accessId = TAB_ACCESS[tabName];
        if (canSee_(actor, accessId)) tabs[tabName] = sheetValues_(ss, tabName);
      });
      tabs._meta = sheetValues_(ss, '_meta');
      return jsonOut({ tabs: tabs, updatedAt: metaUpdatedAt_(ss), actor: actor });
    }

    if (action === 'push') {
      var incoming = body.tabs || {};
      Object.keys(incoming).forEach(function (tabName) {
        if (tabName === '_meta') return;
        var accessId = TAB_ACCESS[tabName];
        if (!accessId) return;
        if (!canEdit_(actor, accessId)) {
          return;
        }
        var rows = incoming[tabName];
        // BR-304-19: không để local trống xóa loginEmail vừa sửa tay trên Sheet.
        if (tabName === 'NhanSu') {
          rows = mergeNhanSuPreserveLogin_(sheetValues_(ss, 'NhanSu'), rows);
        }
        writeSheet_(ss, tabName, rows);
      });
      touchMetaUpdatedAt_(ss);
      return jsonOut({ updatedAt: metaUpdatedAt_(ss) });
    }

    return jsonOut({ error: 'action không hợp lệ.' }, 400);
  } catch (err) {
    return jsonOut({ error: String(err.message || err) }, 500);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'lichkhoa-sheet-bridge' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * IT: chạy 1 lần từ editor (▶), hoàn tất «Cho phép» → deploy Web App phiên bản mới.
 * Không gọi từ web. Cấp quyền UrlFetchApp (tokeninfo).
 */
function authorizeBridgeOnce() {
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=probe', {
    muteHttpExceptions: true
  });
  Logger.log('authorizeBridgeOnce HTTP ' + res.getResponseCode());
  return 'OK UrlFetchApp';
}

/**
 * IT: chạy 1 lần — cấp quyền SpreadsheetApp.openById (mọi Sheet ID deployer được share).
 * @param {string} spreadsheetId ví dụ 1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8ZM6pS5LZ1Lc
 */
function authorizeSpreadsheetOnce(spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error('Gọi authorizeSpreadsheetOnce("ID_SHEET") — ID trong URL Google Sheet.');
  }
  var ss = SpreadsheetApp.openById(String(spreadsheetId).trim());
  Logger.log('authorizeSpreadsheetOnce opened: ' + ss.getName());
  return 'OK spreadsheets';
}

/**
 * IT: chạy 1 lần — cấp đủ UrlFetchApp + Spreadsheets (khuyến nghị).
 * Sửa SPREADSHEET_ID bên dưới hoặc truyền qua Apps Script → Chạy với tham số.
 */
function authorizeBridgeAllOnce(spreadsheetId) {
  var id = spreadsheetId || '1auPmK3BcgDbHJcVut5SzEMLjQ_VH9wi8ZM6pS5LZ1Lc';
  authorizeBridgeOnce();
  authorizeSpreadsheetOnce(id);
  return 'OK — deploy Web App (New version) rồi test web.';
}

function assertSpreadsheetId_(raw) {
  var id = String(raw || '').trim();
  if (!id) return '';
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(id)) {
    throw new Error('spreadsheetId không hợp lệ — chỉ dùng ID hoặc link .../spreadsheets/d/ID/...');
  }
  return id;
}

function jsonOut(obj, status) {
  var out = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return out;
}

function verifyIdToken_(idToken) {
  var resp = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );
  var code = resp.getResponseCode();
  var text = resp.getContentText() || '';
  if (code !== 200) {
    var hint = 'Google token không hợp lệ.';
    try {
      var err = JSON.parse(text);
      if (err.error_description) hint = String(err.error_description);
      else if (err.error) hint = String(err.error);
    } catch (e) { /* keep default */ }
    if (/^invalid value$/i.test(hint)) {
      hint =
        'Token Google hết hạn hoặc sai Client ID — đăng xuất web, đăng nhập lại Google; ' +
        'VITE_GOOGLE_CLIENT_ID (Pages) phải trùng OAuth Web client nút đăng nhập.';
    }
    if (/api key/i.test(hint)) {
      throw new Error(
        'Apps Script chưa liên kết Google Cloud project (cùng OAuth Web client). ' +
          'Apps Script → Cài đặt dự án → Google Cloud Platform → chọn project OAuth. ' +
          'Deploy lại Web App sau khi dán Code.gs từ repo.'
      );
    }
    throw new Error(hint);
  }
  var data = JSON.parse(text);
  var expectedAud = String(
    PropertiesService.getScriptProperties().getProperty('GOOGLE_OAUTH_CLIENT_ID') || ''
  ).trim();
  if (expectedAud && data.aud && data.aud !== expectedAud) {
    throw new Error('Token không khớp Client ID OAuth (aud). Kiểm tra VITE_GOOGLE_CLIENT_ID.');
  }
  if (!data.email || data.email_verified !== 'true') {
    throw new Error('Email Google chưa xác minh hoặc thiếu trong token.');
  }
  return String(data.email).toLowerCase();
}

function ensureTabs_(ss) {
  REQUIRED_TABS.forEach(function (name) {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });
  ['LichNghi', 'LichHoc', 'Dashboard'].forEach(function (name) {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });
}

function isNhanSuEmpty_(staff) {
  return !staff || staff.length === 0;
}

function isCatalogActive_(value) {
  var v = String(value || '').trim().toLowerCase();
  if (!v || v === '0' || v === 'no' || v === 'false') return false;
  return v === '1' || v === 'yes' || v === 'true' || v === 'y';
}

function readKhoaCatalogRows_(catalogSs) {
  var sh = catalogSs.getSheetByName(KHOA_CATALOG_TAB);
  if (!sh) throw new Error('Tab KhoaCatalog không tồn tại trên file danh mục.');
  var rows = sheetValues_(catalogSs, KHOA_CATALOG_TAB);
  if (!rows || rows.length < 2) return [];
  var headers = rows[0].map(function (h) { return String(h || '').trim().toLowerCase(); });
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    headers.forEach(function (h, idx) {
      if (h) obj[h] = row[idx];
    });
    var sid = assertSpreadsheetId_(obj.spreadsheetid || obj.spreadsheet_id || obj.sheetid || obj.sheet_id || '');
    if (!sid) continue;
    if (!isCatalogActive_(obj.active !== undefined && obj.active !== '' ? obj.active : 'yes')) continue;
    var slug = String(obj.slug || '').trim().toLowerCase();
    var label = String(obj.label || obj.name || slug || '').trim();
    if (!slug) slug = 'khoa-' + sid.slice(-8);
    if (!label) label = slug;
    list.push({ slug: slug, label: label, spreadsheetId: sid });
  }
  return list;
}

function emailHasKhoaAccess_(targetSpreadsheetId, email) {
  try {
    var ss = SpreadsheetApp.openById(targetSpreadsheetId);
    var staff = rowsToStaff_(sheetValues_(ss, 'NhanSu'));
    if (isNhanSuEmpty_(staff)) return null;
    var actor = resolveActor_(email, staff);
    if (!actor.allowed) return null;
    return { actorKind: actor.kind };
  } catch (err) {
    return null;
  }
}

function handleDiscoverKhoas_(body, email) {
  var catalogId = assertSpreadsheetId_(body.catalogSpreadsheetId);
  if (!catalogId) {
    return jsonOut({ error: 'Thiếu catalogSpreadsheetId.' }, 400);
  }
  var offset = Math.max(0, parseInt(body.offset, 10) || 0);
  var limit = Math.min(60, Math.max(1, parseInt(body.limit, 10) || 40));

  var catalogSs = SpreadsheetApp.openById(catalogId);
  var allRows = readKhoaCatalogRows_(catalogSs);
  var slice = allRows.slice(offset, offset + limit);
  var khoas = [];

  slice.forEach(function (entry) {
    var access = emailHasKhoaAccess_(entry.spreadsheetId, email);
    if (!access) return;
    khoas.push({
      slug: entry.slug,
      label: entry.label,
      spreadsheetId: entry.spreadsheetId,
      actorKind: access.actorKind
    });
  });

  var nextOffset = offset + limit < allRows.length ? offset + limit : null;
  return jsonOut({
    email: email,
    khoas: khoas,
    nextOffset: nextOffset,
    catalogRows: allRows.length,
    scannedFrom: offset,
    scannedCount: slice.length
  });
}

function writeBootstrapTabs_(ss, incoming) {
  Object.keys(incoming).forEach(function (tabName) {
    var rows = incoming[tabName];
    if (!rows || !rows.length) return;
    writeSheet_(ss, tabName, rows);
  });
}

function sheetValues_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) return [];
  var range = sh.getDataRange();
  if (!range) return [];
  return normalizeSheetCellDates_(range.getValues());
}

/** Date → YYYY-MM-DD (Asia/Bangkok) để FE/input type=date không nhận ISO T17:00Z. */
function ymdBangkok_(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return d;
  return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
}

function normalizeSheetCellDates_(rows) {
  if (!rows || !rows.length) return rows;
  return rows.map(function (row) {
    return row.map(function (cell) {
      return cell instanceof Date ? ymdBangkok_(cell) : cell;
    });
  });
}

function writeSheet_(ss, name, rows) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var existing = sh.getDataRange().getValues();
  var existingData = existing.length > 1 ? existing.length - 1 : 0;
  var incomingRows = rows && rows.length ? rows.length : 0;
  var incomingData = incomingRows > 1 ? incomingRows - 1 : 0;
  // Không xóa dữ liệu Sheet khi client chỉ gửi header / tab trống.
  if (existingData > 0 && incomingData === 0) return;
  sh.clearContents();
  if (!rows || !rows.length) return;
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * BR-304-19 — giữ loginEmail trên Sheet khi client push chuỗi trống.
 * Sentinel `-` = gỡ liên kết có chủ đích → ghi trống.
 */
function mergeNhanSuPreserveLogin_(existingRows, incomingRows) {
  if (!incomingRows || !incomingRows.length) return incomingRows;
  if (!existingRows || existingRows.length < 2) return incomingRows;
  var exHeaders = existingRows[0].map(function (h) { return String(h || '').trim(); });
  var inHeaders = incomingRows[0].map(function (h) { return String(h || '').trim(); });
  var exIdIdx = exHeaders.indexOf('id');
  var exLoginIdx = exHeaders.indexOf('loginEmail');
  var inIdIdx = inHeaders.indexOf('id');
  var inLoginIdx = inHeaders.indexOf('loginEmail');
  if (exIdIdx < 0 || exLoginIdx < 0 || inIdIdx < 0 || inLoginIdx < 0) return incomingRows;

  var keep = {};
  for (var i = 1; i < existingRows.length; i++) {
    var id = String(existingRows[i][exIdIdx] || '').trim();
    var login = String(existingRows[i][exLoginIdx] || '').trim();
    if (id && login && login !== '-') keep[id] = login;
  }

  var out = [incomingRows[0]];
  for (var j = 1; j < incomingRows.length; j++) {
    var row = incomingRows[j].slice();
    while (row.length < inHeaders.length) row.push('');
    var rid = String(row[inIdIdx] || '').trim();
    var rlogin = String(row[inLoginIdx] || '').trim();
    if (rlogin === '-') {
      row[inLoginIdx] = '';
    } else if (!rlogin && keep[rid]) {
      row[inLoginIdx] = keep[rid];
    }
    out.push(row);
  }
  return out;
}

/**
 * Simple trigger: sửa NhanSu trên Sheet → bump _meta.updatedAt
 * (FE bỏ push cũ / kéo lại loginEmail). Cài: Triggers → onEdit → From spreadsheet → On edit.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    if (e.range.getSheet().getName() !== 'NhanSu') return;
    touchMetaUpdatedAt_(e.source);
  } catch (err) { /* ignore */ }
}

function rowsToStaff_(rows) {
  if (!rows || rows.length < 2) return [];
  var headers = rows[0].map(function (h) { return String(h || '').trim(); });
  var list = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    headers.forEach(function (h, idx) { if (h) obj[h] = row[idx]; });
    if (obj.id) list.push(obj);
  }
  return list;
}

function findStaff_(email, staff) {
  var e = String(email || '').toLowerCase();
  for (var i = 0; i < staff.length; i++) {
    var s = staff[i];
    var login = String(s.loginEmail || '').trim().toLowerCase();
    if (login === '-') login = '';
    var em = String(s.email || '').trim().toLowerCase();
    if (login === e || (!login && em === e)) return s;
  }
  return null;
}

function resolveActor_(email, staff) {
  var s = findStaff_(email, staff);
  if (!s) return { allowed: false, kind: 'guest' };
  var role = String(s.accessRole || '').trim().toLowerCase();
  // Khớp access.js: accessRole trống (Sheet cũ) = quản trị, không phải member.
  if (role !== 'member') {
    return { allowed: true, kind: 'admin', staffId: s.id, access: fullAccess_() };
  }
  return {
    allowed: true,
    kind: 'member',
    staffId: s.id,
    access: {
      week: s.access_week || 'edit',
      month: s.access_month || 'view',
      leave: s.access_leave || 'edit',
      study: s.access_study || 'view',
      calendar: s.access_calendar || 'view',
      dashboard: s.access_dashboard || 'none',
      staff: s.access_staff || 'none',
      tasks: s.access_tasks || 'none'
    }
  };
}

function fullAccess_() {
  return {
    week: 'edit', month: 'edit', leave: 'edit', study: 'edit',
    calendar: 'edit', dashboard: 'edit', staff: 'edit', tasks: 'edit'
  };
}

function canSee_(actor, tab) {
  if (actor.kind === 'admin') return true;
  var level = actor.access[tab];
  return level === 'view' || level === 'edit';
}

function canEdit_(actor, tab) {
  if (actor.kind === 'admin') return true;
  return actor.access[tab] === 'edit';
}

function metaUpdatedAt_(ss) {
  var sh = ss.getSheetByName('_meta');
  if (!sh) return '';
  var data = sh.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === 'updatedAt') return String(data[i][1] || '');
  }
  return '';
}

function touchMetaUpdatedAt_(ss) {
  var sh = ss.getSheetByName('_meta') || ss.insertSheet('_meta');
  var data = sh.getDataRange().getValues();
  var now = new Date().toISOString();
  var found = false;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === 'updatedAt') {
      sh.getRange(i + 1, 2).setValue(now);
      found = true;
      break;
    }
  }
  if (!found) sh.appendRow(['updatedAt', now]);
}
