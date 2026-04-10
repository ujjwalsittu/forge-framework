/**
 * forge site new — provision a new tenant site.
 *
 * Creates site directory with site.json config.
 * Windows compatible: all paths via path.join().
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'

/**
 * Create a new site in the workspace.
 *
 * @throws {Error} if site directory already exists
 */
export function createSite(workspaceDir: string, host: string): void {
  const siteDir = join(workspaceDir, 'sites', host)

  if (existsSync(siteDir)) {
    throw new Error(`Site "${host}" already exists at ${siteDir}`)
  }

  mkdirSync(siteDir, { recursive: true })

  const siteConfig = {
    id: randomBytes(8).toString('hex'),
    host,
    name: host,
    dbUrl: `postgres://forge:forge_dev@localhost:5432/forge_${host.replace(/[^a-zA-Z0-9]/g, '_')}`,
    redisNamespace: host.replace(/[^a-zA-Z0-9]/g, '_'),
    installedModules: ['@forge/core'],
    featureFlags: {},
    timezone: 'UTC',
    language: 'en',
    currency: 'USD',
    dateFormat: 'YYYY-MM-DD',
    plan: 'selfhosted',
    status: 'active',
    createdAt: new Date().toISOString(),
  }

  writeFileSync(
    join(siteDir, 'site.json'),
    JSON.stringify(siteConfig, null, 2),
    'utf8',
  )
}
