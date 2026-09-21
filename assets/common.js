(function (w) {
  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      var cb = "mhcb_" + Math.random().toString(36).slice(2);
      var timer = setTimeout(function () {
        cleanup();
        reject(new Error("timeout"));
      }, 8000);
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
      s.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + "callback=" + cb;
      s.onerror = function () {
        cleanup();
        reject(new Error("jsonp"));
      };
      document.head.appendChild(s);
    });
  }

  function loadSchools() {
    var cfg = w.MH_CONFIG || {};
    if (cfg.webAppUrl) {
      return jsonp(cfg.webAppUrl + "?action=schools").catch(function () {
        return fetch("data/official.json").then(function (r) { return r.json(); })
          .then(function (rows) { return { ok: true, fallback: true, schools: rows }; });
      });
    }
    return fetch("data/official.json").then(function (r) { return r.json(); })
      .then(function (rows) { return { ok: true, fallback: true, schools: rows }; });
  }

  w.MH = { jsonp: jsonp, loadSchools: loadSchools };
})(window);
