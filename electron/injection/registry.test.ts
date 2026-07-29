import { describe, expect, it } from 'vitest'
import { scriptsForUrl } from './registry'

describe('page-world injection registry', () => {
  it('contains only syntactically valid JavaScript', () => {
    const scripts = scriptsForUrl('https://polemicagame.com/game-search', 'document-end')

    expect(scripts.length).toBeGreaterThan(0)
    for (const script of scripts) {
      expect(() => new Function(script.code), script.id).not.toThrow()
    }
  })

  it('does not inject lobby scripts on unrelated pages', () => {
    expect(scriptsForUrl('https://polemicagame.com/rules', 'document-end')).toEqual([])
  })
})
