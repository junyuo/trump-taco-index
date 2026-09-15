import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const files = ['index.html', 'public/sitemap.xml', 'public/robots.txt']

describe('GitHub Pages SEO metadata', () => {
  it('uses the production URL and contains no placeholder domains', () => {
    for (const path of files) {
      const content = readFileSync(path, 'utf8')
      expect(content).toContain('https://junyuo.github.io/trump-taco-index/')
      expect(content).not.toMatch(/USERNAME|localhost|example\.com|placeholder domain/i)
    }
  })

  it('keeps the GitHub Pages repository base path', () => {
    const config = readFileSync('vite.config.ts', 'utf8')
    expect(config).toContain("process.env.GITHUB_REPOSITORY?.split('/')[1]")
    expect(config).toContain('`/${repositoryName}/`')
  })
})
