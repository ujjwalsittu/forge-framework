/**
 * defineSchema() — the primary API for declaring a Forge Schematype.
 * Pure function: no IO, no side effects. Validates and freezes the config.
 */
import type { SchematypeConfig, SchematypeDefinition } from './types'
import { validateSchemaConfig } from './validate'

/**
 * Defines a Forge Schematype. Validates the config and returns a frozen,
 * immutable SchematypeDefinition.
 *
 * @throws {Error} on invalid config (missing fields, duplicate names, etc.)
 */
export function defineSchema<N extends string>(
  config: SchematypeConfig<N>,
): SchematypeDefinition<N> {
  // Validate the entire config (throws on invalid)
  validateSchemaConfig(config)

  // Build frozen definition
  const definition: SchematypeDefinition<N> = Object.freeze({
    ...config,
    _type: 'SchematypeDefinition' as const,
    fields: Object.freeze([...config.fields].map(f => Object.freeze({ ...f }))),
    permissions: Object.freeze([...config.permissions].map(p => Object.freeze({ ...p }))),
  })

  return definition
}
