(function () {
  var magics = [];
  var step = 0;
  var form = document.getElementById("form");
  var panels = [].slice.call(document.querySelectorAll(".panel"));
  var stepsEl = document.getElementById("steps");
  var labels = ["申請人", "學派", "藏書", "特記", "確認"];
  var cfg = window.MH_CONFIG || {};
  var CATS_FREE = ["經歷魔法", "機關魔法", "學派魔法", "餐飲魔法", "醫療魔法"];
  var CATS_EXTRA = CATS_FREE.concat(["遺失魔法"]);

  var params = new URLSearchParams(location.search);
  var banner = document.getElementById("banner");
  if (params.get("ok") === "1") {
    banner.innerHTML = '<p class="notice ok">申請已寫入 master「申請」。核准後才會出現在名冊與自動角卡。</p>';
  } else if (params.get("err")) {
    banner.innerHTML = '<p class="notice bad">送出失敗：' + params.get("err") + "</p>";
  }

  document.getElementById("returnField").value = location.href.split("?")[0];

  function fillCat(sel, cats) {
    sel.innerHTML = cats.map(function (c) { return "<option>" + c + "</option>"; }).join("");
  }
  fillCat(document.getElementById("freeCat"), CATS_FREE);
  fillCat(document.getElementById("extraCat"), CATS_EXTRA);

  fetch("data/magics.json").then(function (r) { return r.json(); }).then(function (rows) {
    magics = rows;
    fillMagic("free");
    fillMagic("extra");
  });

  function byId(id) {
    id = Number(id);
    for (var i = 0; i < magics.length; i++) if (magics[i].id === id) return magics[i];
    return null;
  }

  function fillMagic(which) {
    var cat = document.getElementById(which === "free" ? "freeCat" : "extraCat").value;
    var pick = document.getElementById(which === "free" ? "freePick" : "extraPick");
    var wantFree = which === "free";
    var list = magics.filter(function (m) {
      if (m.cat !== cat && !(cat === "遺失魔法" && m.cat === "遺失魔法")) return false;
      return wantFree ? m.free : (m.paid || m.free);
    });
    pick.innerHTML = '<option value="">請選擇魔法（' + list.length + "）</option>" +
      list.map(function (m) {
        return '<option value="' + m.id + '">【' + m.zh + "】 " + m.id + "　" + m.type + "</option>";
      }).join("");
    hint(which);
  }

  function hint(which) {
    var pick = document.getElementById(which === "free" ? "freePick" : "extraPick");
    var hid = document.getElementById(which === "free" ? "freeId" : "extraId");
    var out = document.getElementById(which === "free" ? "freeHint" : "extraHint");
    hid.value = pick.value || "";
    var m = byId(pick.value);
    out.textContent = m ? (m.cat + "　COST " + (m.cost == null ? "—" : m.cost)) : "";
  }

  function val(name) {
    var el = form.elements[name];
    if (!el) return "";
    if (el.length && el[0] && el[0].type === "checkbox") return "";
    return String(el.value || "").trim();
  }

  function syncToggles() {
    var origin = val("誕生背景");
    document.getElementById("originExtra").hidden = origin !== "自行描述";
    document.getElementById("originHint").textContent =
      origin === "自行描述" ? "請在下面寫你的設定。" : "可略過補述。勾選下方才會展開成員／徽章。";
    document.getElementById("flavourBox").hidden = !document.getElementById("wantFlavour").checked;
    document.getElementById("extraBox").hidden = !document.getElementById("wantExtra").checked;
    document.getElementById("extraHidden").value = document.getElementById("wantExtra").checked ? "是" : "否";
    document.getElementById("advBox").hidden = !document.getElementById("wantAdv").checked;
    document.getElementById("disBox").hidden = !document.getElementById("wantDis").checked;
    document.getElementById("noteBox").hidden = !document.getElementById("wantNote").checked;
    document.getElementById("advHidden").value = document.getElementById("wantAdv").checked
      ? (document.getElementById("advPick").value || "")
      : "不選擇優勢";
    document.getElementById("disHidden").value = document.getElementById("wantDis").checked
      ? (document.getElementById("disPick").value || "")
      : "不選擇劣勢";
    if (!document.getElementById("wantExtra").checked) {
      document.getElementById("extraPick").value = "";
      document.getElementById("extraId").value = "";
    }
    var adv = document.getElementById("advHidden").value;
    [].forEach.call(document.querySelectorAll("[data-adv]"), function (el) {
      el.hidden = el.getAttribute("data-adv") !== adv;
    });
    var dis = document.getElementById("disHidden").value;
    [].forEach.call(document.querySelectorAll("[data-dis]"), function (el) {
      el.hidden = el.getAttribute("data-dis") !== dis;
    });
    var styles = [].filter.call(document.querySelectorAll(".stylePick"), function (c) { return c.checked; })
      .map(function (c) { return c.value; });
    document.getElementById("styleHidden").value = styles.join("、");
    document.getElementById("advRule").textContent = advRule(adv);
    document.getElementById("disRule").textContent = disRule(dis);
  }

  function advRule(s) {
    if (s.indexOf("備品：魔素") === 0) return "選一種魔素。這個學派的 PC 開局獲得 1 個。COST 2，最多取兩次（初創只能 1 個特記）。";
    if (s.indexOf("備品：道具") === 0) return "只限所需功績點 2 以下的道具。COST＝該道具功績×3。";
    if (s.indexOf("專業性") === 0) return "一局僅能重骰一次你指定的判定。COST 3。";
    if (s.indexOf("獨有的魔法體系") === 0) return "使用該類型前每耗 1 魔力，判定 +1。COST 5（通常要搭配劣勢才夠點）。";
    if (s.indexOf("異境大本營") === 0) return "這個學派的 PC 不受該世界法則影響。COST 5。";
    if (s.indexOf("學派特性") === 0) return "全學派可無視學派習得條件做該預兆。COST＝預兆 COST×5。";
    return "";
  }

  function disRule(s) {
    if (s.indexOf("限制：領域") === 0) return "沒有該領域特技的 PC 視為臨時所屬（不能用學派魔法與優勢）。+1 點。";
    if (s.indexOf("限制：樣式") === 0) return "請勾恰好 2 個允許樣式。+2 點。";
    if (s.indexOf("藏書缺失") === 0) return "這個學派的 PC 無法習得該 COST 種類的泛用魔法。+3 點。";
    if (s.indexOf("封建") === 0) return "結束階段能獲得的功績點減少 1。+3 點。";
    if (s.indexOf("稀薄") === 0) return "決定魔力最大值時多骰一顆、取最低。+4 點。";
    if (s.indexOf("學派病") === 0) return "該病成為痼疾，且不能從痼疾效果拿功績點。加回的點數＝強度。";
    return "";
  }

  function advCost() {
    var s = document.getElementById("advHidden").value;
    if (!s || s === "不選擇優勢") return 0;
    if (s.indexOf("備品：魔素") === 0) return 2;
    if (s.indexOf("備品：道具") === 0) {
      var n = Number(val("備品道具功績點"));
      return n ? n * 3 : 99;
    }
    if (s.indexOf("專業性") === 0) return val("專業性判定") ? 3 : 99;
    if (s.indexOf("獨有的魔法體系") === 0) return val("獨有體系") ? 5 : 99;
    if (s.indexOf("異境大本營") === 0) return val("世界法則阻礙") ? 5 : 99;
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
    var s = document.getElementById("disHidden").value;
    if (!s || s === "不選擇劣勢") return 0;
    if (s.indexOf("限制：領域") === 0) return val("限制領域") ? 1 : 99;
    if (s.indexOf("限制：樣式") === 0) {
      var n = document.getElementById("styleHidden").value.split("、").filter(Boolean).length;
      return n === 2 ? 2 : 99;
    }
    if (s.indexOf("藏書缺失") === 0) return val("藏書缺失種類") ? 3 : 99;
    if (s.indexOf("封建") === 0) return 3;
    if (s.indexOf("稀薄") === 0) return 4;
    if (s.indexOf("學派病") === 0) {
      var n = Number(val("學派病強度"));
      return n > 0 && val("學派病名稱") ? n : 99;
    }
    return 99;
  }

  function extraCost() {
    if (document.getElementById("extraHidden").value !== "是") return 0;
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

  function remain() { return 3 - advCost() + disCost() - extraCost(); }

  function issues() {
    var out = [];
    if (!val("管理人")) out.push("缺管理人");
    if (!val("學派名")) out.push("缺學派名");
    if (!val("信條")) out.push("缺信條");
    if (val("誕生背景") === "自行描述" && !val("誕生背景補述")) out.push("請描述誕生背景");
    var fm = byId(val("免費藏書序號"));
    if (!fm) out.push("請選免費藏書");
    if (document.getElementById("extraHidden").value === "是") {
      var em = byId(val("追加藏書序號"));
      if (!em) out.push("請選追加藏書");
      else if (fm && em.id === fm.id) out.push("兩本不能同一筆");
      if (extraCost() === 99) out.push("追加藏書無法計價");
    }
    if (document.getElementById("wantAdv").checked && !document.getElementById("advPick").value) out.push("請選優勢種類");
    if (document.getElementById("wantDis").checked && !document.getElementById("disPick").value) out.push("請選劣勢種類");
    if (advCost() === 99) out.push("優勢還有欄位沒填");
    if (disCost() === 99) out.push("劣勢還有欄位沒填（樣式請勾恰好 2 個）");
    if (remain() < 0) out.push("剩餘功績點不足");
    return out;
  }

  function paintMath() {
    syncToggles();
    var a = advCost(), d = disCost(), e = extraCost(), r = remain();
    var fm = byId(val("免費藏書序號"));
    var em = byId(val("追加藏書序號"));
    var bad = issues();
    var html =
      "<div><strong>剩餘功績點 " + r + "</strong>　（3 − 優勢 " + a + " ＋ 劣勢 " + d + " − 追加 " + e + "）</div>" +
      "<div>免費　" + (fm ? "【" + fm.zh + "】" : "尚未選") +
      (document.getElementById("extraHidden").value === "是" ? "　＋　" + (em ? "【" + em.zh + "】" : "尚未選") : "") + "</div>" +
      "<div>" + (bad.length ? bad.join("、") : "可以送出") + "</div>";
    document.getElementById("math").innerHTML = html;
    document.getElementById("mathMini").innerHTML = html;
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
    document.getElementById("mathMini").hidden = step === labels.length - 1;
    paintMath();
  }

  document.getElementById("freeCat").addEventListener("change", function () { fillMagic("free"); paintMath(); });
  document.getElementById("extraCat").addEventListener("change", function () { fillMagic("extra"); paintMath(); });
  document.getElementById("freePick").addEventListener("change", function () { hint("free"); paintMath(); });
  document.getElementById("extraPick").addEventListener("change", function () { hint("extra"); paintMath(); });
  ["wantFlavour", "wantExtra", "wantAdv", "wantDis", "wantNote", "origin", "advPick", "disPick"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", paintMath);
  });
  [].forEach.call(document.querySelectorAll(".stylePick"), function (c) {
    c.addEventListener("change", function () {
      var on = [].filter.call(document.querySelectorAll(".stylePick"), function (x) { return x.checked; });
      if (on.length > 2) c.checked = false;
      paintMath();
    });
  });
  form.addEventListener("input", paintMath);

  document.getElementById("prev").onclick = function () { if (step > 0) { step--; show(); } };
  document.getElementById("next").onclick = function () { if (step < labels.length - 1) { step++; show(); } };
  form.addEventListener("submit", function (ev) {
    paintMath();
    var bad = issues();
    if (bad.length || !cfg.webAppUrl) {
      ev.preventDefault();
      return;
    }
    form.action = cfg.webAppUrl;
  });

  show();
})();
