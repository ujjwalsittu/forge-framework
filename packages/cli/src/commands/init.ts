/**
 * forge init — scaffold a new Forge workspace.
 *
 * Windows compatible: all paths via path.join(), no shell commands.
 */
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

/**
 * Scaffold a new Forge workspace directory.
 * Creates all configuration files and directory structure.
 */
export function scaffoldWorkspace(targetDir: string, projectName: string): void {
  // Create directory structure
  const dirs = [
    'apps',
    'sites',
    'scripts',
    'docs',
    'tests',
    join('tests', 'integration'),
  ]
  for (const dir of dirs) {
    mkdirSync(join(targetDir, dir), { recursive: true })
  }

  // package.json
  writeFileSync(
    join(targetDir, 'package.json'),
    JSON.stringify(
      {
        name: projectName,
        version: '0.0.1',
        private: true,
        type: 'module',
        packageManager: 'pnpm@9.0.0',
        engines: { node: '>=20.0.0', pnpm: '>=9.0.0' },
        scripts: {
          build: 'pnpm -r build',
          test: 'pnpm -r test',
          lint: 'pnpm -r lint',
          'type-check': 'pnpm -r type-check',
          clean: 'pnpm -r clean',
          dev: 'pnpm --filter @forge/core dev',
        },
        devDependencies: {
          typescript: '^5.4.0',
          vitest: '^1.4.0',
          eslint: '^8.57.0',
          prettier: '^3.2.0',
        },
      },
      null,
      2,
    ),
    'utf8',
  )

  // pnpm-workspace.yaml
  writeFileSync(
    join(targetDir, 'pnpm-workspace.yaml'),
    'packages:\n  - "packages/*"\n  - "apps/*"\n',
    'utf8',
  )

  // tsconfig.base.json
  writeFileSync(
    join(targetDir, 'tsconfig.base.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          lib: ['ES2022'],
          strict: true,
          noUncheckedIndexedAccess: true,
          noImplicitOverride: true,
          declaration: true,
          declarationMap: true,
          sourceMap: true,
          outDir: './dist',
          rootDir: './src',
          skipLibCheck: true,
        },
        exclude: ['node_modules', 'dist'],
      },
      null,
      2,
    ),
    'utf8',
  )

  // .gitignore
  writeFileSync(
    join(targetDir, '.gitignore'),
    [
      'node_modules/',
      'dist/',
      '*.tsbuildinfo',
      '.env',
      '.env.local',
      '.env.*.local',
      'sites/*/site.json',
      'sites/*/files/',
      '*.sqlite',
      '*.sqlite-journal',
      'coverage/',
      '.DS_Store',
      'Thumbs.db',
      '.docker-data/',
      '',
    ].join('\n'),
    'utf8',
  )

  // .env.example
  writeFileSync(
    join(targetDir, '.env.example'),
    [
      '# Forge Framework — Development Environment',
      '# Copy to .env and fill in values',
      '',
      'DATABASE_URL=postgres://forge:forge_dev@localhost:5432/forge',
      'REDIS_URL=redis://localhost:6379',
      'PORT=8000',
      'NODE_ENV=development',
      'SESSION_SECRET=change-me-to-a-random-string',
      '',
    ].join('\n'),
    'utf8',
  )

  // forge.workspace.json
  writeFileSync(
    join(targetDir, 'forge.workspace.json'),
    JSON.stringify(
      {
        name: projectName,
        version: '0.0.1',
        schema_version: '1',
        packages: {},
        sites_dir: 'sites',
        apps_dir: 'apps',
        node_min: '20.0.0',
        pnpm_min: '9.0.0',
      },
      null,
      2,
    ),
    'utf8',
  )
}
