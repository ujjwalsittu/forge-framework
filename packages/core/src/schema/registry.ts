/**
 * SchemaRegistry — global registry for registered Schematype definitions.
 * Thread-safe (single-threaded Node.js). Immutable reads.
 */
import type { SchematypeDefinition } from './types'

export class SchemaRegistry {
  private readonly schemas = new Map<string, SchematypeDefinition>()

  /**
   * Register a Schematype definition. Throws if name is already registered.
   */
  register(schema: SchematypeDefinition): void {
    if (this.schemas.has(schema.name)) {
      throw new Error(`Schema "${schema.name}" is already registered`)
    }
    this.schemas.set(schema.name, schema)
  }

  /**
   * Get a registered schema by name, or undefined if not found.
   */
  get<N extends string>(name: N): SchematypeDefinition<N> | undefined {
    return this.schemas.get(name) as SchematypeDefinition<N> | undefined
  }

  /**
   * Check if a schema is registered.
   */
  has(name: string): boolean {
    return this.schemas.has(name)
  }

  /**
   * List all registered schemas. Returns a frozen array.
   */
  list(): ReadonlyArray<SchematypeDefinition> {
    return Object.freeze([...this.schemas.values()])
  }
}
