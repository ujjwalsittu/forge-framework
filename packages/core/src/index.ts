// @forge/core — entry point

export { defineSchema } from './schema/define'
export { SchemaRegistry } from './schema/registry'
export { validateField, FIELD_TYPES } from './schema/fields'
export type {
  SchematypeConfig,
  SchematypeDefinition,
  FieldDefinition,
  FieldType,
  NamingConfig,
  PermissionRule,
  LayoutConfig,
  HooksConfig,
  IndexConfig,
  FilterDefinition,
} from './schema/types'
