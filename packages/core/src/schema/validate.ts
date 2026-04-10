/**
 * Schematype config validation using Zod.
 * Validates the entire config shape including cross-field constraints.
 */
import { z } from 'zod'
import { FIELD_TYPE_LIST } from './types'
import type { SchematypeConfig } from './types'
import { validateField } from './fields'

const namingSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('prompt') }),
  z.object({ type: z.literal('autoincrement') }),
  z.object({ type: z.literal('series'), pattern: z.string().min(1) }),
  z.object({ type: z.literal('field'), field: z.string().min(1) }),
  z.object({ type: z.literal('expression'), template: z.string().min(1) }),
])

const permissionRuleSchema = z.object({
  role: z.string().min(1),
  create: z.boolean().optional(),
  read: z.boolean().optional(),
  write: z.boolean().optional(),
  delete: z.boolean().optional(),
  submit: z.boolean().optional(),
  cancel: z.boolean().optional(),
  amend: z.boolean().optional(),
  export: z.boolean().optional(),
  print: z.boolean().optional(),
  email: z.boolean().optional(),
  if_owner: z.boolean().optional(),
  if_condition: z.string().optional(),
  fields: z.object({
    read_only: z.array(z.string()).optional(),
    hidden: z.array(z.string()).optional(),
    no_copy: z.array(z.string()).optional(),
  }).optional(),
})

const fieldTypeEnum = z.enum(FIELD_TYPE_LIST as unknown as [string, ...string[]])

const rawFieldSchema = z.object({
  name: z.string().min(1),
  type: fieldTypeEnum,
}).passthrough()

const schematypeConfigSchema = z.object({
  name: z.string().min(1, 'Schema name is required'),
  module: z.string().min(1, 'Module is required'),
  label: z.string().min(1, 'Label is required'),
  label_plural: z.string().optional(),
  titleField: z.string().min(1, 'titleField is required'),
  naming: namingSchema,
  isSubmittable: z.boolean().optional(),
  isSingleton: z.boolean().optional(),
  trackChanges: z.boolean().optional(),
  searchFields: z.array(z.string()).optional(),
  fields: z.array(rawFieldSchema).min(1, 'At least one field is required'),
  layout: z.object({
    sections: z.array(z.object({
      label: z.string(),
      columns: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      fields: z.array(z.string()),
      collapsible: z.boolean().optional(),
      defaultCollapsed: z.boolean().optional(),
    })),
  }).optional(),
  permissions: z.array(permissionRuleSchema),
  hooks: z.record(z.string(), z.unknown()).optional(),
  workflow: z.string().optional(),
  indexes: z.array(z.object({
    fields: z.array(z.string()).min(1),
    unique: z.boolean().optional(),
    name: z.string().optional(),
  })).optional(),
})

/**
 * Validates a full SchematypeConfig. Throws on invalid input.
 * Performs cross-field validation beyond what Zod handles:
 * - Unique field names
 * - Link fields have "to"
 * - Select fields have "options"
 * - ChildTable fields have "schema"
 * - Naming field reference points to existing field
 */
export function validateSchemaConfig(input: unknown): SchematypeConfig {
  const config = schematypeConfigSchema.parse(input)

  // Check duplicate field names
  const fieldNames = new Set<string>()
  for (const field of config.fields) {
    if (fieldNames.has(field.name)) {
      throw new Error(`Duplicate field name: ${field.name}`)
    }
    fieldNames.add(field.name)
  }

  // Validate each field's type-specific options
  for (const field of config.fields) {
    validateField(field as Record<string, unknown>)
  }

  // Validate naming config references
  if (config.naming.type === 'field') {
    if (!fieldNames.has(config.naming.field)) {
      throw new Error(
        `Naming field reference "${config.naming.field}" does not match any field. ` +
        `Available fields: ${[...fieldNames].join(', ')}`,
      )
    }
  }

  return config as SchematypeConfig
}
