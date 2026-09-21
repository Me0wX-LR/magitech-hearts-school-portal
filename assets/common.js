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
      "&tqx=out:json;responseHandler:" + cb;
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
        學派: name,
        信條: cell(row, 1),
        學派魔法: cell(row, 2),
        特記事項: cell(row, 3),
        來源: cell(row, 4),
        管理人: cell(row, 5),
        核准GM: cell(row, 10),
        核准GM聯絡方法: cell(row, 11)
      };
    }).filter(isRealSchool);
  }

  function loadSchools() {
    var cfg = w.MH_CONFIG || {};
    if (cfg.masterId) {
      return gviz("學派表").then(function (data) {
        var schools = schoolsFromGviz(data);
        if (schools.length) return { ok: true, schools: schools, source: "sheet" };
        throw new Error("empty");
      }).catch(function () {
        if (!cfg.webAppUrl) throw new Error("no source");
        return jsonp(cfg.webAppUrl + "?action=schools").then(function (data) {
          if (data && data.schools) data.schools = data.schools.filter(isRealSchool);
          return data;
        });
      }).catch(function () {
        return fetch("data/official.json").then(function (r) { return r.json(); })
          .then(function (rows) { return { ok: true, fallback: true, schools: rows.filter(isRealSchool) }; });
      });
    }
    return fetch("data/official.json").then(function (r) { return r.json(); })
      .then(function (rows) { return { ok: true, fallback: true, schools: rows.filter(isRealSchool) }; });
  }

  w.MH = { jsonp: jsonp, loadSchools: loadSchools, isRealSchool: isRealSchool };
})(window);
