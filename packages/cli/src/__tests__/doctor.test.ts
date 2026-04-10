import { describe, it, expect } from 'vitest'
import { checkNodeVersion, runDoctorChecks } from '../commands/doctor'

describe('forge doctor', () => {
  it('checks Node version >= 20', () => {
    const result = checkNodeVersion()
    // We're running on Node 20+ in CI and locally
    expect(result.ok).toBe(true)
    expect(result.label).toContain('Node.js')
  })

  it('reports missing services gracefully (no crash)', () => {
    const results = runDoctorChecks()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
    // Each result has ok, label, detail
    for (const r of results) {
      expect(r).toHaveProperty('ok')
      expect(r).toHaveProperty('label')
      expect(r).toHaveProperty('detail')
    }
  })
})
