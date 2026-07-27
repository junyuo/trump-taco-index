# Trump TACO Index｜川普政策退縮壓力指數

一個可部署至 GitHub Pages 的繁體中文靜態金融資料視覺化專案。網站以 Brent 原油、美國 10 年期公債殖利率、荷姆茲海峽通行量與 S&P 500 建立可解釋的代理市場壓力指標，用來觀察市場是否接近過往敘事中的政策轉向區域。

> 本站不是 Signum Global Advisors 官方指數，不預測 Donald Trump 必然改變政策，也不構成投資建議。目前 repository 內的市場數值與事件均為 demo／simulated 示範資料。

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
```

`npm run data:update` 預設使用可重現、非隨機的 demo provider，不會把模擬數值標成即時行情。
資料檔修改後另執行 `python3 scripts/validate_data.py`，以獨立驗證器檢查必要欄位、日期、範圍與排序。

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

- `FRED_API_KEY`：FRED DGS10 資料。
- `MARKET_API_KEY`：預留給合法授權的 Brent 與 S&P 500 provider。

在 Actions variables 設定 `DATA_PROVIDER=live` 才會啟用 live 組合 provider。第一版的 `MarketProvider` 故意不綁定任一付費服務；必須先實作符合 `MarketDataAdapter` 的 adapter，才能取得 Brent 與 S&P 500。未設定 provider、Secret、額度不足或 schema 驗證失敗時，腳本會：

1. 顯示清楚錯誤並讓 job 失敗。
2. 不覆蓋最後一份有效 JSON。
3. 保留既有 `lastSuccessfulUpdate`。
4. 讓前端依時間門檻顯示「資料更新延遲」。
5. 絕不默默改用隨機資料。

Provider 最多嘗試 3 次，每次失敗都有明確 log；不使用無限重試。

前端程式碼不可加入任何 API Key、Token 或 Secret。

## 資料檔案

- `public/data/latest.json`：最新指數、四項指標、資料時間及資料狀態。
- `public/data/history.json`：歷史分數、綜合 Z-score 與各指標 Z-score。
- `public/data/events.json`：政策威脅、客觀市場反應、後續調整與來源。
- `data/manual/hormuz-transit.json`：人工維護的荷姆茲通行量。

所有外部 JSON 在前端以 Zod 驗證；格式錯誤會顯示明確錯誤，不會渲染成看似有效的數據。

### 手動更新荷姆茲資料

1. 編輯 `data/manual/hormuz-transit.json` 的 `observations`。
2. 日期使用 `YYYY-MM-DD`，數值單位必須與 `metadata.unit` 一致。
3. 按日期由舊到新排序，至少保留 60 個交易日以符合預設 rolling window。
4. `source` 只記錄來源名稱或短標題，不複製新聞全文。
5. 執行 `npm run data:update`、`npm run test` 與 `npm run build`。
6. 介面固定標示「人工維護／非即時資料」。

目前檔案只有少量示範觀測值；啟用真實 provider 前必須補足資料與可引用來源。

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

## 替換 demo data

1. 先確認資料使用與再發布授權。
2. 實作 `scripts/providers/marketProvider.ts` 的合法 adapter。
3. 在 repository secrets 設定憑證，不要寫入 git。
4. 補足荷姆茲人工資料與引用。
5. 將 Actions variable `DATA_PROVIDER` 設為 `live`。
6. 手動執行 **Update TACO market data** workflow。
7. 檢查 JSON 的 `dataMode`、`dataStatus`、`asOf` 與 `lastSuccessfulUpdate`。

`update-data.yml` 每 6 小時執行一次，也支援 `workflow_dispatch`。只有資料變更時才會提交，commit message 為 `chore(data): update TACO market data`。

## 資料來源授權與引用

- 優先使用官方、可機器讀取且允許再發布的來源。
- API 可存取不等於資料可公開再散布；必須閱讀服務條款。
- 不保存 API Secret、付費回應原文或受限制的完整資料集。
- 新聞引用只保留標題、來源、發布日期與連結。
- 歷史市場反應應記錄觀察窗口、時區、單位與調整方式。
- FRED 系列與第三方市場行情各有獨立授權及 attribution 要求，上線前逐一確認。

## 免責聲明

本專案僅為市場觀察、資料視覺化、教育與研究用途。原始 Signum 模型的完整公式與權重未公開，本站採用的權重、Z-score、門檻與事件分類都是可調整的代理模型。高分只表示四項代理市場變數呈現較高壓力，不表示任何人物、政府或機構必然採取特定行動。本專案不構成投資、法律、稅務或政策建議。
