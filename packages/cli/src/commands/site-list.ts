/**
 * forge site list — list all sites in the workspace.
 */
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

export interface SiteListEntry {
  readonly host: string
  readonly plan: string
  readonly status: string
}

/**
 * List all sites in the workspace's sites/ directory.
 * Reads site.json from each site directory.
 */
export function listSites(workspaceDir: string): SiteListEntry[] {
  const sitesDir = join(workspaceDir, 'sites')
  if (!existsSync(sitesDir)) {
    return []
  }

  const entries: SiteListEntry[] = []
  const dirs = readdirSync(sitesDir, { withFileTypes: true })

  for (const dir of dirs) {
    if (!dir.isDirectory()) continue
    const configPath = join(sitesDir, dir.name, 'site.json')
    if (!existsSync(configPath)) continue

    const config = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>
    entries.push({
      host: (config['host'] as string | undefined) ?? dir.name,
      plan: (config['plan'] as string | undefined) ?? 'unknown',
      status: (config['status'] as string | undefined) ?? 'unknown',
    })
  }

  return entries
}
