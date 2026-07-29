import { readFile } from 'node:fs/promises'
import { eventCandidatesDataSchema, eventsDataSchema } from '../src/types/data'

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'))
}

function assertUniqueIds(items: Array<{ id: string }>, label: string): void {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`${label}事件 ID 重複：${item.id}`)
    ids.add(item.id)
  }
}

async function main(): Promise<void> {
  const candidates = eventCandidatesDataSchema.parse(
    await readJson('data/research/event-candidates.json'),
  )
  const events = eventsDataSchema.parse(await readJson('public/data/events.json'))
  assertUniqueIds(candidates, '候選')
  assertUniqueIds(events, '公開')

  console.log(`Validated ${candidates.length} research candidates and ${events.length} public events`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : '事件驗證失敗')
  process.exitCode = 1
})
