(function (w) {
  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      var cb = "mhcb_" + Math.random().toString(36).slice(2);
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error("timeout"));
      }, 20000);
      function cleanup() {
        clearTimeout(timer);
        delete w[cb];
        if (s && s.parentNode) s.parentNode.removeChild(s);
      }
      w[cb] = function (data) {
        cleanup();
        resolve(data);
      };
      var s = document.createElement("script");
      var join = url.indexOf("?") >= 0 ? "&" : "?";
      s.src = url + join + "callback=" + cb;
      s.onerror = function () {
        cleanup();
        reject(new Error("jsonp"));
      };
      document.head.appendChild(s);
    });
  }

  function gviz(sheetName) {
    var cfg = w.MH_CONFIG || {};
    var id = cfg.masterId;
    var cb = "mhgv_" + Math.random().toString(36).slice(2);
    var url = "https://docs.google.com/spreadsheets/d/" + id +
      "/gviz/tq?sheet=" + encodeURIComponent(sheetName) +
      "&headers=0&tqx=" + encodeURIComponent("out:json;responseHandler:" + cb);
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error("timeout"));
      }, 20000);
      function cleanup() {
        clearTimeout(timer);
        delete w[cb];
        if (s && s.parentNode) s.parentNode.removeChild(s);
      }
      w[cb] = function (data) {
        cleanup();
        resolve(data);
      };
      var s = document.createElement("script");
      s.src = url;
      s.onerror = function () {
        cleanup();
        reject(new Error("gviz"));
      };
      document.head.appendChild(s);
    });
  }

  function isRealSchool(s) {
    var name = typeof s === "string" ? s : String((s && (s.name || s.學派)) || "");
    name = name.replace(/^\s+/, "");
    if (!name) return false;
    if (name === "學派") return false;
    if (/[↑⬆⇧]/.test(name)) return false;
    if (/官方\s*15/.test(name)) return false;
    if (/占位|不要手寫|請自行|Apps Script|追加在第/.test(name)) return false;
    return true;
  }

  function cell(row, i) {
    var c = row.c && row.c[i];
    if (!c || c.v === null || c.v === undefined) return "";
    return c.v;
  }

  function schoolsFromGviz(data) {
    var table = data && data.table;
    if (!table || !table.rows) return [];
    return table.rows.map(function (row) {
      var name = String(cell(row, 0) || "").trim();
      return {
        name: name,
        creed: cell(row, 1),
        magic: cell(row, 2),
        note: cell(row, 3),
        source: cell(row, 4),
        manager: cell(row, 5),
        approver: cell(row, 10),
        contact: cell(row, 11),
        level: cell(row, 6),
        status: cell(row, 7),
        id: cell(row, 8),
        學派: name,
        信條: cell(row, 1),
        學派魔法: cell(row, 2),
        特記事項: cell(row, 3),
        來源: cell(row, 4),
        管理人: cell(row, 5),
        學派等級: cell(row, 6),
        狀態: cell(row, 7),
        學派ID: cell(row, 8),
        核准GM: cell(row, 10),
        核准GM聯絡方法: cell(row, 11)
      };
    }).filter(isRealSchool);
  }

  function mergeSchools(official, others) {
    var byName = {};
    official.forEach(function (s) {
      if (isRealSchool(s)) byName[s.name] = s;
    });
    others.forEach(function (s) {
      if (!isRealSchool(s)) return;
      var key = s.name || s.學派;
      if (!key) return;
      var prev = byName[key] || {};
      byName[key] = {
        name: key,
        creed: s.creed || s.信條 || prev.creed || "",
        magic: s.magic || s.學派魔法 || prev.magic || "",
        note: s.note || s.特記事項 || prev.note || "",
        source: s.source || s.來源 || prev.source || "",
        manager: s.manager || s.管理人 || prev.manager || "",
        approver: s.approver || s.核准GM || prev.approver || "",
        contact: s.contact || s.核准GM聯絡方法 || prev.contact || "",
        level: s.level || s.學派等級 || prev.level || "",
        status: s.status || s.狀態 || prev.status || "",
        id: s.id || s.學派ID || prev.id || "",
        學派: key,
        信條: s.creed || s.信條 || prev.creed || "",
        學派魔法: s.magic || s.學派魔法 || prev.magic || "",
        特記事項: s.note || s.特記事項 || prev.note || "",
        來源: s.source || s.來源 || prev.source || "",
        管理人: s.manager || s.管理人 || prev.manager || "",
        學派等級: s.level || s.學派等級 || prev.level || "",
        狀態: s.status || s.狀態 || prev.status || "",
        學派ID: s.id || s.學派ID || prev.id || "",
        核准GM: s.approver || s.核准GM || prev.approver || "",
        核准GM聯絡方法: s.contact || s.核准GM聯絡方法 || prev.contact || ""
      };
    });
    var order = official.map(function (s) { return s.name; });
    var out = [];
    order.forEach(function (n) {
      if (byName[n]) {
        out.push(byName[n]);
        delete byName[n];
      }
    });
    Object.keys(byName).forEach(function (n) { out.push(byName[n]); });
    return out;
  }

  function loadSchools() {
    var cfg = w.MH_CONFIG || {};
    return fetch("data/official.json").then(function (r) { return r.json(); }).then(function (official) {
      var sheetP = cfg.masterId
        ? gviz("學派表").then(schoolsFromGviz).catch(function () { return []; })
        : Promise.resolve([]);
      var appP = cfg.webAppUrl
        ? jsonp(cfg.webAppUrl + "?action=schools").then(function (data) {
          return (data && data.schools) || [];
        }).catch(function () { return []; })
        : Promise.resolve([]);
      return Promise.all([sheetP, appP]).then(function (pair) {
        return { ok: true, schools: mergeSchools(official, pair[0].concat(pair[1])) };
      });
    });
  }

  function dedupeCards(list) {
    var byName = {};
    var order = [];
    (list || []).forEach(function (c) {
      if (!c || !c.name || !isRealSchool(c.name)) return;
      if (!byName[c.name]) order.push(c.name);
      byName[c.name] = c;
    });
    return order.map(function (n) { return byName[n]; });
  }

  function cardsFromGviz(data) {
    var table = data && data.table;
    if (!table || !table.rows) return [];
    var out = [];
    table.rows.forEach(function (row) {
      var id = String(cell(row, 0) || "").trim();
      var name = String(cell(row, 1) || "").trim();
      if (!name || !isRealSchool(name)) return;
      if (id === "學派ID" || /自創學派核准後/.test(id)) return;
      if (String(cell(row, 19) || "") === "停用") return;
      out.push({
        id: id,
        name: name,
        manager: cell(row, 2),
        level: Number(cell(row, 8)) || 1,
        remain: Number(cell(row, 12)) || 0,
        books: Number(cell(row, 9)) || 1,
        maxBooks: Number(cell(row, 10)) || 2,
        cap: Number(cell(row, 11)) || 3,
        adv: Number(cell(row, 17)) || 0,
        dis: Number(cell(row, 18)) || 0,
        expCount: 0,
        orgCount: 0
      });
    });
    return dedupeCards(out);
  }

  function cardsFromSchools(schools) {
    var out = [];
    (schools || []).forEach(function (s) {
      if (!isRealSchool(s)) return;
      var src = String(s.source || s.來源 || "");
      if (src === "官方") return;
      if (src && src !== "自創") return;
      var name = s.name || s.學派;
      var level = Number(s.level || s.學派等級) || 1;
      var note = String(s.note || s.特記事項 || "");
      var magic = String(s.magic || s.學派魔法 || "");
      out.push({
        id: String(s.id || s.學派ID || ""),
        name: name,
        manager: s.manager || s.管理人 || "",
        level: level,
        remain: 3,
        books: (magic.match(/【/g) || []).length || 1,
        maxBooks: level * 2,
        cap: 3,
        adv: (note.match(/專業性|備品|獨有|異境大本營|學派特性/g) || []).length,
        dis: (note.match(/限制：|封建|稀薄|藏書缺失|學派病/g) || []).length,
        expCount: 0,
        orgCount: 0
      });
    });
    return dedupeCards(out);
  }

  function loadCards() {
    var cfg = w.MH_CONFIG || {};
    return gviz("學派卡").then(cardsFromGviz).catch(function () { return []; }).then(function (sheetCards) {
      if (sheetCards.length) return sheetCards;
      var appP = cfg.webAppUrl
        ? jsonp(cfg.webAppUrl + "?action=cards").then(function (data) {
          if (data && data.ok === false) return [];
          return dedupeCards((data && data.cards) || []);
        }).catch(function () { return []; })
        : Promise.resolve([]);
      return appP.then(function (appCards) {
        if (appCards.length) return appCards;
        return loadSchools().then(function (data) {
          return cardsFromSchools((data && data.schools) || []);
        });
      });
    });
  }

  w.MH = { jsonp: jsonp, loadSchools: loadSchools, loadCards: loadCards, isRealSchool: isRealSchool };
})(window);
