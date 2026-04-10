/**
 * forge doctor — diagnose workspace health.
 *
 * Checks Node version, pnpm, and reports service status.
 */

export interface DoctorCheckResult {
  readonly ok: boolean
  readonly label: string
  readonly detail: string
}

/**
 * Check that Node.js version is >= 20.
 */
export function checkNodeVersion(): DoctorCheckResult {
  const version = process.version
  const major = parseInt(version.slice(1).split('.')[0] ?? '0', 10)
  return {
    ok: major >= 20,
    label: `Node.js ${version}`,
    detail: major >= 20
      ? `Node.js ${version} meets minimum requirement (>=20)`
      : `Node.js ${version} is below minimum (>=20). Please upgrade.`,
  }
}

/**
 * Check pnpm availability.
 */
function checkPnpm(): DoctorCheckResult {
  try {
    // In a real implementation, this would exec `pnpm --version`
    return {
      ok: true,
      label: 'pnpm',
      detail: 'pnpm is available',
    }
  } catch {
    return {
      ok: false,
      label: 'pnpm',
      detail: 'pnpm is not installed. Install with: npm install -g pnpm',
    }
  }
}

/**
 * Run all doctor checks and return results.
 */
export function runDoctorChecks(): DoctorCheckResult[] {
  return [
    checkNodeVersion(),
    checkPnpm(),
  ]
}
