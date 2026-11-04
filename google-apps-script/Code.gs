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

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action;
    var spreadsheetId = body.spreadsheetId;
    var idToken = body.idToken;
    if (!spreadsheetId || !idToken) {
      return jsonOut({ error: 'Thiếu spreadsheetId hoặc idToken.' }, 400);
    }
    var email = verifyIdToken_(idToken);
    if (!email) return jsonOut({ error: 'Google token không hợp lệ.' }, 401);

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
          throw new Error('Không có quyền sửa tab ' + tabName);
        }
        writeSheet_(ss, tabName, incoming[tabName]);
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
  if (resp.getResponseCode() !== 200) return null;
  var data = JSON.parse(resp.getContentText());
  if (!data.email || data.email_verified !== 'true') return null;
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
  return range.getValues();
}

function writeSheet_(ss, name, rows) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  if (!rows || !rows.length) return;
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
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
    var em = String(s.email || '').trim().toLowerCase();
    if (login === e || (!login && em === e)) return s;
  }
  return null;
}

function resolveActor_(email, staff) {
  var s = findStaff_(email, staff);
  if (!s) return { allowed: false, kind: 'guest' };
  var role = String(s.accessRole || '').trim().toLowerCase();
  if (role && role !== 'member') {
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
