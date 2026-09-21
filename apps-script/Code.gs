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
    {name: '重整魔法目錄分類', functionName: 'rebuildMagicCatalog'},
    {name: '重新驗算申請列', functionName: 'fillFormulas'},
    {name: '發布目前選取的一列', functionName: 'publishSelected'},
    {name: '發布所有待審的初創申請', functionName: 'publishApproved'},
    {name: '發布所有待審的運營申請', functionName: 'publishOps'},
    {name: '重整審核表', functionName: 'rebuildReviewTab'},
    {name: '設定核准GM名稱與聯絡', functionName: 'setApproverName'},
    {name: '回填學派表核准GM', functionName: 'backfillApprover'}
  ]);
  try { maybeFixMagicCatalog_(); } catch (e) { Logger.log(e); }
}

function maybeFixMagicCatalog_() {
  var sh = master_().getSheetByName('魔法目錄');
  if (!sh) return;
  var last = sh.getLastRow();
  if (last < 2) return;
  var data = sh.getRange(2, 1, Math.min(last - 1, 800), 10).getValues();
  for (var i = 0; i < data.length; i++) {
    var n = Number(data[i][0]);
    if (!n) continue;
    if (String(data[i][9] || '') !== catFromId_(n)) {
      rebuildMagicCatalog_(true);
      return;
    }
  }
}

function rebuildMagicCatalog() {
  rebuildMagicCatalog_(false);
}

function rebuildMagicCatalog_(silent) {
  var sh = master_().getSheetByName('魔法目錄');
  if (!sh) throw new Error('沒有魔法目錄');
  var last = sh.getLastRow();
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  var out = [];
  for (var i = 0; i < ids.length; i++) {
    var n = Number(ids[i][0]);
    var cat = n ? catFromId_(n) : '';
    out.push([cat, n && isFoundingFree_(n) ? '是' : '否', n ? '是' : '']);
  }
  sh.getRange(2, 10, out.length, 3).setValues(out);
  var opt = master_().getSheetByName('規則選項');
  if (opt) {
    var cats = ['泛用魔法', '經歷魔法', '機關魔法', '學派魔法', '餐飲魔法', '醫療魔法', '遺失魔法', '禁書魔法', '種族魔法'];
    opt.getRange('D1').setValue('免費／追加藏書分類');
    opt.getRange('D2:D30').clearContent();
    opt.getRange(2, 4, cats.length, 1).setValues(cats.map(function (c) { return [c]; }));
  }
  if (!silent) alert_('已更新「魔法目錄」藏書分類 ' + out.length + ' 筆。蒐集／黃昏只當來源包，分類與新約相同。');
}

function alert_(msg) {
  try { SpreadsheetApp.getUi().alert(String(msg).slice(0, 1800)); }
  catch (e) { Logger.log(msg); }
}

function reviewQuery_() {
  return '=QUERY(申請!A3:AW500,"select Col38,Col1,Col3,Col4,Col7,Col8,Col48,Col47,Col44,Col40 where Col1 is not null",0)';
}

function rebuildReviewTab() {
  var ss = master_();
  var sh = ss.getSheetByName('審核');
  if (!sh) throw new Error('沒有「審核」工作表');
  sh.getRange('A5:J500').clearContent();
  sh.getRange('A2').setValue('A–J 是自動列表，不要在裡面打字。退回／發布請用 K 欄。');
  sh.getRange('A4:K4').setValues([[
    '申請ID', '時間', '申請類型', '管理人', '學派名', '信條',
    '藏書顯示草稿', '特記顯示草稿', '剩餘功績點', '驗證訊息', '動作'
  ]]);
  sh.getRange('A5').setFormula(reviewQuery_());
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(['發布', '退回'], true).setAllowInvalid(false).build();
  sh.getRange('K5:K200').setDataValidation(rule);
  fillFormulas();
  alert_('已重整「審核」。A–J 不要輸入。要退回或發布，在 K 欄選「退回」或「發布」。');
}

function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() === '申請') {
    var ar = e.range.getRow();
    if (ar < 3) return;
    var header = String(sh.getRange(1, e.range.getColumn()).getValue() || '');
    var v = String(e.value || '').trim();
    if ((header === '驗證結果' || header === 'GM決定') && (v === '退回' || v === '拒絕')) {
      markRejected_(sh, ar);
    }
    return;
  }
  if (sh.getName() !== '審核') return;
  var row = e.range.getRow();
  var col = e.range.getColumn();
  if (row < 5) return;
  if (col <= 10) {
    sh.getRange('A5').setFormula(reviewQuery_());
    return;
  }
  if (col !== 11) return;
  var action = String(e.value || '');
  var apply = e.source.getSheetByName('申請');
  var target = findApplyRow_(apply, sh.getRange(row, 1).getValue(), sh.getRange(row, 5).getValue());
  e.range.setValue('');
  if (!target) return;
  var cStatus = col_(apply, '驗證結果');
  if (action === '退回') {
    markRejected_(apply, target);
    return;
  }
  if (action === '發布') {
    try {
      if (isFrozenStatus_(gmStatus_(apply, target)) && gmStatus_(apply, target) !== '已發布') {
        return;
      }
      var type = String(apply.getRange(target, col_(apply, '申請類型')).getValue());
      if (type === '學派初創') publishFoundingRow_(e.source, apply, target);
      else publishOpsRow_(e.source, apply, target);
      markPublished_(apply, target);
    } catch (err) {
      apply.getRange(target, cStatus).setNote(String(err.message || err));
    }
  }
}

function findApplyRow_(apply, appId, schoolName) {
  var last = apply.getLastRow();
  if (last < 3) return 0;
  var cId = col_(apply, '申請ID');
  var cName = col_(apply, '學派名');
  var ids = apply.getRange(3, cId, last - 2, 1).getValues();
  var names = apply.getRange(3, cName, last - 2, 1).getValues();
  var id = String(appId || '');
  var name = String(schoolName || '');
  for (var i = 0; i < ids.length; i++) {
    if (id && String(ids[i][0]) === id) return i + 3;
  }
  for (var j = 0; j < names.length; j++) {
    if (name && String(names[j][0]) === name) return j + 3;
  }
  return 0;
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
    if (action === 'cards') return jsonp_(e, {ok: true, cards: listCards_()});
    if (action === 'submit' || e.parameter['學派名'] || e.parameter['管理人']) {
      return handleSubmit_(e.parameter);
    }
    return jsonp_(e, {ok: false, error: 'unknown action'});
  } catch (err) {
    return jsonp_(e, {ok: false, error: String(err.message || err)});
  }
}

function isSchoolName_(name) {
  name = String(name || '').trim();
  if (!name) return false;
  if (/[↑⬆⇧]/.test(name)) return false;
  if (/官方\s*15/.test(name)) return false;
  if (/占位|不要手寫|請自行|Apps Script|追加在第/.test(name)) return false;
  return true;
}

function schoolListRows_(sh) {
  var last = Math.max(sh.getLastRow(), 2);
  var rows = [];
  for (var r = 2; r <= last; r++) rows.push(r);
  return rows;
}

function nextCustomSchoolRow_(list) {
  var last = Math.max(list.getLastRow(), 16);
  for (var r = 17; r <= last + 5; r++) {
    var v = String(list.getRange(r, 1).getValue() || '').trim();
    if (!v) return r;
  }
  return last + 1;
}

function ensureApproverCells_() {
  var sh = master_().getSheetByName('說明');
  if (!sh) return;
  sh.getRange('A30').setValue('預設核准GM');
  sh.getRange('A31').setValue('核准GM聯絡方法');
}

function setApproverName() {
  var ui = SpreadsheetApp.getUi();
  ensureApproverCells_();
  var res = ui.prompt('核准 GM 顯示名稱', '寫進學派表 K 欄「核准GM」。現在：' + (gmIdentity_() || '（空白）'), ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var name = String(res.getResponseText() || '').trim();
  if (!name) { alert_('未輸入名稱。'); return; }
  var res2 = ui.prompt('核准 GM 聯絡方法', 'Discord / WhatsApp / 電郵等。現在：' + (gmContact_() || '（空白）'), ui.ButtonSet.OK_CANCEL);
  var contact = '';
  if (res2.getSelectedButton() === ui.Button.OK) contact = String(res2.getResponseText() || '').trim();
  var props = PropertiesService.getDocumentProperties();
  props.setProperty('approverName', name);
  props.setProperty('approverContact', contact);
  var sh = master_().getSheetByName('說明');
  if (sh) {
    sh.getRange('B30').setValue(name);
    sh.getRange('B31').setValue(contact);
  }
  alert_('核准GM：' + name + '\n聯絡：' + (contact || '（未填）') + '\n請再執行「回填學派表核准GM」。');
}

function gmIdentity_() {
  var named = '';
  try { named = PropertiesService.getDocumentProperties().getProperty('approverName') || ''; } catch (e) {}
  if (!named) {
    var sh = master_().getSheetByName('說明');
    if (sh) named = String(sh.getRange('B30').getValue() || '').trim();
  }
  var email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e2) {}
  if (!email) {
    try { email = Session.getEffectiveUser().getEmail() || ''; } catch (e3) {}
  }
  if (named && email && named.indexOf(email) < 0) return named;
  return named || email || '';
}

function gmContact_() {
  var c = '';
  try { c = PropertiesService.getDocumentProperties().getProperty('approverContact') || ''; } catch (e) {}
  if (c) return c;
  var sh = master_().getSheetByName('說明');
  if (sh) c = String(sh.getRange('B31').getValue() || '').trim();
  if (c) return c;
  try { return Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (e2) { return ''; }
}

function backfillApprover() {
  var label = gmIdentity_();
  if (!label) {
    setApproverName();
    label = gmIdentity_();
  }
  if (!label) { alert_('仍沒有核准GM名稱。請先「設定核准GM顯示名稱」。'); return; }
  var list = master_().getSheetByName('學派表');
  ensureSchoolListHeaders_(list);
  var card = master_().getSheetByName('學派卡');
  var cardMap = {};
  if (card && card.getLastRow() >= 3) {
    var cv = card.getRange(3, 1, card.getLastRow() - 2, 23).getValues();
    for (var i = 0; i < cv.length; i++) {
      var n = String(cv[i][1] || '').trim();
      if (n) cardMap[n] = String(cv[i][22] || '').trim();
    }
  }
  var rows = schoolListRows_(list);
  var n = 0;
  for (var j = 0; j < rows.length; j++) {
    var r = rows[j];
    var name = String(list.getRange(r, 1).getValue() || '').trim();
    if (!isSchoolName_(name)) continue;
    if (String(list.getRange(r, 5).getValue() || '') === '官方') continue;
    var cur = String(list.getRange(r, 11).getValue() || '').trim();
    var curC = String(list.getRange(r, 12).getValue() || '').trim();
    if (!cur) {
      var fromCard = cardMap[name];
      list.getRange(r, 11).setValue(fromCard || label);
    }
    if (!curC) list.getRange(r, 12).setValue(gmContact_());
    n++;
  }
  alert_('已回填 ' + n + ' 列核准GM／聯絡方法。');
}

function ensureSchoolListHeaders_(sh) {
  var heads = ['學派', '信條', '學派魔法', '特記事項', '來源', '管理人', '學派等級', '狀態', '學派ID', '最後更新', '核准GM', '核准GM聯絡方法'];
  sh.getRange(1, 1, 1, heads.length).setValues([heads]);
}

function listSchools_() {
  var sh = master_().getSheetByName('學派表');
  ensureSchoolListHeaders_(sh);
  var out = [];
  var rows = schoolListRows_(sh);
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var row = sh.getRange(r, 1, 1, 12).getValues()[0];
    var name = String(row[0] || '').trim();
    if (!isSchoolName_(name)) continue;
    if (String(row[7] || '') === '停用') continue;
    var approver = String(row[10] || '').trim();
    var contact = String(row[11] || '').trim();
    if (!approver && String(row[4] || '') === '自創') {
      approver = String(cardApprover_(name) || '').trim();
    }
    out.push({
      name: name,
      creed: row[1],
      magic: row[2],
      note: row[3],
      source: row[4] || '',
      manager: row[5] || '',
      approver: approver,
      contact: contact,
      學派: name,
      信條: row[1],
      學派魔法: row[2],
      特記事項: row[3],
      來源: row[4],
      管理人: row[5] || '',
      核准GM: approver,
      核准GM聯絡方法: contact
    });
  }
  return out;
}

function cardApprover_(schoolName) {
  var card = master_().getSheetByName('學派卡');
  if (!card || card.getLastRow() < 3) return '';
  var cv = card.getRange(3, 2, card.getLastRow() - 2, 22).getValues();
  for (var i = 0; i < cv.length; i++) {
    if (String(cv[i][0] || '').trim() === schoolName) return String(cv[i][21] || '');
  }
  return '';
}

function listCards_() {
  var sh = master_().getSheetByName('學派卡');
  var last = sh.getLastRow();
  if (last < 3) return [];
  var values = sh.getRange(3, 1, last - 2, 20).getValues();
  var books = bookCounts_();
  var byName = {};
  var order = [];
  for (var i = 0; i < values.length; i++) {
    var name = String(values[i][1] || '').trim();
    if (!isSchoolName_(name)) continue;
    if (String(values[i][19]) === '停用') continue;
    var sid = String(values[i][0] || '');
    var bc = books[sid] || {n: 0, exp: 0, org: 0};
    var card = {
      id: sid,
      name: name,
      manager: values[i][2],
      level: Number(values[i][8]) || 1,
      remain: Number(values[i][12]) || 0,
      books: bc.n || Number(values[i][9]) || 1,
      maxBooks: Number(values[i][10]) || 2,
      cap: Number(values[i][11]) || 3,
      adv: Number(values[i][17]) || 0,
      dis: Number(values[i][18]) || 0,
      expCount: bc.exp,
      orgCount: bc.org
    };
    if (!byName[name]) order.push(name);
    byName[name] = card;
  }
  return order.map(function (n) { return byName[n]; });
}

function bookCounts_() {
  var sh = master_().getSheetByName('藏書明細');
  var last = sh.getLastRow();
  var map = {};
  if (last < 2) return map;
  var values = sh.getRange(2, 1, last - 1, 6).getValues();
  for (var i = 0; i < values.length; i++) {
    var sid = String(values[i][0] || '');
    if (!sid) continue;
    if (!map[sid]) map[sid] = {n: 0, exp: 0, org: 0};
    map[sid].n++;
    var cat = String(values[i][5] || '');
    if (cat.indexOf('經歷') >= 0) map[sid].exp++;
    if (cat.indexOf('機關') >= 0) map[sid].org++;
  }
  return map;
}

function doPost(e) {
  return handleSubmit_((e && e.parameter) ? e.parameter : {});
}

function handleSubmit_(p) {
  var back = PORTAL_URL;
  try {
    if (p['return'] && /github\.io/.test(String(p['return']))) back = String(p['return']).split('?')[0];
    var map = {};
    Object.keys(p).forEach(function (k) { map[k] = p[k]; });
    var dest = writeApplicationRow_(map, p.email || p.電子信箱 || '');
    return htmlPage_(
      '申請已收到',
      '<p>已寫入 master「申請」第 ' + dest + ' 列。請等 GM 發布後才會出現在名冊。</p>' +
      '<p><a href="' + escHtml_(back) + '">返回 School Application Portal</a></p>'
    );
  } catch (err) {
    var msg = String(err && err.message ? err.message : err);
    var hint = /permission|not allowed|授權|權限/i.test(msg)
      ? '<p>請把 Web App 設成：執行身分 <b>我</b>、存取對象 <b>任何人</b>，然後部署「新版本」。</p>'
      : '';
    return htmlPage_(
      '送出失敗',
      '<p>' + escHtml_(msg) + '</p>' + hint +
      '<p><a href="' + escHtml_(back) + '">返回入口</a></p>'
    );
  }
}

function escHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function htmlPage_(title, body) {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html lang="zh-Hant"><meta charset="utf-8">' +
    '<title>' + escHtml_(title) + '</title>' +
    '<body style="font-family:serif;background:#16110c;color:#f4ecd8;padding:32px;line-height:1.6">' +
    '<h1 style="color:#d4b06a">' + escHtml_(title) + '</h1>' + body +
    '</body></html>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
   .setTitle(title);
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
  scoreRow_(sh, dest);
  return dest;
}

function catFromId_(n) {
  n = Number(n);
  if ((n >= 1001 && n <= 1312) || (n >= 6019 && n <= 6048) || (n >= 7001 && n <= 7054)) return '泛用魔法';
  if ((n >= 2001 && n <= 2512) || (n >= 7055 && n <= 7072)) return '經歷魔法';
  if ((n >= 3001 && n <= 3506) || (n >= 6049 && n <= 6066)) return '機關魔法';
  if ((n >= 5001 && n <= 5018) || (n >= 6085 && n <= 6102) || (n >= 7082 && n <= 7087)) return '學派魔法';
  if (n >= 7106 && n <= 7111) return '醫療魔法';
  if (n >= 7112 && n <= 7117) return '餐飲魔法';
  if ((n >= 6103 && n <= 6117) || (n >= 7088 && n <= 7105)) return '遺失魔法';
  if ((n >= 4001 && n <= 4030) || (n >= 6067 && n <= 6084)) return '禁書魔法';
  if ((n >= 6001 && n <= 6018) || (n >= 7073 && n <= 7081)) return '種族魔法';
  return '其他';
}

function isFoundingFree_(n) {
  var cat = catFromId_(n);
  return cat === '泛用魔法' || cat === '經歷魔法' || cat === '機關魔法' || cat === '學派魔法' || cat === '醫療魔法' || cat === '餐飲魔法';
}

function lookupMagic_(id) {
  var n = Number(id);
  if (!n) return null;
  var dir = master_().getSheetByName('魔法目錄');
  if (!dir) return null;
  var last = dir.getLastRow();
  if (last < 2) return null;
  var data = dir.getRange(2, 1, last - 1, 12).getValues();
  for (var i = 0; i < data.length; i++) {
    if (Number(data[i][0]) === n) {
      var cat = catFromId_(n);
      return {
        id: n,
        zh: String(data[i][2] || ''),
        cost: Number(data[i][6] || 0),
        cat: cat,
        free: isFoundingFree_(n)
      };
    }
  }
  return null;
}

function cell_(sh, r, name) {
  try {
    return sh.getRange(r, col_(sh, name)).getValue();
  } catch (e) {
    return '';
  }
}

function setCell_(sh, r, name, value) {
  sh.getRange(r, col_(sh, name)).setValue(value);
}

function advCostFrom_(adv, itemPts, omen, skill, uniq, world) {
  var s = String(adv || '');
  if (!s || s === '不選擇優勢') return 0;
  if (s.indexOf('備品：魔素') === 0) return 2;
  if (s.indexOf('備品：道具') === 0) {
    var n = Number(itemPts);
    return n ? n * 3 : 99;
  }
  if (s.indexOf('專業性') === 0) return skill ? 3 : 99;
  if (s.indexOf('獨有的魔法體系') === 0) return uniq ? 5 : 99;
  if (s.indexOf('異境大本營') === 0) return world ? 5 : 99;
  if (s.indexOf('學派特性') === 0) {
    var z = String(omen || '');
    if (/臨床|惡食/.test(z)) return 5;
    if (/異境血脈|復仇心/.test(z)) return 10;
    if (/古老魔法/.test(z)) return 15;
    return 99;
  }
  return 99;
}

function disCostFrom_(dis, domain, styles, missing, diseaseName, diseaseN) {
  var s = String(dis || '');
  if (!s || s === '不選擇劣勢') return 0;
  if (s.indexOf('限制：領域') === 0) return domain ? 1 : 99;
  if (s.indexOf('限制：樣式') === 0) {
    var n = String(styles || '').split(/[、,，]/).filter(Boolean).length;
    return n === 2 ? 2 : 99;
  }
  if (s.indexOf('藏書缺失') === 0) return missing ? 3 : 99;
  if (s.indexOf('封建') === 0) return 3;
  if (s.indexOf('稀薄') === 0) return 4;
  if (s.indexOf('學派病') === 0) {
    var d = Number(diseaseN);
    return d > 0 && diseaseName ? d : 99;
  }
  return 99;
}

function extraCostFrom_(want, cat, freeCat, extraId) {
  if (String(want) !== '是') return 0;
  cat = String(cat || '');
  if (cat === '經歷魔法') return 3 + (freeCat === '經歷魔法' ? 1 : 0);
  if (cat === '機關魔法') return 4 + (freeCat === '機關魔法' ? 1 : 0);
  if (cat === '學派魔法' || cat === '泛用魔法' || cat === '禁書魔法' || cat === '種族魔法') return 3;
  if (cat === '餐飲魔法' || cat === '醫療魔法') return 2;
  if (cat.indexOf('遺失') === 0) {
    var m = lookupMagic_(extraId);
    return m ? 2 + Number(m.cost || 0) : 99;
  }
  return 99;
}

function scoreRow_(sh, r) {
  ensureGmColumn_(sh);
  var type = String(cell_(sh, r, '申請類型') || '');
  var frozen = gmStatus_(sh, r);
  var ts = cell_(sh, r, '時間戳記');
  var id = Utilities.formatDate(ts instanceof Date ? ts : new Date(), Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyyMMdd-HHmmss') + '-' + ('00' + (r - 1)).slice(-3);
  var name = String(cell_(sh, r, '學派名') || '').trim();
  var list = master_().getSheetByName('學派表');
  var dup = false;
  if (name && list) {
    var rows = schoolListRows_(list);
    for (var i = 0; i < rows.length; i++) {
      var existing = String(list.getRange(rows[i], 1).getValue() || '').trim();
      if (isSchoolName_(existing) && existing === name) dup = true;
    }
  }

  var advC = advCostFrom_(cell_(sh, r, '優勢'), cell_(sh, r, '備品道具功績點'), cell_(sh, r, '學派特性預兆'), cell_(sh, r, '專業性判定'), cell_(sh, r, '獨有體系'), cell_(sh, r, '世界法則阻礙'));
  var disC = disCostFrom_(cell_(sh, r, '劣勢'), cell_(sh, r, '限制領域'), cell_(sh, r, '限制樣式'), cell_(sh, r, '藏書缺失種類'), cell_(sh, r, '學派病名稱'), cell_(sh, r, '學派病強度'));
  var extraC = extraCostFrom_(cell_(sh, r, '是否追加第二本'), cell_(sh, r, '追加藏書分類'), cell_(sh, r, '免費藏書分類'), cell_(sh, r, '追加藏書序號'));
  var remain = type === '學派初創' ? 3 - Number(advC) + Number(disC) - Number(extraC) : '—';

  var freeM = lookupMagic_(cell_(sh, r, '免費藏書序號'));
  var extraM = lookupMagic_(cell_(sh, r, '追加藏書序號'));
  var freeName = freeM ? ('【' + freeM.zh + '】') : (cell_(sh, r, '免費藏書序號') ? '序號無效' : '');
  var extraName = extraM ? ('【' + extraM.zh + '】') : '';
  var books = [freeName, String(cell_(sh, r, '是否追加第二本')) === '是' ? extraName : ''].filter(Boolean).join('\n');
  var traits = [cell_(sh, r, '優勢'), cell_(sh, r, '劣勢')].filter(function (x) {
    return x && String(x) !== '不選擇優勢' && String(x) !== '不選擇劣勢';
  }).join('\n');

  var msg = '通過';
  if (type !== '學派初創') msg = '待人工（非初創）';
  else if (!name) msg = '缺學派名';
  else if (!cell_(sh, r, '信條')) msg = '缺信條';
  else if (dup) msg = '學派名重複';
  else if (!cell_(sh, r, '免費藏書序號')) msg = '缺免費藏書序號';
  else if (!freeM) msg = '免費藏書序號無效';
  else if (!freeM.free) msg = '免費藏書不在初創允許範圍';
  else if (cell_(sh, r, '免費藏書分類') && freeM.cat !== String(cell_(sh, r, '免費藏書分類'))) msg = '免費藏書分類與序號不符';
  else if (advC === 99) msg = '優勢參數不足';
  else if (disC === 99) msg = '劣勢參數不足';
  else if (extraC === 99) msg = '追加藏書無法計價';
  else if (typeof remain === 'number' && remain < 0) msg = '剩餘功績點為負';
  else if (String(cell_(sh, r, '是否追加第二本')) === '是' && extraM && freeM && extraM.id === freeM.id) msg = '兩本藏書序號相同';

  var verdict = (msg === '通過' || msg === '待人工（非初創）') ? '待審核' : '驗證失敗';
  if (isFrozenStatus_(frozen)) {
    verdict = frozen === '已發布' ? '已發布' : '退回';
  }

  setCell_(sh, r, '申請ID', id);
  setCell_(sh, r, '驗證結果', verdict);
  setCell_(sh, r, '驗證訊息', msg);
  setCell_(sh, r, '優勢COST', advC);
  setCell_(sh, r, '劣勢COST', disC);
  setCell_(sh, r, '追加藏書COST', extraC);
  setCell_(sh, r, '剩餘功績點', remain);
  setCell_(sh, r, '免費藏書名', freeName);
  setCell_(sh, r, '追加藏書名', extraName);
  setCell_(sh, r, '特記顯示草稿', traits);
  setCell_(sh, r, '藏書顯示草稿', books);
  setCell_(sh, r, '重名', dup ? '是' : '否');
  return msg;
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
  ensureGmColumn_(sh);
  var ok = 0, fail = 0;
  for (var r = 3; r <= last; r++) {
    if (!cell_(sh, r, '時間戳記') && !cell_(sh, r, '學派名')) continue;
    var msg = scoreRow_(sh, r);
    if (msg === '通過' || msg === '待人工（非初創）') ok++;
    else fail++;
  }
  alert_('已重新驗算。通過／待人工 ' + ok + ' 筆，驗證失敗 ' + fail + ' 筆。#ERROR 的剩餘功績點與驗證訊息已改成數值。');
}

function ensureGmColumn_(sh) {
  var lastCol = Math.max(sh.getLastColumn(), 50);
  sh.getRange(1, 50).setValue('GM決定');
  return 50;
}

function isFrozenStatus_(s) {
  s = String(s || '').trim();
  return s === '退回' || s === '已發布' || s === '拒絕' || s === 'Reject';
}

function gmStatus_(apply, r) {
  ensureGmColumn_(apply);
  var decided = String(apply.getRange(r, col_(apply, 'GM決定')).getValue() || '').trim();
  if (decided) return decided;
  return String(apply.getRange(r, col_(apply, '驗證結果')).getValue() || '').trim();
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

function markPublished_(apply, r) {
  ensureGmColumn_(apply);
  apply.getRange(r, col_(apply, '驗證結果')).setValue('已發布');
  apply.getRange(r, col_(apply, 'GM決定')).setValue('已發布');
}

function markRejected_(apply, r) {
  ensureGmColumn_(apply);
  apply.getRange(r, col_(apply, '驗證結果')).setValue('退回');
  apply.getRange(r, col_(apply, 'GM決定')).setValue('退回');
}

function publishApproved() {
  var ss = master_();
  var apply = ss.getSheetByName('申請');
  var last = apply.getLastRow();
  if (last < 2) { alert_('沒有申請列。'); return; }
  var published = 0, rejected = 0, skipped = 0;
  for (var r = 3; r <= last; r++) {
    var status = gmStatus_(apply, r);
    if (isFrozenStatus_(status) && status !== '已發布') { rejected++; continue; }
    if (status === '已發布') { skipped++; continue; }
    scoreRow_(apply, r);
    status = gmStatus_(apply, r);
    if (isFrozenStatus_(status) && status !== '已發布') { rejected++; continue; }
    if (status !== '待審核') { skipped++; continue; }
    var type = String(apply.getRange(r, col_(apply, '申請類型')).getValue());
    var msg = String(apply.getRange(r, col_(apply, '驗證訊息')).getValue());
    var name = String(apply.getRange(r, col_(apply, '學派名')).getValue());
    if (name.indexOf('測試') === 0 || type !== '學派初創' || msg !== '通過') { skipped++; continue; }
    publishFoundingRow_(ss, apply, r);
    markPublished_(apply, r);
    published++;
  }
  alert_('已發布 ' + published + ' 筆初創。退回略過 ' + rejected + ' 筆。其他略過 ' + skipped + ' 筆。');
}

function publishSelected() {
  var ss = master_();
  var apply = ss.getSheetByName('申請');
  var active = ss.getActiveSheet();
  var r;
  if (active.getName() === '審核') {
    r = findApplyRow_(apply, active.getActiveCell().getRow() >= 5 ? active.getRange(active.getActiveCell().getRow(), 1).getValue() : '', active.getRange(Math.max(active.getActiveCell().getRow(), 5), 5).getValue());
    if (!r) { alert_('在「審核」找不到對應的申請列。請改點「申請」那一列再發布。'); return; }
  } else {
    r = apply.getActiveCell().getRow();
  }
  if (r < 3) { alert_('請先點「申請」工作表裡要發布的那一列。'); return; }
  scoreRow_(apply, r);
  var status = gmStatus_(apply, r);
  if (status === '已發布') { alert_('這一列已經發布過。'); return; }
  if (isFrozenStatus_(status)) { alert_('這一列已退回，不會發布。'); return; }
  var type = String(apply.getRange(r, col_(apply, '申請類型')).getValue());
  var msg = String(apply.getRange(r, col_(apply, '驗證訊息')).getValue());
  if (type === '學派初創' && msg !== '通過') {
    alert_('這一列驗證未通過：' + msg);
    return;
  }
  try {
    if (type === '學派初創') publishFoundingRow_(ss, apply, r);
    else publishOpsRow_(ss, apply, r);
    markPublished_(apply, r);
    alert_('已發布第 ' + r + ' 列（' + type + '）。');
  } catch (err) {
    alert_('發布失敗：' + err.message);
  }
}

function publishOps() {
  var ss = master_();
  var apply = ss.getSheetByName('申請');
  var last = apply.getLastRow();
  if (last < 2) { alert_('沒有申請列。'); return; }
  var published = 0, skipped = 0;
  for (var r = 3; r <= last; r++) {
    var status = gmStatus_(apply, r);
    if (isFrozenStatus_(status)) { skipped++; continue; }
    if (status !== '待審核') continue;
    var type = String(apply.getRange(r, col_(apply, '申請類型')).getValue());
    if (type.indexOf('運營') !== 0) { skipped++; continue; }
    try {
      publishOpsRow_(ss, apply, r);
      markPublished_(apply, r);
      published++;
    } catch (err) {
      skipped++;
      Logger.log('row ' + r + ': ' + err.message);
    }
  }
  alert_('已發布 ' + published + ' 筆運營。略過 ' + skipped + ' 筆。');
}

function findCardRow_(ss, name) {
  var sh = ss.getSheetByName('學派卡');
  var last = sh.getLastRow();
  if (last < 3) throw new Error('沒有學派卡資料');
  var names = sh.getRange(3, 2, last - 2, 1).getValues();
  for (var i = 0; i < names.length; i++) {
    if (String(names[i][0]) === name) return i + 3;
  }
  throw new Error('學派卡找不到：' + name);
}

function findListRow_(ss, name) {
  var sh = ss.getSheetByName('學派表');
  var rows = schoolListRows_(sh);
  for (var i = 0; i < rows.length; i++) {
    var n = String(sh.getRange(rows[i], 1).getValue() || '').trim();
    if (isSchoolName_(n) && n === name) return rows[i];
  }
  throw new Error('學派表找不到：' + name);
}

function levelUpCost_(level) {
  if (level === 1) return 10;
  if (level === 2) return 20;
  if (level === 3) return 30;
  if (level === 4) return 50;
  throw new Error('無法再升級');
}

function extraBookCost_(cat, expCount, orgCount, mid) {
  if (cat === '經歷魔法') return 3 + Number(expCount || 0);
  if (cat === '機關魔法') return 4 + Number(orgCount || 0);
  if (cat === '學派魔法' || cat === '泛用魔法' || cat === '禁書魔法' || cat === '種族魔法') return 3;
  if (cat === '餐飲魔法' || cat === '醫療魔法') return 2;
  if (String(cat).indexOf('遺失') >= 0) {
    var dir = master_().getSheetByName('魔法目錄');
    var data = dir.getRange(2, 1, Math.max(dir.getLastRow() - 1, 1), 7).getValues();
    var idNum = Number(mid);
    for (var i = 0; i < data.length; i++) {
      if (Number(data[i][0]) === idNum) return 2 + Number(data[i][6] || 0);
    }
    throw new Error('追加藏書序號無效');
  }
  throw new Error('未知藏書分類');
}

function rebuildDisplay_(ss, sid, name) {
  var det = ss.getSheetByName('藏書明細');
  var last = det.getLastRow();
  var magics = [];
  if (last >= 2) {
    var rows = det.getRange(2, 1, last - 1, 5).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === sid) magics.push(rows[i][4] || ('【' + rows[i][3] + '】'));
    }
  }
  var spec = ss.getSheetByName('特記明細');
  var notes = [];
  last = spec.getLastRow();
  if (last >= 2) {
    var srows = spec.getRange(2, 1, last - 1, 7).getValues();
    for (var j = 0; j < srows.length; j++) {
      if (String(srows[j][0]) === sid) notes.push(String(srows[j][2] || ''));
    }
  }
  return {books: magics.join('\n'), notes: notes.join('\n')};
}

function publishOpsRow_(ss, apply, r) {
  var get = function (h) { return apply.getRange(r, col_(apply, h)).getValue(); };
  var name = String(get('運營_目標學派') || get('學派名')).trim();
  if (!name) throw new Error('沒有目標學派');
  var card = ss.getSheetByName('學派卡');
  var cr = findCardRow_(ss, name);
  var sid = String(card.getRange(cr, 1).getValue());
  var level = Number(card.getRange(cr, 9).getValue()) || 1;
  var remain = Number(card.getRange(cr, 13).getValue()) || 0;
  var gained = Number(card.getRange(cr, 14).getValue()) || 0;
  var spent = Number(card.getRange(cr, 15).getValue()) || 0;
  var advN = Number(card.getRange(cr, 18).getValue()) || 0;
  var disN = Number(card.getRange(cr, 19).getValue()) || 0;
  var now = new Date();
  var flow = ss.getSheetByName('功績點流水');
  var counts = bookCounts_()[sid] || {n: 0, exp: 0, org: 0};

  var add = Number(get('運營_獲得點數')) || 0;
  if (add > 0) {
    remain += add;
    gained += add;
    flow.appendRow([now, sid, name, '運營獲得', get('運營_獲得條件'), add, remain, get('申請ID'), get('申請備註'), get('管理人')]);
  }

  if (String(get('運營_升級')) === '是') {
    var cost = levelUpCost_(level);
    if (remain < cost) throw new Error('升級點數不足（需要 ' + cost + '）');
    remain -= cost;
    spent += cost;
    level += 1;
    card.getRange(cr, 9).setValue(level);
    card.getRange(cr, 10).setValue(level);
    card.getRange(cr, 11).setValue(level * 2);
    card.getRange(cr, 12).setValue(level + 2);
    flow.appendRow([now, sid, name, '升級', 'Lv' + (level - 1) + '→' + level, -cost, remain, get('申請ID'), '', get('管理人')]);
  }

  if (String(get('是否追加第二本')) === '是' && get('追加藏書序號')) {
    var maxB = Number(card.getRange(cr, 11).getValue()) || 2;
    if (counts.n >= maxB) throw new Error('已達最大藏書數');
    var bcost = extraBookCost_(String(get('追加藏書分類')), counts.exp, counts.org, get('追加藏書序號'));
    if (remain < bcost) throw new Error('追加藏書點數不足');
    remain -= bcost;
    spent += bcost;
    appendBook_(ss.getSheetByName('藏書明細'), sid, name, get('追加藏書序號'), '追加', bcost, now);
    flow.appendRow([now, sid, name, '追加藏書', get('追加藏書序號'), -bcost, remain, get('申請ID'), '', get('管理人')]);
  }

  var adv = String(get('優勢') || '');
  var dis = String(get('劣勢') || '');
  if (adv && adv !== '不選擇優勢') {
    if (advN >= level) throw new Error('優勢數量不能超過學派等級');
    var ac = Number(get('優勢COST')) || 0;
    if (remain < ac) throw new Error('優勢 COST 不足');
    remain -= ac;
    spent += ac;
    advN += 1;
    ss.getSheetByName('特記明細').appendRow([sid, name, adv, '優勢', ac, '', '', '生效中', now]);
    flow.appendRow([now, sid, name, '追加優勢', adv, -ac, remain, get('申請ID'), '', get('管理人')]);
  }
  if (dis && dis !== '不選擇劣勢') {
    if (disN >= level) throw new Error('劣勢數量不能超過學派等級');
    var dc = Number(get('劣勢COST')) || 0;
    remain += dc;
    gained += dc;
    disN += 1;
    ss.getSheetByName('特記明細').appendRow([sid, name, dis, '劣勢', dc, '', '', '生效中', now]);
    flow.appendRow([now, sid, name, '追加劣勢', dis, dc, remain, get('申請ID'), '', get('管理人')]);
  }

  var disp = rebuildDisplay_(ss, sid, name);
  card.getRange(cr, 13).setValue(remain);
  card.getRange(cr, 14).setValue(gained);
  card.getRange(cr, 15).setValue(spent);
  card.getRange(cr, 16).setValue(disp.books);
  card.getRange(cr, 17).setValue(disp.notes);
  card.getRange(cr, 18).setValue(advN);
  card.getRange(cr, 19).setValue(disN);

  var lr = findListRow_(ss, name);
  var list = ss.getSheetByName('學派表');
  list.getRange(lr, 3).setValue(disp.books);
  list.getRange(lr, 4).setValue(disp.notes);
  list.getRange(lr, 7).setValue(level);
  list.getRange(lr, 10).setValue(now);
  if (!String(list.getRange(lr, 11).getValue() || '').trim()) {
    list.getRange(lr, 11).setValue(gmIdentity_());
  }
  if (!String(list.getRange(lr, 12).getValue() || '').trim()) {
    list.getRange(lr, 12).setValue(gmContact_());
  }
}

function publishFoundingRow_(ss, apply, r) {
  var get = function (h) { return apply.getRange(r, col_(apply, h)).getValue(); };
  var name = String(get('學派名')).trim();
  var list = ss.getSheetByName('學派表');
  var rows = schoolListRows_(list);
  for (var i = 0; i < rows.length; i++) {
    var existing = String(list.getRange(rows[i], 1).getValue() || '').trim();
    if (isSchoolName_(existing) && existing === name) throw new Error('學派名已存在：' + name);
  }
  var sid = nextSchoolId_(ss);
  var creed = String(get('信條'));
  var books = String(get('藏書顯示草稿'));
  var notes = String(get('特記顯示草稿'));
  var manager = String(get('管理人'));
  var remain = get('剩餘功績點');
  var now = new Date();
  var nextList = nextCustomSchoolRow_(list);
  ensureSchoolListHeaders_(list);
  var gm = gmIdentity_();
  var gmC = gmContact_();
  list.getRange(nextList, 1, 1, 12).setValues([[
    name, creed, books, notes, '自創', manager, 1, '生效中', sid, now, gm, gmC
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
    '生效中', get('申請ID'), now, gm, ''
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
