/**
 * Field type definitions, validation, and the canonical list of all 24 field types.
 */
import { z } from 'zod'
import type { FieldDefinition } from './types'
import { FIELD_TYPE_LIST } from './types'

export const FIELD_TYPES: readonly string[] = FIELD_TYPE_LIST

const fieldTypeSet = new Set<string>(FIELD_TYPE_LIST)

const baseFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  label: z.string().optional(),
  required: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  hidden: z.boolean().optional(),
  sensitive: z.boolean().optional(),
})

const dataFieldExtras = z.object({
  maxLength: z.number().int().nonnegative().optional(),
  minLength: z.number().int().nonnegative().optional(),
  pattern: z.string().optional(),
  options: z.array(z.string()).optional(),
})

const linkFieldExtras = z.object({
  to: z.string().min(1, 'Link field requires "to" property'),
  filters: z.array(z.tuple([z.string(), z.string(), z.unknown()])).optional(),
  fetchFields: z.array(z.string()).optional(),
})

const selectFieldExtras = z.object({
  options: z.union([
    z.array(z.string()).min(1, 'Select field requires at least one option'),
    z.array(z.object({ value: z.string(), label: z.string() })).min(1),
  ]),
  multiple: z.boolean().optional(),
})

const dynamicLinkExtras = z.object({
  typeField: z.string().min(1, 'DynamicLink field requires "typeField" property'),
})

const childTableExtras = z.object({
  schema: z.string().min(1, 'ChildTable field requires "schema" property'),
  minRows: z.number().int().nonnegative().optional(),
  maxRows: z.number().int().positive().optional(),
})

/**
 * Validates a single field definition. Returns the validated field with
 * enforced defaults (e.g. Password is always sensitive).
 * Throws on invalid input.
 */
export function validateField(input: Record<string, unknown>): FieldDefinition {
  const base = baseFieldSchema.parse(input)
  const type = input['type'] as string | undefined

  if (!type || !fieldTypeSet.has(type)) {
    throw new Error(`Unknown field type: "${String(type)}". Valid types: ${FIELD_TYPES.join(', ')}`)
  }

  switch (type) {
    case 'Data':
      dataFieldExtras.parse(input)
      break
    case 'Link':
      linkFieldExtras.parse(input)
      break
    case 'Select':
      selectFieldExtras.parse(input)
      break
    case 'DynamicLink':
      dynamicLinkExtras.parse(input)
      break
    case 'ChildTable':
      childTableExtras.parse(input)
      break
    case 'Password':
      return Object.freeze({ ...input, ...base, type: 'Password', sensitive: true }) as FieldDefinition
    default:
      break
  }

  return Object.freeze({ ...input, ...base, type }) as FieldDefinition
}
