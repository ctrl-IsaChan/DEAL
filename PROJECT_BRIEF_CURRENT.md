# DEAL 現時 Project Brief

## 產品定位

**DEAL — Park Once, Walk More** 是一個以臺南育樂街為研究場域的步行探索與獎勵網站。

核心行為：先找到合適的機車停車位置，再步行探索店家；完成步行路線與人本交通學習任務，獲得積分並兌換合作店家優惠。

## 目前 MVP

### 首頁

- 優先詢問使用者今天要如何探索
- 騎車：尋找停車位置
- 步行：探索育樂街店家
- 積分：查看步行積分、每日 Quiz 與優惠
- 支援臺灣繁體中文與 English 切換
- QR code 可分享目前網站網址

### 停車頁

- Leaflet + OpenStreetMap 地圖
- 520 個 ZenSVI 街景觀察點
- 以紅色點表示影像中觀察到機車
- 以綠色點表示未偵測到機車的觀察位置
- 顯示示範停車容量
- 即時空位目前標示「尚未連線」，不把 ZenSVI 觀察數或 `remaincar` 冒充即時機車空位
- 不顯示 Mapillary 街景或 Mapillary 地圖入口

### 探索頁

- 從 `育樂街後街一樓使用.xlsx` 的 `usage` 工作表匯入 63 間有名稱及有效座標的商店
- 目前展示飲食類店家
- 顯示店名、類型、平日營業時間
- 每間店有 Google Maps 導航連結
- Friendly status 只顯示正面或中性資訊，不公開負面店家排名

### 積分頁

- 步行積分餘額與下一個優惠進度
- 優惠兌換示範：飲料升級、加料優惠
- 每日一次人本交通 Quiz
- 答對 Quiz 可獲得 1 point
- 使用瀏覽器 `localStorage` 限制同一裝置每日領取一次
- 真正跨裝置防刷需改由後端記錄使用者、日期及 points ledger

### 已移除

- 點餐入口
- Menu
- Cart
- Pickup order flow

## 資料來源

### ZenSVI / view_detected

- 原始分析輸出位於使用者 Desktop 的 `view_detected`
- 應用程式使用其聚合輸出 `detection_points.geojson`
- 每個 feature 代表一個街景影像位置
- `motorcycle_count` 和 `scooter_count` 是影像觀察值，不是停車容量
- `parking_space_count` 是模型對「parking space」文字提示的偵測值，需人工驗證後才可作容量估計
- 目前以約 35 m 空間網格去重並保留每格較高候選值後，網站顯示 125 個 ZenSVI 觀察格、合計 179 個候選機車位；這是影像推估值，不是官方容量或即時空位

### 商店 Excel

- 原始檔案：`育樂街後街一樓使用.xlsx`
- 已轉換為 `shops.json`
- `X` 作經度，`Y` 作緯度
- 原始 Y/N/UNKNOWN 欄位保留
- 未改寫原始 Excel

### 臺南停車即時資料

目前尚未接上即時 API。正式接法：

1. 找到臺南市官方即時停車 API endpoint 與欄位說明。
2. 後端定時抓取資料，不建議由瀏覽器直接呼叫，以避免 CORS、API key 外洩及資料格式不穩定。
3. 只使用有 `moto > 0` 的資料作機車停車點。
4. 確認 API 的即時欄位確實代表機車剩餘位，再映射到 `availability`。
5. 若 API 沒有機車剩餘位，維持 `availability = unknown`，只顯示 `moto_capacity`。
6. 將結果存入 Supabase/Postgres/PostGIS，再由網站讀取。

建議資料欄位：`source_id`, `name_zh`, `latitude`, `longitude`, `moto_capacity`, `available_moto`, `fee_text`, `availability_updated_at`, `is_realtime`。

## Mapillary 接法

目前不在使用者介面顯示 Mapillary 街景。若日後需要重新接入：

`https://www.mapillary.com/app/?lat=22.9957&lng=120.2153&z=16`

要正式讀取 Mapillary API 圖像或 vector tiles：

1. 在 Mapillary developer portal 建立 application。
2. 取得 access token。
3. 不要把長期 token 寫進公開 GitHub Pages JavaScript；應由後端 proxy 或受限制的短期 token 提供。
4. 後端以研究區 bbox 查詢 Mapillary Graph API，再將必要的 image id、座標、拍攝日期和縮圖 URL 傳給前端。
5. 如只需地圖圖層，可使用 Mapillary vector tile endpoint，並在後端注入 token。
6. 需要遵守 Mapillary attribution、使用條款及圖片授權限制。

## 技術

- Standalone HTML/CSS/JavaScript
- Leaflet 1.9.4
- OpenStreetMap tiles
- QRCode.js
- Google Maps search URLs
- Mapillary research-area link with optional API integration plan
- GitHub Pages workflow：`.github/workflows/deploy-pages.yml`

## 目前限制

- 沒有後端使用者帳號、跨裝置積分或 points ledger
- Quiz 每日限制只存在瀏覽器 localStorage
- 停車即時空位 API 尚未提供 endpoint/欄位規格
- Mapillary 正式 API 尚未提供 access token
- 店家照片及優惠目前是 MVP 視覺素材／示範資料，不代表官方商業合作

## Integrated Feature Upgrade

### ParkingAggregationService

- 將每個 ZenSVI feature 的 `motorcycle_count + scooter_count + parking_space_count` 視為候選機車位數。
- 使用約 35 m 空間網格去除相鄰街景影像的重複觀察，保留同一網格中較高的候選值。
- 地圖目前顯示每一個原始 ZenSVI 觀察點，讓使用者知道哪一個位置有機車位；相鄰點仍可能代表重疊視野，因此摘要數字使用去重聚合結果。
- 使用者地圖顯示層會隱藏 `機車位 = 0` 的觀察點，並將相鄰的非零觀察點以每組最多 4 點合併；目前產生 98 個觀察群組。
- 每個 popup 只顯示街名及「機車位：X」，不顯示 image ID、Street View ID 或兩種偵測來源。

### Services

- `auth-service.js`: Firebase adapter interface；目前 prototype 沒有真正登入。
- `step-service.js`: `requestPermission()`, `isAvailable()`, `getTodaySteps()`, `getStepsForDate(date)`；目前使用明確標記的 mock step data。
- `points-ledger-service.js`: local transaction ledger，支援 `earn`、`redeem`、source、metadata 及 walking milestone 去重。
- `leaderboard-service.js`: daily/weekly/monthly sorting、user rank、steps to next rank；目前使用 prototype rows，正式版應移至 server-side query/function。

### Walking rewards

`walkingPoints = floor(min(todaySteps, 10000) / 500)`，每日最多 20 P。已發放的 walking milestones 會寫入 ledger，刷新不會重複發放。

### Account and privacy

- Profile page 顯示暱稱、積分、今日步數、累積步數及排行榜參與設定。
- Leaderboard 只顯示 display name、頭像字母與步數，不顯示 email。
- `leaderboardDisplayName` 和 opt-in 欄位應由 Firebase/資料庫保存；prototype 只保存部分設定於 localStorage。

### Required production configuration

1. 建立 Firebase project，啟用 Google provider 及 Email/Password provider。
2. 將 Firebase web config 放入部署環境變數或受控設定檔，不把 service account key 放進 GitHub Pages。
3. 建立 `users`, `daily_step_summaries`, `points_ledger`, `rewards`, `redemptions` collections/tables。
4. 用 Firebase Security Rules 或 Supabase RLS 限制使用者只能寫自己的步數摘要及交易，排行榜只讀公開暱稱、頭像和步數。
5. iOS 以原生 wrapper 實作 HealthKit adapter，Android 以 Health Connect adapter；兩者只回傳每日摘要，不上傳每一步。
6. 用 Cloud Function/Edge Function 驗證 milestone、寫入 points ledger、計算排行榜，避免客戶端自行加分。

### Current mock data

- `StepService` 的 6,240 今日步數。
- Prototype user profile 及 leaderboard rows。
- 示範停車卡容量與優惠內容。
- Mapillary 目前是研究區連結，不是 API 圖像串流；正式 API 需要 token 和後端 proxy。
