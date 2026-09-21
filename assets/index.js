(function () {
  var list = document.getElementById("list");
  var status = document.getElementById("status");
  var q = document.getElementById("q");
  var rows = [];

  function card(s) {
    var el = document.createElement("article");
    el.className = "card";
    var who = [];
    if (s.manager || s.管理人) who.push("管理人／創作者：" + (s.manager || s.管理人));
    if (s.approver || s.核准GM) who.push("核准 GM：" + (s.approver || s.核准GM));
    else if ((s.source || s.來源) === "自創") who.push("核准 GM：未登記");
    if (s.contact || s.核准GM聯絡方法) who.push("聯絡：" + (s.contact || s.核准GM聯絡方法));
    el.innerHTML =
      '<span class="tag">' + escapeHtml(s.source || (s.來源 || "學派")) + "</span>" +
      "<h2>" + escapeHtml(s.name || s.學派 || "") + "</h2>" +
      (who.length ? '<p class="hint">' + escapeHtml(who.join("　")) + "</p>" : "") +
      '<p class="magic">' + escapeHtml(s.magic || s.學派魔法 || "（無學派魔法）") + "</p>" +
      "<p>" + escapeHtml(s.creed || s.信條 || "") + "</p>" +
      "<p>" + escapeHtml(s.note || s.特記事項 || "") + "</p>";
    return el;
  }

  function escapeHtml(v) {
    return String(v || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function render() {
    var needle = (q.value || "").trim().toLowerCase();
    list.innerHTML = "";
    rows.filter(function (s) {
      if (!needle) return true;
      return JSON.stringify(s).toLowerCase().indexOf(needle) >= 0;
    }).forEach(function (s) { list.appendChild(card(s)); });
  }

  MH.loadSchools().then(function (data) {
    rows = (data && data.schools) ? data.schools : data;
    if (!Array.isArray(rows)) rows = [];
    rows = rows.filter(MH.isRealSchool);
    if (data && data.fallback) {
      status.textContent = "目前顯示官方種子名冊。部署 Web App 並填入 assets/config.js 的 webAppUrl 後，會改讀 master 已核准列。";
    } else {
      status.textContent = "已從 master 讀取 " + rows.length + " 個學派。";
    }
    render();
  }).catch(function () {
    status.textContent = "無法讀取名冊。";
  });

  q.addEventListener("input", render);
})();
