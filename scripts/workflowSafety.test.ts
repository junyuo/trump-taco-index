import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('GitHub Actions data safety', () => {
  it('非 live repository variable 時不執行排程發布', () => {
    const workflow = readFileSync('.github/workflows/update-data.yml', 'utf8')
    expect(workflow).toContain(
      "if: ${{ github.event_name != 'schedule' || vars.DATA_PROVIDER == 'live' }}",
    )
  })

  it('live publish 與 live deployment 都執行 require-live gate', () => {
    const updateWorkflow = readFileSync('.github/workflows/update-data.yml', 'utf8')
    const deployWorkflow = readFileSync('.github/workflows/deploy.yml', 'utf8')
    expect(updateWorkflow).toContain('npm run data:validate -- --require-live')
    expect(deployWorkflow).toContain(
      'python3 scripts/smoke_deployment.py --base-url "$PAGE_URL" --require-live',
    )
  })

  it('backfill 先產生 artifact、驗證 252 筆且只提交 history', () => {
    const backfillWorkflow = readFileSync('.github/workflows/backfill-history.yml', 'utf8')
    expect(backfillWorkflow).toContain('group: market-data-write')
    expect(backfillWorkflow).toContain('default: false')
    expect(backfillWorkflow).toContain('actions/upload-artifact@v4')
    expect(backfillWorkflow).toContain('Require two matching prior successful candidates')
    expect(backfillWorkflow).toContain('include-hidden-files: true')
    expect(backfillWorkflow).toContain('--require-backfill')
    expect(backfillWorkflow).toContain('git add public/data/history.json')
    expect(backfillWorkflow).not.toContain('git add public/data/latest.json')
  })

  it('排程與 backfill 共用資料寫入 concurrency group', () => {
    const updateWorkflow = readFileSync('.github/workflows/update-data.yml', 'utf8')
    expect(updateWorkflow).toContain('group: market-data-write')
  })
})
