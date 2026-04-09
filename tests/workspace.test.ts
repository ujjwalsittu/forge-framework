import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

describe('Monorepo structure', () => {
  it('has pnpm-workspace.yaml', () => {
    expect(existsSync(join(ROOT, 'pnpm-workspace.yaml'))).toBe(true)
  })

  it('has tsconfig.base.json with strict: true', () => {
    const tsconfig = JSON.parse(readFileSync(join(ROOT, 'tsconfig.base.json'), 'utf8'))
    expect(tsconfig.compilerOptions.strict).toBe(true)
    expect(tsconfig.compilerOptions.noUncheckedIndexedAccess).toBe(true)
  })

  it('has forge.workspace.json with all 13 packages', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'forge.workspace.json'), 'utf8'))
    const expectedPackages = [
      'core',
      'cli',
      'desk',
      'ui',
      'permissions',
      'workflow',
      'print',
      'reports',
      'erp',
      'hr',
      'crm',
      'helpdesk',
      'mfg',
    ]
    for (const pkg of expectedPackages) {
      expect(manifest.packages).toHaveProperty(pkg)
    }
  })

  it('has CI workflow with Node 20 and 22 matrix', () => {
    expect(existsSync(join(ROOT, '.github', 'workflows', 'ci.yml'))).toBe(true)
    const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
    expect(ci).toContain('20')
    expect(ci).toContain('22')
  })

  it('has dependabot.yml', () => {
    expect(existsSync(join(ROOT, '.github', 'dependabot.yml'))).toBe(true)
  })

  it('has docker-compose.yml with postgres, redis, and minio services', () => {
    const dc = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8')
    expect(dc).toContain('postgres')
    expect(dc).toContain('redis')
    expect(dc).toContain('minio')
  })

  it('.gitignore excludes .env and sites/*/site.json', () => {
    const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf8')
    expect(gitignore).toContain('.env')
    expect(gitignore).toContain('sites/*/site.json')
  })

  it('.eslintrc.json has strict TypeScript checking and no-explicit-any', () => {
    const eslint = JSON.parse(readFileSync(join(ROOT, '.eslintrc.json'), 'utf8'))
    expect(eslint.extends).toContain('plugin:@typescript-eslint/strict-type-checked')
    expect(eslint.rules['@typescript-eslint/no-explicit-any']).toBe('error')
    expect(eslint.rules['no-console']).toBeTruthy()
  })

  it('all 13 package directories have package.json', () => {
    const packages = [
      'core',
      'cli',
      'desk',
      'ui',
      'permissions',
      'workflow',
      'print',
      'reports',
      'erp',
      'hr',
      'crm',
      'helpdesk',
      'mfg',
    ]
    for (const pkg of packages) {
      expect(
        existsSync(join(ROOT, 'packages', pkg, 'package.json')),
        `packages/${pkg}/package.json should exist`,
      ).toBe(true)
    }
  })

  it('has .changeset/config.json', () => {
    expect(existsSync(join(ROOT, '.changeset', 'config.json'))).toBe(true)
  })

  it('has security workflow', () => {
    expect(existsSync(join(ROOT, '.github', 'workflows', 'security.yml'))).toBe(true)
  })
})
