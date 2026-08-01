import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

const DAY_MS = 24 * 60 * 60 * 1000

const workflowRunSchema = z.object({
  databaseId: z.number().int().positive(),
  createdAt: z.string().datetime(),
  conclusion: z.string().nullable(),
  status: z.string(),
  url: z.string().url(),
  event: z.string(),
})

const workflowRunsSchema = z.array(workflowRunSchema)

export type WorkflowRun = z.infer<typeof workflowRunSchema>

export interface StabilityOptions {
  minimumSuccesses?: number
  minimumSpanDays?: number
}

export interface StabilityResult {
  passed: boolean
  successCount: number
  spanDays: number
  earliestSuccessfulRun: string | null
  latestSuccessfulRun: string | null
  runUrls: string[]
  blockingRunUrl: string | null
  reason: string
}

export function evaluateScheduleStability(
  input: unknown,
  options: StabilityOptions = {},
): StabilityResult {
  const minimumSuccesses = options.minimumSuccesses ?? 24
  const minimumSpanDays = options.minimumSpanDays ?? 7
  const scheduledRuns = workflowRunsSchema
    .parse(input)
    .filter((run) => run.event === 'schedule')
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))

  const consecutiveSuccesses: WorkflowRun[] = []
  let blockingRun: WorkflowRun | null = null

  for (const run of scheduledRuns) {
    if (run.status !== 'completed' || run.conclusion !== 'success') {
      blockingRun = run
      break
    }
    consecutiveSuccesses.push(run)
  }

  const latestRun = consecutiveSuccesses[0] ?? null
  const earliestRun = consecutiveSuccesses.at(-1) ?? null
  const spanDays =
    latestRun && earliestRun
      ? (Date.parse(latestRun.createdAt) - Date.parse(earliestRun.createdAt)) / DAY_MS
      : 0
  const enoughRuns = consecutiveSuccesses.length >= minimumSuccesses
  const enoughTime = spanDays >= minimumSpanDays
  const passed = enoughRuns && enoughTime
  const reason = passed
    ? `排程穩定門檻通過：${consecutiveSuccesses.length} 次連續成功，涵蓋 ${spanDays.toFixed(2)} 天。`
    : `排程穩定門檻未通過：需要至少 ${minimumSuccesses} 次連續成功且涵蓋 ${minimumSpanDays} 天，目前為 ${consecutiveSuccesses.length} 次、${spanDays.toFixed(2)} 天。`

  return {
    passed,
    successCount: consecutiveSuccesses.length,
    spanDays,
    earliestSuccessfulRun: earliestRun?.createdAt ?? null,
    latestSuccessfulRun: latestRun?.createdAt ?? null,
    runUrls: consecutiveSuccesses.map((run) => run.url),
    blockingRunUrl: blockingRun?.url ?? null,
    reason,
  }
}

function readInputPath(args: string[]): string {
  const inputIndex = args.indexOf('--input')
  const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : undefined
  if (!inputPath) throw new Error('Usage: check-schedule-stability.ts --input <runs.json>')
  return inputPath
}

function main(): void {
  const inputPath = readInputPath(process.argv.slice(2))
  const input = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown
  const result = evaluateScheduleStability(input)
  console.log(JSON.stringify(result, null, 2))
  if (!result.passed) {
    console.error(result.reason)
    process.exitCode = 1
  }
}

const executedPath = process.argv[1] ? resolve(process.argv[1]) : ''
if (executedPath === fileURLToPath(import.meta.url)) main()
