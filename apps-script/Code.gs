/**
 * 學派統合 Web App —— 貼到 master 試算表 Apps Script 後「部署 → 新部署 → 網頁應用程式」
 * 執行身分：我
 * 存取權：任何人
 *
 * 然後把部署網址貼進 GitHub Pages 的 assets/config.js → webAppUrl
 */

var MASTER_ID = '1lBDzpsWRfRiL2Bi1wR5jkeDEfZJKPz-loS3m24q0esc';
var PORTAL_URL = 'https://me0wx-lr.github.io/school-application-portal/';

function master_() {
  try {
    var active = SpreadsheetApp.getActive();
    if (active && active.getId() === MASTER_ID) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(MASTER_ID);
}

function onOpen() {
  SpreadsheetApp.getActive().addMenu('學派統合', [
    {name: '健康檢查', functionName: 'healthCheck'},
    {name: '寫入一筆測試申請', functionName: 'testDummyApplication'},
    {name: '複製驗算公式', functionName: 'fillFormulas'},
    {name: '發布已核准的初創申請', functionName: 'publishApproved'}
  ]);
}

function alert_(msg) {
  try { SpreadsheetApp.getUi().alert(String(msg).slice(0, 1800)); }
  catch (e) { Logger.log(msg); }
}

function healthCheck() {
  var ss = master_();
  var lines = ['試算表：' + ss.getName(), 'Web App 請用「部署 → 網頁應用程式」'];
  ['說明', '學派表', '學派卡', '申請', '魔法目錄'].forEach(function (n) {
    var sh = ss.getSheetByName(n);
    lines.push(n + '：' + (sh ? '有' : '缺'));
  });
  alert_(lines.join('\n'));
}

function jsonp_(e, obj) {
  var body = JSON.stringify(obj);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[A-Za-z_][A-Za-z0-9_]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  e = e || {parameter: {}};
  var action = e.parameter.action || 'schools';
  try {
    if (action === 'health') return jsonp_(e, {ok: true, sheet: master_().getName()});
    if (action === 'schools') return jsonp_(e, {ok: true, schools: listSchools_()});
    return jsonp_(e, {ok: false, error: 'unknown action'});
  } catch (err) {
    return jsonp_(e, {ok: false, error: String(err.message || err)});
  }
}

function listSchools_() {
  var sh = master_().getSheetByName('學派表');
  var values = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 8).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var name = String(values[i][0] || '').trim();
    if (!name) continue;
    var status = String(values[i][7] || '');
    if (status === '停用') continue;
    out.push({
      name: name,
      creed: values[i][1],
      magic: values[i][2],
      note: values[i][3],
      source: values[i][4] || '',
      manager: values[i][5] || '',
      學派: name,
      信條: values[i][1],
      學派魔法: values[i][2],
      特記事項: values[i][3],
      來源: values[i][4]
    });
  }
  return out;
}

function doPost(e) {
  var ret = PORTAL_URL + 'apply.html';
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    if (p['return'] && String(p['return']).indexOf('github.io') >= 0) {
      ret = String(p['return']);
    }
    var map = {};
    Object.keys(p).forEach(function (k) { map[k] = p[k]; });
    writeApplicationRow_(map, p.email || p.電子信箱 || '');
    return htmlRedirect_(ret + (ret.indexOf('?') >= 0 ? '&' : '?') + 'ok=1');
  } catch (err) {
    return htmlRedirect_(ret + (ret.indexOf('?') >= 0 ? '&' : '?') + 'err=' + encodeURIComponent(String(err.message || err)));
  }
}

function htmlRedirect_(url) {
  var safe = String(url).replace(/'/g, '%27');
  return HtmlService.createHtmlOutput(
    '<!doctype html><meta charset="utf-8"><p>正在返回入口……</p>' +
    '<script>location.replace(\'' + safe + '\');</script>' +
    '<p><a href="' + safe.replace(/"/g, '&quot;') + '">若未自動跳轉請點這裡</a></p>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function g_(map, title) {
  var x = map[title];
  if (x === null || x === undefined || x === '') return '';
  if (Object.prototype.toString.call(x) === '[object Array]') {
    return x.filter(Boolean).join('、');
  }
  return x;
}

function writeApplicationRow_(map, email) {
  var ss = master_();
  var sh = ss.getSheetByName('申請');
  var row = [
    new Date(),
    email || '',
    g_(map, '申請類型') || '學派初創',
    g_(map, '管理人'),
    g_(map, '聯絡方式'),
    g_(map, 'PC名'),
    g_(map, '學派名'),
    g_(map, '信條'),
    g_(map, '誕生背景'),
    g_(map, '誕生背景補述'),
    g_(map, '代表性的構成成員'),
    g_(map, '其他設定'),
    g_(map, '免費藏書分類'),
    g_(map, '免費藏書序號'),
    g_(map, '是否追加第二本'),
    g_(map, '追加藏書分類'),
    g_(map, '追加藏書序號'),
    g_(map, '追加魔法是否已由本學派PC習得'),
    g_(map, '優勢'),
    g_(map, '備品魔素'),
    g_(map, '備品道具名'),
    g_(map, '備品道具功績點'),
    g_(map, '專業性判定'),
    g_(map, '獨有體系'),
    g_(map, '世界法則阻礙'),
    g_(map, '學派特性預兆'),
    g_(map, '劣勢'),
    g_(map, '限制領域'),
    g_(map, '限制樣式'),
    g_(map, '藏書缺失種類'),
    g_(map, '學派病名稱'),
    g_(map, '學派病強度'),
    g_(map, '運營_目標學派'),
    g_(map, '運營_獲得條件'),
    g_(map, '運營_獲得點數'),
    g_(map, '運營_升級'),
    (g_(map, '申請備註') ? g_(map, '申請備註') + ' ' : '') + '[portal]'
  ];
  var last = sh.getLastRow();
  if (last >= 3) {
    var prev = sh.getRange(last, 1, 1, 7).getValues()[0];
    var recent = prev[0] instanceof Date && (new Date().getTime() - prev[0].getTime()) < 90000;
    if (recent && String(prev[3]) === String(row[3]) && String(prev[6]) === String(row[6])) {
      return last;
    }
  }
  var dest = Math.max(last + 1, 3);
  sh.getRange(dest, 1, 1, row.length).setValues([row]);
  sh.getRange('AL2:AW2').copyTo(sh.getRange(dest, 38, 1, 12), {contentsOnly: false});
  return dest;
}

function testDummyApplication() {
  var dest = writeApplicationRow_({
    '申請類型': '學派初創',
    '管理人': '測試管理人',
    '學派名': '測試學派甲',
    '信條': '測試用信條，請之後刪除。',
    '誕生背景': '6 拼湊（失去居所者集合）',
    '免費藏書分類': '學派魔法',
    '免費藏書序號': '5013',
    '是否追加第二本': '否',
    '優勢': '專業性（COST 3）',
    '專業性判定': '抵抗判定',
    '劣勢': '封建（COST 3）'
  }, 'test@local');
  alert_('已寫入申請第 ' + dest + ' 列。測試列請勿發布。');
}

function fillFormulas() {
  var sh = master_().getSheetByName('申請');
  var last = sh.getLastRow();
  if (last < 3) { alert_('尚無需要填滿的列。'); return; }
  sh.getRange('AL2:AW2').copyTo(sh.getRange('AL3:AW' + last), {contentsOnly: false});
}

function col_(sh, header) {
  var heads = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  for (var i = 0; i < heads.length; i++) {
    if (String(heads[i]) === header) return i + 1;
  }
  throw new Error('找不到欄：' + header);
}

function nextSchoolId_(ss) {
  var sh = ss.getSheetByName('學派卡');
  var last = sh.getLastRow();
  var n = 0;
  if (last >= 3) {
    var ids = sh.getRange(3, 1, last - 2, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var m = String(ids[i][0] || '').match(/CUS-(\d+)/);
      if (m) n = Math.max(n, parseInt(m[1], 10));
    }
  }
  return 'CUS-' + ('000' + (n + 1)).slice(-3);
}

function publishApproved() {
  var ss = master_();
  var apply = ss.getSheetByName('申請');
  var last = apply.getLastRow();
  if (last < 2) { alert_('沒有申請列。'); return; }
  var cStatus = col_(apply, '驗證結果');
  var published = 0, skipped = 0;
  for (var r = 2; r <= last; r++) {
    var status = String(apply.getRange(r, cStatus).getValue());
    if (status !== '待審核') continue;
    var type = String(apply.getRange(r, col_(apply, '申請類型')).getValue());
    var msg = String(apply.getRange(r, col_(apply, '驗證訊息')).getValue());
    var name = String(apply.getRange(r, col_(apply, '學派名')).getValue());
    if (name.indexOf('測試') === 0 || type !== '學派初創' || msg !== '通過') { skipped++; continue; }
    publishFoundingRow_(ss, apply, r);
    apply.getRange(r, cStatus).setValue('已發布');
    published++;
  }
  alert_('已發布 ' + published + ' 筆。略過 ' + skipped + ' 筆。');
}

function publishFoundingRow_(ss, apply, r) {
  var get = function (h) { return apply.getRange(r, col_(apply, h)).getValue(); };
  var name = String(get('學派名')).trim();
  var list = ss.getSheetByName('學派表');
  var existing = list.getRange('A2:A').getValues().map(function (row) { return String(row[0]); });
  if (existing.indexOf(name) >= 0) throw new Error('學派名已存在：' + name);
  var sid = nextSchoolId_(ss);
  var creed = String(get('信條'));
  var books = String(get('藏書顯示草稿'));
  var notes = String(get('特記顯示草稿'));
  var manager = String(get('管理人'));
  var remain = get('剩餘功績點');
  var now = new Date();
  var nextList = Math.max(list.getLastRow() + 1, 17);
  list.getRange(nextList, 1, 1, 10).setValues([[
    name, creed, books, notes, '自創', manager, 1, '生效中', sid, now
  ]]);
  var card = ss.getSheetByName('學派卡');
  var cr = Math.max(card.getLastRow() + 1, 3);
  card.getRange(cr, 1, 1, 24).setValues([[
    sid, name, manager, creed, get('誕生背景'), get('誕生背景補述'),
    get('代表性的構成成員'), get('其他設定'),
    1, 1, 2, 3,
    remain, 3, 3 - Number(remain || 0),
    books, notes,
    get('優勢') && String(get('優勢')) !== '不選擇優勢' ? 1 : 0,
    get('劣勢') && String(get('劣勢')) !== '不選擇劣勢' ? 1 : 0,
    '生效中', get('申請ID'), now, Session.getActiveUser().getEmail(), ''
  ]]);
  var det = ss.getSheetByName('藏書明細');
  if (get('免費藏書序號')) appendBook_(det, sid, name, get('免費藏書序號'), '初創免費', 0, now);
  if (String(get('是否追加第二本')) === '是' && get('追加藏書序號')) {
    appendBook_(det, sid, name, get('追加藏書序號'), '追加', get('追加藏書COST'), now);
  }
  var spec = ss.getSheetByName('特記明細');
  if (String(get('優勢')) && String(get('優勢')) !== '不選擇優勢') {
    spec.appendRow([sid, name, String(get('優勢')), '優勢', get('優勢COST'), '', notes, '生效中', now]);
  }
  if (String(get('劣勢')) && String(get('劣勢')) !== '不選擇劣勢') {
    spec.appendRow([sid, name, String(get('劣勢')), '劣勢', get('劣勢COST'), '', notes, '生效中', now]);
  }
  var flow = ss.getSheetByName('功績點流水');
  flow.appendRow([now, sid, name, '初創授予', '起始', 3, 3, get('申請ID'), '', manager]);
}

function appendBook_(det, sid, name, mid, how, cost, now) {
  var dir = master_().getSheetByName('魔法目錄');
  var data = dir.getRange(2, 1, Math.max(dir.getLastRow() - 1, 1), 12).getValues();
  var zh = '', cat = '', pack = '';
  var idNum = Number(mid);
  for (var i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === idNum) {
      zh = data[i][2]; cat = data[i][9]; pack = data[i][8]; break;
    }
  }
  det.appendRow([sid, name, idNum, zh, zh ? ('【' + zh + '】') : ('序號' + mid), cat, how, cost, pack, '生效中', now]);
}
