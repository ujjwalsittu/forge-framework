import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, existsSync, readFileSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createSite } from '../commands/site-new'
import { listSites } from '../commands/site-list'

describe('forge site new', () => {
  let workspace: string

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'forge-site-test-'))
    mkdirSync(join(workspace, 'sites'), { recursive: true })
  })

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true })
  })

  it('creates site directory with site.json', () => {
    createSite(workspace, 'test.local')
    expect(existsSync(join(workspace, 'sites', 'test.local'))).toBe(true)
    expect(existsSync(join(workspace, 'sites', 'test.local', 'site.json'))).toBe(true)
  })

  it('site.json contains required config fields', () => {
    createSite(workspace, 'test.local')
    const config = JSON.parse(
      readFileSync(join(workspace, 'sites', 'test.local', 'site.json'), 'utf8'),
    ) as Record<string, unknown>
    expect(config['host']).toBe('test.local')
    expect(config['status']).toBe('active')
    expect(config['plan']).toBe('selfhosted')
    expect(config).toHaveProperty('id')
    expect(config).toHaveProperty('timezone')
    expect(config).toHaveProperty('currency')
  })

  it('throws when site already exists', () => {
    createSite(workspace, 'test.local')
    expect(() => {
      createSite(workspace, 'test.local')
    }).toThrow('already exists')
  })
})

describe('forge site list', () => {
  let workspace: string

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'forge-site-list-'))
    mkdirSync(join(workspace, 'sites'), { recursive: true })
  })

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true })
  })

  it('returns empty array when no sites', () => {
    const sites = listSites(workspace)
    expect(sites).toHaveLength(0)
  })

  it('returns all created sites', () => {
    createSite(workspace, 'site1.local')
    createSite(workspace, 'site2.local')
    const sites = listSites(workspace)
    expect(sites).toHaveLength(2)
    expect(sites.map(s => s.host)).toContain('site1.local')
    expect(sites.map(s => s.host)).toContain('site2.local')
  })
})
