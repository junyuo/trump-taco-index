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
})
