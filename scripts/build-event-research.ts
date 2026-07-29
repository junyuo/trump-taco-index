import { createHash } from 'node:crypto'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { prepareApprovedEvent } from '../src/lib/eventResearch'
import {
  eventCandidatesDataSchema,
  eventsDataSchema,
} from '../src/types/data'

const candidatePath = resolve('data/research/event-candidates.json')
const outputPath = resolve('public/data/events.json')
const publish = process.argv.includes('--publish')

async function main(): Promise<void> {
  const candidates = eventCandidatesDataSchema.parse(
    JSON.parse(await readFile(candidatePath, 'utf8')),
  )
  const approved = candidates.filter((candidate) => candidate.reviewStatus === 'approved')
  const events = eventsDataSchema.parse(
    approved
      .map(prepareApprovedEvent)
      .sort((left, right) => right.threatDate.localeCompare(left.threatDate)),
  )
  const output = `${JSON.stringify(events, null, 2)}\n`
  const digest = createHash('sha256').update(output).digest('hex')

  console.log(`候選事件：${candidates.length}；已核准：${events.length}`)
  console.log(`候選輸出 SHA-256：${digest}`)
  if (!publish) {
    console.log('Dry-run 完成，未修改 public/data/events.json')
    return
  }
  if (events.length === 0) throw new Error('沒有通過審核的事件，拒絕覆蓋現有事件資料')

  const temporaryPath = `${outputPath}.tmp`
  await writeFile(temporaryPath, output, 'utf8')
  await rename(temporaryPath, outputPath)
  console.log(`已安全發布 ${events.length} 筆事件研究`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : '事件研究建置失敗')
  process.exitCode = 1
})
