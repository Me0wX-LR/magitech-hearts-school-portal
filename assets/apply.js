(function () {
  var magics = [];
  var step = 0;
  var form = document.getElementById("form");
  var panels = [].slice.call(document.querySelectorAll(".panel"));
  var stepsEl = document.getElementById("steps");
  var labels = ["申請人", "學派", "藏書", "特記", "確認"];
  var cfg = window.MH_CONFIG || {};

  var params = new URLSearchParams(location.search);
  var banner = document.getElementById("banner");
  if (params.get("ok") === "1") {
    banner.innerHTML = '<p class="notice ok">申請已寫入 master「申請」工作表。核准後才會出現在名冊與自動角卡。</p>';
  } else if (params.get("err")) {
    banner.innerHTML = '<p class="notice bad">送出失敗：' + params.get("err") + "</p>";
  }
  if (!cfg.webAppUrl) {
    banner.innerHTML += '<p class="notice">尚未設定 Web App 網址。可先填表試算 COST；要真正送出，請依 README 部署 apps-script/Code.gs 後把網址寫進 assets/config.js。</p>';
  }

  document.getElementById("returnField").value = location.href.split("?")[0];

  fetch("data/magics.json").then(function (r) { return r.json(); }).then(function (rows) {
    magics = rows;
    hint("free");
    hint("extra");
  });

  function byId(id) {
    id = Number(id);
    for (var i = 0; i < magics.length; i++) if (magics[i].id === id) return magics[i];
    return null;
  }

  function hint(which) {
    var idEl = document.getElementById(which === "free" ? "freeId" : "extraId");
    var catEl = document.getElementById(which === "free" ? "freeCat" : "extraCat");
    var out = document.getElementById(which === "free" ? "freeHint" : "extraHint");
    if (!idEl || !out) return;
    var m = byId(idEl.value);
    if (!idEl.value) { out.textContent = ""; return; }
    if (!m) { out.textContent = "找不到這個序號。"; return; }
    var ok = which === "free" ? m.free && m.cat === catEl.value : (m.paid || m.free);
    out.textContent = "【" + m.zh + "】　" + m.cat + "　" + m.type + (ok ? "" : "　（此分類／範圍不合法）");
  }

  document.getElementById("freeId").addEventListener("input", function () { hint("free"); });
  document.getElementById("freeCat").addEventListener("change", function () { hint("free"); });
  document.getElementById("extraId").addEventListener("input", function () { hint("extra"); });
  document.getElementById("extraCat").addEventListener("change", function () { hint("extra"); });
  document.getElementById("extraOn").addEventListener("change", function () {
    document.getElementById("extraBox").hidden = this.value !== "是";
    paintMath();
  });
  ["adv", "dis"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", paintMath);
  });
  form.addEventListener("input", paintMath);

  function val(name) {
    var el = form.elements[name];
    return el ? String(el.value || "").trim() : "";
  }

  function advCost() {
    var s = val("優勢");
    if (!s || s === "不選擇優勢") return 0;
    if (s.indexOf("備品：魔素") === 0) return 2;
    if (s.indexOf("備品：道具") === 0) {
      var n = Number(val("備品道具功績點"));
      return n ? n * 3 : 99;
    }
    if (s.indexOf("專業性") === 0) return 3;
    if (s.indexOf("獨有的魔法體系") === 0) return 5;
    if (s.indexOf("異境大本營") === 0) return 5;
    if (s.indexOf("學派特性") === 0) {
      var z = val("學派特性預兆");
      if (/臨床|惡食/.test(z)) return 5;
      if (/異境血脈|復仇心/.test(z)) return 10;
      if (/古老魔法/.test(z)) return 15;
      return 99;
    }
    return 99;
  }

  function disCost() {
    var s = val("劣勢");
    if (!s || s === "不選擇劣勢") return 0;
    if (s.indexOf("限制：領域") === 0) return 1;
    if (s.indexOf("限制：樣式") === 0) return 2;
    if (s.indexOf("藏書缺失") === 0) return 3;
    if (s.indexOf("封建") === 0) return 3;
    if (s.indexOf("稀薄") === 0) return 4;
    if (s.indexOf("學派病") === 0) {
      var n = Number(val("學派病強度"));
      return n > 0 ? n : 99;
    }
    return 99;
  }

  function extraCost() {
    if (val("是否追加第二本") !== "是") return 0;
    var p = val("追加藏書分類");
    var free = val("免費藏書分類");
    if (p === "經歷魔法") return 3 + (free === "經歷魔法" ? 1 : 0);
    if (p === "機關魔法") return 4 + (free === "機關魔法" ? 1 : 0);
    if (p === "學派魔法") return 3;
    if (p === "餐飲魔法" || p === "醫療魔法") return 2;
    if (p.indexOf("遺失") === 0) {
      var m = byId(val("追加藏書序號"));
      return m && m.cost != null ? 2 + m.cost : 99;
    }
    return 99;
  }

  function remain() {
    return 3 - advCost() + disCost() - extraCost();
  }

  function issues() {
    var out = [];
    if (!val("管理人")) out.push("缺管理人");
    if (!val("學派名")) out.push("缺學派名");
    if (!val("信條")) out.push("缺信條");
    var fm = byId(val("免費藏書序號"));
    if (!fm) out.push("免費藏書序號無效");
    else if (!fm.free) out.push("免費藏書不在初創允許範圍");
    else if (fm.cat !== val("免費藏書分類")) out.push("免費藏書分類與序號不符");
    if (val("是否追加第二本") === "是") {
      var em = byId(val("追加藏書序號"));
      if (!em) out.push("追加藏書序號無效");
      else if (em.id === fm.id) out.push("兩本藏書序號相同");
      if (extraCost() === 99) out.push("追加藏書無法計價");
    }
    if (advCost() === 99) out.push("優勢參數不足");
    if (disCost() === 99) out.push("劣勢參數不足");
    if (remain() < 0) out.push("剩餘功績點為負");
    return out;
  }

  function paintMath() {
    var a = advCost(), d = disCost(), e = extraCost(), r = remain();
    var fm = byId(val("免費藏書序號"));
    var em = byId(val("追加藏書序號"));
    var bad = issues();
    document.getElementById("math").innerHTML =
      "<div><strong>免費藏書</strong>　" + (fm ? "【" + fm.zh + "】" : "尚未指定") + "</div>" +
      "<div><strong>追加藏書</strong>　" + (val("是否追加第二本") === "是" && em ? "【" + em.zh + "】 COST " + e : "無") + "</div>" +
      "<div>起始 3　−　優勢 " + a + "　＋　劣勢 " + d + "　−　追加 " + e + "　＝　<strong>剩餘 " + r + "</strong></div>" +
      "<div>" + (bad.length ? "尚未可送出：" + bad.join("、") : "規則檢查通過，可以送出。") + "</div>";
    document.getElementById("send").disabled = bad.length > 0 || !cfg.webAppUrl;
  }

  function show() {
    panels.forEach(function (p, i) { p.classList.toggle("on", i === step); });
    stepsEl.innerHTML = labels.map(function (t, i) {
      return '<span class="' + (i === step ? "on" : "") + '">' + (i + 1) + " " + t + "</span>";
    }).join("");
    document.getElementById("prev").disabled = step === 0;
    document.getElementById("next").hidden = step === labels.length - 1;
    document.getElementById("send").hidden = step !== labels.length - 1;
    if (step === labels.length - 1) paintMath();
  }

  document.getElementById("prev").onclick = function () { if (step > 0) { step--; show(); } };
  document.getElementById("next").onclick = function () { if (step < labels.length - 1) { step++; show(); } };

  form.addEventListener("submit", function (ev) {
    var bad = issues();
    if (bad.length || !cfg.webAppUrl) {
      ev.preventDefault();
      paintMath();
      return;
    }
    form.action = cfg.webAppUrl;
  });

  show();
  paintMath();
})();
