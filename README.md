# 魔導書大戰　學派統合入口

GitHub Pages 上的支流學派申請入口。玩家不用複製自動角卡。送出後寫入 Google **學派統合列表**；你核准後，自動角卡用 `IMPORTRANGE` 讀取。

- 入口（啟用 Pages 後）：https://me0wx-lr.github.io/magitech-hearts-school-portal/
- Master：https://docs.google.com/spreadsheets/d/1lBDzpsWRfRiL2Bi1wR5jkeDEfZJKPz-loS3m24q0esc/edit
- 規則：《蒐集日記》3.06 學派初創

```
玩家 → GitHub Pages 表單
     → Apps Script Web App
     → master「申請」（公式驗算）
     → 你按「發布」
     → master「學派表」
     → 自動角卡 IMPORTRANGE
```

## 1. 打開 GitHub Pages

Repo Settings → Pages → Build from **main** / **root** (`/`).

約一分鐘後可開：

`https://me0wx-lr.github.io/magitech-hearts-school-portal/`

此時名冊先顯示官方 15 校（`data/official.json`）。接上 Web App 後改讀 master。

## 2. 在 master 部署 Web App

1. 開啟 master 試算表 → **擴充功能 → Apps Script**
2. 用本 repo 的 [`apps-script/Code.gs`](apps-script/Code.gs) **全部取代**
3. 儲存
4. **部署 → 新部署**
   - 類型：**網頁應用程式**
   - 執行身分：**我**
   - 存取對象：**任何人**
5. 授權
6. 複製 Web App 網址（`https://script.google.com/macros/s/…/exec`）
7. 貼進 [`assets/config.js`](assets/config.js) 的 `webAppUrl`，commit、push

重新整理入口，申請頁即可送出。

## 3. 自動角卡讀 master

在**戰役用**自動角卡（不要改公開「請自行複製副本」範本也行，但戰役檔一定要改）的「學派表」A1：

```
=IMPORTRANGE("1lBDzpsWRfRiL2Bi1wR5jkeDEfZJKPz-loS3m24q0esc","學派表!A1:D")
```

允許存取。學派下拉改成 `'學派表'!$A$2:$A$200`。

Master 請設「知道連結的人可**檢視**」；審核者可編輯。玩家不必進試算表。

## 4. 審核

Master 選單 **學派統合 → 發布已核准的初創申請**。  
只會發布「申請」裡驗證結果＝待審核、驗證訊息＝通過的初創列。名稱以「測試」開頭的列會跳過。

## 目錄

| 路徑 | 用途 |
|---|---|
| `index.html` | 學派名冊 |
| `apply.html` | 3.06 申請（即時 COST） |
| `data/magics.json` | 492 筆序號對照 |
| `data/official.json` | 官方 15 校後備 |
| `apps-script/Code.gs` | 寫入申請、列出學派、發布 |

## 授權

MIT
