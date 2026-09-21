(function () {
  var cfg = window.MH_CONFIG || {};
  var magics = [];
  var cards = [];
  var form = document.getElementById("form");
  var UP = {1: 10, 2: 20, 3: 30, 4: 50};
  var CATS = ["經歷魔法", "機關魔法", "學派魔法", "餐飲魔法", "醫療魔法", "遺失魔法"];

  document.getElementById("returnField").value = location.href.split("?")[0];
  var banner = document.getElementById("banner");
  var qs = new URLSearchParams(location.search);
  if (qs.get("ok") === "1") banner.innerHTML = '<p class="notice ok">已送出。請等 GM 在 master 發布後，名冊才會更新。</p>';
  else if (qs.get("err")) banner.innerHTML = '<p class="notice bad">送出失敗：' + qs.get("err") + "</p>";

  document.getElementById("extraCat").innerHTML = CATS.map(function (c) { return "<option>" + c + "</option>"; }).join("");

  fetch("data/magics.json").then(function (r) { return r.json(); }).then(function (rows) {
    magics = rows;
    fillMagic();
  });

  if (cfg.webAppUrl) {
    MH.jsonp(cfg.webAppUrl + "?action=cards").then(function (data) {
      cards = (data && data.cards) || [];
      fillSchools();
      paint();
    }).catch(function () {
      document.getElementById("statusBox").textContent = "讀不到已核准學派。請確認 Web App 已重新部署。";
    });
  } else {
    document.getElementById("statusBox").textContent = "尚未設定 Web App。";
  }

  function fillSchools() {
    var sel = document.getElementById("schoolPick");
    if (!cards.length) {
      sel.innerHTML = '<option value="">尚無已核准自創學派</option>';
      return;
    }
    sel.innerHTML = '<option value="">請選擇</option>' + cards.map(function (c, i) {
      return '<option value="' + i + '">' + c.name + "　Lv." + c.level + "　剩餘" + c.remain + "</option>";
    }).join("");
  }

  function current() {
    var i = document.getElementById("schoolPick").value;
    return i === "" ? null : cards[Number(i)];
  }

  function byId(id) {
    id = Number(id);
    for (var i = 0; i < magics.length; i++) if (magics[i].id === id) return magics[i];
    return null;
  }

  function fillMagic() {
    var cat = document.getElementById("extraCat").value;
    var list = magics.filter(function (m) { return m.cat === cat && (m.paid || m.free); });
    document.getElementById("extraPick").innerHTML =
      '<option value="">請選擇（' + list.length + "）</option>" +
      list.map(function (m) {
        return '<option value="' + m.id + '">【' + m.zh + "】 " + m.id + "</option>";
      }).join("");
  }

  function optionKey(id) {
    var sel = document.getElementById(id);
    var opt = sel && sel.options[sel.selectedIndex];
    return (opt && opt.getAttribute("data-key")) || "";
  }

  function val(name) {
    var el = form.elements[name];
    return el ? String(el.value || "").trim() : "";
  }

  function gainTotal() {
    if (!document.getElementById("wantGain").checked) return 0;
    var n = 0;
    var cond = [];
    [].forEach.call(document.querySelectorAll(".gain"), function (c) {
      if (!c.checked) return;
      if (c.value === "成員活躍") n += Math.max(1, Number(document.getElementById("activeN").value) || 0);
      else n += 1;
      cond.push(c.value);
    });
    document.getElementById("gainCond").value = cond.join("、");
    document.getElementById("gainPts").value = String(n);
    return n;
  }

  function extraCost(school) {
    if (!document.getElementById("wantBook").checked) return 0;
    var p = val("追加藏書分類");
    var expCount = (school && school.expCount) || 0;
    var orgCount = (school && school.orgCount) || 0;
    if (p === "經歷魔法") return 3 + expCount;
    if (p === "機關魔法") return 4 + orgCount;
    if (p === "學派魔法") return 3;
    if (p === "餐飲魔法" || p === "醫療魔法") return 2;
    if (p === "遺失魔法") {
      var m = byId(document.getElementById("extraPick").value);
      return m && m.cost != null ? 2 + m.cost : 99;
    }
    return 99;
  }

  function traitCost() {
    if (!document.getElementById("wantTrait").checked) return {adv: 0, dis: 0};
    var raw = document.getElementById("traitPick").value;
    if (!raw) return {adv: 99, dis: 0};
    var kind = raw.slice(0, 3);
    var s = raw.slice(4);
    if (kind === "adv") {
      if (s.indexOf("備品：魔素") === 0) return {adv: 2, dis: 0};
      if (s.indexOf("備品：道具") === 0) {
        var n = Number(val("備品道具功績點"));
        return {adv: n ? n * 3 : 99, dis: 0};
      }
      if (s.indexOf("專業性") === 0) return {adv: val("專業性判定") ? 3 : 99, dis: 0};
      if (s.indexOf("獨有的魔法體系") === 0) return {adv: val("獨有體系") ? 5 : 99, dis: 0};
      if (s.indexOf("異境大本營") === 0) return {adv: val("世界法則阻礙") ? 5 : 99, dis: 0};
      if (s.indexOf("學派特性") === 0) {
        var z = val("學派特性預兆");
        if (/臨床|惡食/.test(z)) return {adv: 5, dis: 0};
        if (/異境血脈|復仇心/.test(z)) return {adv: 10, dis: 0};
        if (/古老魔法/.test(z)) return {adv: 15, dis: 0};
        return {adv: 99, dis: 0};
      }
    }
    if (s.indexOf("限制：領域") === 0) return {adv: 0, dis: val("限制領域") ? 1 : 99};
    if (s.indexOf("限制：樣式") === 0) {
      var st = document.getElementById("styleHidden").value.split("、").filter(Boolean).length;
      return {adv: 0, dis: st === 2 ? 2 : 99};
    }
    if (s.indexOf("藏書缺失") === 0) return {adv: 0, dis: val("藏書缺失種類") ? 3 : 99};
    if (s.indexOf("封建") === 0) return {adv: 0, dis: 3};
    if (s.indexOf("稀薄") === 0) return {adv: 0, dis: 4};
    if (s.indexOf("學派病") === 0) {
      var d = Number(val("學派病強度"));
      return {adv: 0, dis: d > 0 && val("學派病名稱") ? d : 99};
    }
    return {adv: 99, dis: 0};
  }

  function paint() {
    var s = current();
    document.getElementById("gainBox").hidden = !document.getElementById("wantGain").checked;
    document.getElementById("activeBox").hidden = !document.querySelector('.gain[value="成員活躍"]').checked;
    document.getElementById("bookBox").hidden = !document.getElementById("wantBook").checked;
    document.getElementById("traitBox").hidden = !document.getElementById("wantTrait").checked;
    document.getElementById("upHidden").value = document.getElementById("wantUp").checked ? "是" : "否";
    document.getElementById("extraHidden").value = document.getElementById("wantBook").checked ? "是" : "否";
    document.getElementById("extraId").value = document.getElementById("extraPick").value || "";
    var styles = [].filter.call(document.querySelectorAll(".stylePick"), function (c) { return c.checked; }).map(function (c) { return c.value; });
    document.getElementById("styleHidden").value = styles.join("、");
    var raw = document.getElementById("traitPick").value;
    if (!document.getElementById("wantTrait").checked || !raw) {
      document.getElementById("advHidden").value = "不選擇優勢";
      document.getElementById("disHidden").value = "不選擇劣勢";
    } else if (raw.indexOf("adv:") === 0) {
      document.getElementById("advHidden").value = raw.slice(4);
      document.getElementById("disHidden").value = "不選擇劣勢";
    } else {
      document.getElementById("advHidden").value = "不選擇優勢";
      document.getElementById("disHidden").value = raw.slice(4);
    }
    var key = document.getElementById("wantTrait").checked ? optionKey("traitPick") : "";
    [].forEach.call(document.querySelectorAll(".reveal[data-for]"), function (el) {
      el.classList.toggle("open", el.getAttribute("data-for") === key);
    });

    var lines = [];
    var bad = [];
    if (!s) bad.push("請選擇學派");
    else {
      document.getElementById("nameHidden").value = s.name;
      document.getElementById("targetHidden").value = s.name;
      var upCost = UP[s.level] || 99;
      document.getElementById("schoolHint").textContent =
        "管理人 " + (s.manager || "—") + "　等級 " + s.level + "　剩餘功績 " + s.remain +
        "　藏書 " + s.books + "/" + s.maxBooks + "　優勢 " + s.adv + "／劣勢 " + s.dis +
        "　成長界限 " + s.cap;
      document.getElementById("upHint").textContent = document.getElementById("wantUp").checked
        ? ("由 " + s.level + " 升到 " + (s.level + 1) + " 需支付 " + upCost)
        : ("現在 Lv." + s.level + "，下一級 COST " + upCost);
      lines.push("目前剩餘 " + s.remain);
      var after = Number(s.remain) + gainTotal();
      lines.push("本局登記 +" + gainTotal() + " → " + after);
      if (document.getElementById("wantUp").checked) {
        after -= upCost;
        lines.push("升級 −" + upCost + " → " + after);
        if (Number(s.remain) + gainTotal() < upCost) bad.push("升級點數不足");
        if (s.level >= 4) bad.push("已是表上最高等級");
      }
      var bc = extraCost(s);
      if (document.getElementById("wantBook").checked) {
        after -= bc;
        lines.push("追加藏書 −" + bc + " → " + after);
        if (!document.getElementById("extraPick").value) bad.push("請選追加魔法");
        if (s.books >= s.maxBooks) bad.push("已達最大藏書數");
        if (bc === 99) bad.push("追加藏書無法計價");
      }
      var tc = traitCost();
      if (document.getElementById("wantTrait").checked) {
        after = after - tc.adv + tc.dis;
        lines.push("特記 優勢" + tc.adv + "／劣勢+" + tc.dis + " → " + after);
        if (!document.getElementById("traitPick").value) bad.push("請選特記");
        if (tc.adv === 99 || tc.dis === 99) bad.push("特記欄位未填完");
        if (tc.adv && s.adv >= s.level) bad.push("優勢數量不能超過學派等級");
        if (tc.dis && s.dis >= s.level) bad.push("劣勢數量不能超過學派等級");
      }
      if (after < 0) bad.push("剩餘會變成負數");
      if (!document.getElementById("wantGain").checked &&
          !document.getElementById("wantUp").checked &&
          !document.getElementById("wantBook").checked &&
          !document.getElementById("wantTrait").checked) bad.push("請至少勾一項變更");
    }
    if (!val("管理人")) bad.push("缺管理人");
    lines.push(bad.length ? bad.join("、") : "可以送出給 GM");
    document.getElementById("math").innerHTML = lines.map(function (t) { return "<div>" + t + "</div>"; }).join("");
    document.getElementById("statusBox").innerHTML = s
      ? "<strong>" + s.name + "</strong>　Lv." + s.level + "　剩餘 " + s.remain
      : "請選擇已核准的自創學派";
    document.getElementById("send").disabled = bad.length > 0 || !cfg.webAppUrl;
  }

  form.addEventListener("input", paint);
  form.addEventListener("change", paint);
  document.getElementById("extraCat").addEventListener("change", function () { fillMagic(); paint(); });
  document.getElementById("schoolPick").addEventListener("change", paint);
  [].forEach.call(document.querySelectorAll(".stylePick"), function (c) {
    c.addEventListener("change", function () {
      var on = [].filter.call(document.querySelectorAll(".stylePick"), function (x) { return x.checked; });
      if (on.length > 2) c.checked = false;
      paint();
    });
  });
  form.addEventListener("submit", function (ev) {
    paint();
    if (document.getElementById("send").disabled) ev.preventDefault();
    else form.action = cfg.webAppUrl;
  });
  paint();
})();
