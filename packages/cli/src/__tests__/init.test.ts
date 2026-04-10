import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, existsSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { scaffoldWorkspace } from '../commands/init'

describe('forge init', () => {
  let workspace: string

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'forge-test-'))
  })

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true })
  })

  it('creates workspace directory with expected structure', () => {
    scaffoldWorkspace(workspace, 'test-project')
    expect(existsSync(join(workspace, 'package.json'))).toBe(true)
    expect(existsSync(join(workspace, 'pnpm-workspace.yaml'))).toBe(true)
    expect(existsSync(join(workspace, 'tsconfig.base.json'))).toBe(true)
    expect(existsSync(join(workspace, '.gitignore'))).toBe(true)
    expect(existsSync(join(workspace, '.env.example'))).toBe(true)
    expect(existsSync(join(workspace, 'forge.workspace.json'))).toBe(true)
  })

  it('package.json has correct name and workspace scripts', () => {
    scaffoldWorkspace(workspace, 'test-project')
    const pkg = JSON.parse(readFileSync(join(workspace, 'package.json'), 'utf8')) as Record<string, unknown>
    expect(pkg['name']).toBe('test-project')
    expect(pkg['private']).toBe(true)
    const scripts = pkg['scripts'] as Record<string, string>
    expect(scripts['test']).toBeTruthy()
    expect(scripts['build']).toBeTruthy()
    expect(scripts['lint']).toBeTruthy()
  })

  it('tsconfig.base.json has strict: true', () => {
    scaffoldWorkspace(workspace, 'test-project')
    const tsconfig = JSON.parse(readFileSync(join(workspace, 'tsconfig.base.json'), 'utf8')) as Record<string, unknown>
    const opts = tsconfig['compilerOptions'] as Record<string, unknown>
    expect(opts['strict']).toBe(true)
  })

  it('.gitignore excludes .env and sites/*/site.json', () => {
    scaffoldWorkspace(workspace, 'test-project')
    const gitignore = readFileSync(join(workspace, '.gitignore'), 'utf8')
    expect(gitignore).toContain('.env')
    expect(gitignore).toContain('sites/*/site.json')
  })

  it('creates apps/ and sites/ directories', () => {
    scaffoldWorkspace(workspace, 'test-project')
    expect(existsSync(join(workspace, 'apps'))).toBe(true)
    expect(existsSync(join(workspace, 'sites'))).toBe(true)
  })

  it('works with paths containing spaces (Windows compat)', () => {
    const spacePath = mkdtempSync(join(tmpdir(), 'forge test space-'))
    try {
      scaffoldWorkspace(spacePath, 'space-project')
      expect(existsSync(join(spacePath, 'package.json'))).toBe(true)
    } finally {
      rmSync(spacePath, { recursive: true, force: true })
    }
  })
})
