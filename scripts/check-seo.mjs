import { readFile } from 'node:fs/promises'

const productionUrl = 'https://junyuo.github.io/trump-taco-index/'
const forbiddenPatterns = [/USERNAME/i, /localhost/i, /example\.com/i, /placeholder domain/i]

async function assertFile(path, required) {
  const content = await readFile(path, 'utf8')
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) throw new Error(`${path} 含有禁止的 SEO placeholder：${pattern}`)
  }
  for (const expected of required) {
    if (!content.includes(expected)) throw new Error(`${path} 缺少 ${expected}`)
  }
}

async function main() {
  const isDist = process.argv.includes('--dist')
  const root = isDist ? 'dist/' : ''
  const publicRoot = isDist ? root : 'public/'
  await Promise.all([
    assertFile(`${root}index.html`, [productionUrl, `${productionUrl}og.png`]),
    assertFile(`${publicRoot}sitemap.xml`, [productionUrl]),
    assertFile(`${publicRoot}robots.txt`, [`${productionUrl}sitemap.xml`]),
  ])
  console.log(`SEO metadata validated in ${root || 'source files'}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'SEO metadata validation failed')
  process.exitCode = 1
})
