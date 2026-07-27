# Trump TACO Index｜川普政策退縮壓力指數

一個可部署至 GitHub Pages 的繁體中文靜態金融資料視覺化專案。網站以 Brent 原油、美國 10 年期公債殖利率、荷姆茲海峽通行量與 S&P 500 建立可解釋的代理市場壓力指標，用來觀察市場是否接近過往敘事中的政策轉向區域。

> 本站不是 Signum Global Advisors 官方指數，不預測 Donald Trump 必然改變政策，也不構成投資建議。版本庫預設保留明確標示的 demo 資料；市場指數可由 Actions 切換為真實延遲日資料，事件時間軸目前仍是 demo。

## 技術與架構

- React、TypeScript strict mode、Vite
- Recharts
- Zod 外部 JSON schema validation
- ESLint、Vitest
- GitHub Actions、GitHub Pages 官方 Actions
- 純靜態前端，只讀取 `public/data/*.json`

瀏覽器不會呼叫需要 Secret 的服務。任何需要 API Key 的抓取工作都在 GitHub Actions 中執行，並由 GitHub Secrets 提供憑證。

## 本機開發

需求：Node.js 22 與 npm。

```bash
npm install
npm run dev
```

Vite 會顯示本機網址。其他常用指令：

```bash
npm run lint
npm run test
npm run build
npm run data:update
npm run data:update -- --dry-run
npm run data:backfill
npm run data:test
```

`npm run data:update` 預設使用可重現、非隨機的 demo provider。設定 `DATA_PROVIDER=live` 後會讀取 FRED 與 IMF PortWatch；加上 `--dry-run` 會實際抓取、計算及驗證，但不修改 JSON。
資料檔修改後另執行 `python3 scripts/validate_data.py`，以獨立驗證器檢查必要欄位、日期、範圍與排序。
真實資料發布前使用 `python3 scripts/validate_data.py --require-live`，額外阻擋非 delayed、缺少來源 URL、過期、日期不一致或含 demo／simulated／manual 標記的資料。Freshness 從觀測日結束時間起算：FRED Brent 為 192 小時、10Y 與 S&P 500 為 96 小時、PortWatch 為 240 小時，以容納各來源不同的週末與發布延遲。

## GitHub Pages 啟用

1. 將 repository 推送到 GitHub，預設分支命名為 `main`。
2. 到 **Settings → Pages → Build and deployment**。
3. Source 選擇 **GitHub Actions**。
4. 推送到 `main`；`.github/workflows/deploy.yml` 會依序執行 lint、test、build 並部署 `dist`。
5. 部署網址通常為 `https://USERNAME.github.io/REPOSITORY_NAME/`。

### Repository name 與 Vite base path

`vite.config.ts` 在 GitHub Actions 內會從 `GITHUB_REPOSITORY` 自動取得 repository name，設定成 `/<repository-name>/`；本機開發仍使用 `/`。因此不必把專案名稱硬編碼在 React 元件中。

若 repository 是 GitHub Pages 的特殊根網站（例如 `USERNAME.github.io`），請把 `vite.config.ts` 的 base 判斷改成 `/`。

SEO 檔案中的 `USERNAME` 是公開網址 placeholder；上線前請在 `index.html`、`public/robots.txt`、`public/sitemap.xml` 替換為實際帳號。若 repository name 也更改，一併更新 canonical 與 Open Graph URL。

## Actions 權限

部署 workflow 已宣告：

- `contents: read`
- `pages: write`
- `id-token: write`

資料更新 workflow 需要 `contents: write` 才能由 `github-actions[bot]` 提交 JSON。若組織政策阻擋，請到 **Settings → Actions → General → Workflow permissions** 允許 Read and write permissions，或改用受保護的 GitHub App token。若 `main` 有 branch protection，需讓 bot 符合規則，或改成由 workflow 建立 PR。

## API Secrets 與 provider

在 **Settings → Secrets and variables → Actions** 新增需要的 repository secrets：

- `FRED_API_KEY`：FRED 的 `DCOILBRENTEU`、`DGS10`、`SP500` 三個系列。

Hormuz 使用 IMF PortWatch 公開的 `Daily_Chokepoints_Data`、`portid=chokepoint6`、`n_total`，不需要憑證。三個 FRED 指標標示為 delayed；Hormuz 也標示為 delayed，單位是 `vessels/day`。前端不會接觸 API Key，也不會把日資料顯示成即時行情。

在 Actions variables 設定 `DATA_PROVIDER=live` 才會讓排程發布真實資料。未設定 Secret、來源失敗、少於「目前值＋前 60 筆」、日期或 schema 驗證失敗時，腳本會：

1. 顯示清楚錯誤並讓 job 失敗。
2. 不覆蓋最後一份有效 JSON。
3. 保留既有 `lastSuccessfulUpdate`，不混用不同更新批次。
4. 讓前端依時間門檻顯示「資料更新延遲」。
5. 絕不默默改用隨機資料。

Provider 最多嘗試 3 次，每次失敗都有明確 log；不使用無限重試。

當 `DATA_PROVIDER` 不是 `live` 時，六小時排程會直接跳過，不會把 demo 覆蓋到已發布的真實資料。手動 workflow 仍可明確選擇 demo。部署完成後會最多重試三次讀取線上 `data/latest.json`，並確認它與該次部署 revision 的 repository 資料一致；live 模式同時執行完整 live-readiness gate。

前端程式碼不可加入任何 API Key、Token 或 Secret。

## 資料檔案

- `public/data/latest.json`：最新指數、四項指標、資料時間及資料狀態。
- `public/data/history.json`：歷史分數、綜合 Z-score 與各指標 Z-score。
- `public/data/events.json`：政策威脅、客觀市場反應、後續調整與來源。
- `data/manual/hormuz-transit.json`：保留的人工示範資料；live provider 不會自動 fallback 到此檔。

所有外部 JSON 在前端以 Zod 驗證；格式錯誤會顯示明確錯誤，不會渲染成看似有效的數據。

### 人工荷姆茲示範資料

1. 編輯 `data/manual/hormuz-transit.json` 的 `observations`。
2. 日期使用 `YYYY-MM-DD`，數值單位必須與 `metadata.unit` 一致。
3. 按日期由舊到新排序，至少保留 60 個交易日以符合預設 rolling window。
4. `source` 只記錄來源名稱或短標題，不複製新聞全文。
5. 執行 `npm run data:update`、`npm run test` 與 `npm run build`。
6. 介面固定標示「人工維護／非即時資料」。

此檔只供 demo／人工測試；啟用 live 後不會讀取或自動回退至人工值。

## 指數公式

預設 rolling window 為 60 個交易日：

```text
z = (currentValue - rollingMean) / rollingStandardDeviation
```

方向調整：

```text
brentPressure   = max(0,  brentZ)
treasuryPressure= max(0,  treasuryZ)
hormuzPressure  = max(0, -hormuzZ)
sp500Pressure   = max(0, -sp500Z)
```

代理權重集中在 `src/config/indexConfig.ts`：

```text
compositeZ =
  brentPressure × 0.30 +
  treasuryPressure × 0.25 +
  hormuzPressure × 0.25 +
  sp500Pressure × 0.20
```

`src/lib/tacoIndex.ts` 再以分段線性方式把 compositeZ 轉為 0～100：

| 綜合標準差 | 分數 |
|---:|---:|
| 0.0σ | 0 |
| 1.0σ | 30 |
| 2.0σ | 60 |
| 2.9σ | 85 |
| 3.4σ 以上 | 100 |

權重、rolling window、資料過期門檻、分數斷點與狀態區間皆集中在 config，修改後請同步執行測試。

## 新增歷史 TACO 事件

在 `public/data/events.json` 新增符合既有 schema 的物件：

- `threatDate`：強硬政策或威脅日期。
- `pivotDate`：延後、縮小、豁免或撤回日期；未發生時為 `null`。
- `daysToPivot`：兩日期間隔；未發生時為 `null`。
- `tacoClassification`：`likely`、`possible`、`unlikely` 或 `pending`。
- `confidence`：`high`、`medium` 或 `low`。
- `sources`：只保存標題、publisher、日期與 URL。

每項敘述應分開標示政策事實、市場數據與分析分類。不可把「符合 TACO」寫成已證明的因果關係，也不可直接複製新聞全文。

## 從 demo 切換為真實延遲資料

1. 在 repository secret 設定 `FRED_API_KEY`，Variables 暫時保留 `DATA_PROVIDER=demo`。
2. 手動執行 **Update TACO market data**，選 `provider=live`、`publish=false`；連續三次 dry-run 成功，並抽查四項來源值與日期。
3. 將 Actions variable `DATA_PROVIDER` 改為 `live`。
4. 手動執行一次 `provider=live`、`publish=true`。若上一版是 demo，腳本會把 demo 歷史清除，只保留第一筆真實指數。
5. 檢查線上 `latest.json` 的 `dataMode=delayed`、四張卡片的 `asOfDate`、來源連結及狀態。
6. 觀察七天排程；任何來源失敗都應保留整批上一版，不得出現隨機 fallback。

若需要暫停 live 更新，將 `DATA_PROVIDER` 改回 `demo`。排程會停止發布，但網站仍保留最後一份有效真實資料；不要手動執行 demo publish。

`update-data.yml` 每 6 小時執行一次，也支援 `workflow_dispatch`。只有資料變更時才會提交，commit message 為 `chore(data): update TACO market data`。

### 一次性歷史 backfill

先在本機或受控 workflow 執行：

```bash
DATA_PROVIDER=live FRED_API_KEY=*** npm run data:backfill
```

預設只抓取約 18 個月來源資料並驗證最近 252 個 S&P 交易日，不寫檔。確認日期排序、分數範圍與抽樣計算後，再執行：

```bash
FRED_API_KEY=*** npm run data:backfill -- --publish
python3 scripts/validate_data.py
```

Brent 與 10Y 使用同日或之前最近有效值，最大間隔 7 日；Hormuz 最大間隔 3 日。每點只使用該日期以前 60 筆觀測，不使用未來資料。日常排程只新增或取代最新日期。

## 資料來源授權與引用

- 優先使用官方、可機器讀取且允許再發布的來源。
- API 可存取不等於資料可公開再散布；必須閱讀服務條款。
- 不保存 API Secret、付費回應原文或受限制的完整資料集。
- 新聞引用只保留標題、來源、發布日期與連結。
- 歷史市場反應應記錄觀察窗口、時區、單位與調整方式。
- FRED Brent、10Y 與 S&P 500 各有來源說明；尤其 S&P 500 須保留 FRED 系列頁的版權與再發布提示，本站只公開最新值與衍生統計，不重新發布完整原始序列。
- Hormuz 引用建議保留「Sources: UN Global Platform; IMF PortWatch (portwatch.imf.org)」，並說明 AIS 可能漏報、延遲或修訂。

## 免責聲明

本專案僅為市場觀察、資料視覺化、教育與研究用途。原始 Signum 模型的完整公式與權重未公開，本站採用的權重、Z-score、門檻與事件分類都是可調整的代理模型。高分只表示四項代理市場變數呈現較高壓力，不表示任何人物、政府或機構必然採取特定行動。本專案不構成投資、法律、稅務或政策建議。
