/**
 * Core Schematype type definitions.
 * These types define the shape of a Forge Schematype — the single most
 * important concept in Forge. Everything else derives from it.
 */

// ─── Field Types ────────────────────────────────────────────────────────────

export const FIELD_TYPE_LIST = [
  'Data', 'LongText', 'Int', 'Float', 'Currency', 'Percent',
  'Date', 'DateTime', 'Time', 'Duration',
  'Select', 'Link', 'DynamicLink',
  'ChildTable', 'Table',
  'Attach', 'AttachImage',
  'Check', 'AutoName', 'JSON',
  'Color', 'Barcode', 'Geolocation',
  'Password', 'Rating', 'Markdown', 'Code', 'HTML', 'Signature',
] as const

export type FieldType = (typeof FIELD_TYPE_LIST)[number]

// ─── Field Definitions (discriminated by type) ──────────────────────────────

interface BaseField {
  readonly name: string
  readonly label?: string
  readonly required?: boolean
  readonly readOnly?: boolean
  readonly hidden?: boolean
  readonly sensitive?: boolean
}

export interface DataField extends BaseField {
  readonly type: 'Data'
  readonly maxLength?: number
  readonly minLength?: number
  readonly pattern?: string
  readonly options?: readonly string[]
}

export interface LongTextField extends BaseField {
  readonly type: 'LongText'
  readonly richText?: boolean
  readonly maxLength?: number
}

export interface IntField extends BaseField {
  readonly type: 'Int'
  readonly min?: number
  readonly max?: number
}

export interface FloatField extends BaseField {
  readonly type: 'Float'
  readonly min?: number
  readonly max?: number
  readonly precision?: number
}

export interface CurrencyField extends BaseField {
  readonly type: 'Currency'
  readonly currencyField?: string
}

export interface PercentField extends BaseField {
  readonly type: 'Percent'
  readonly min?: number
  readonly max?: number
}

export interface DateField extends BaseField {
  readonly type: 'Date'
  readonly defaultToday?: boolean
}

export interface DateTimeField extends BaseField {
  readonly type: 'DateTime'
  readonly defaultNow?: boolean
}

export interface TimeField extends BaseField {
  readonly type: 'Time'
}

export interface DurationField extends BaseField {
  readonly type: 'Duration'
}

export interface SelectField extends BaseField {
  readonly type: 'Select'
  readonly options: readonly string[] | readonly { value: string; label: string }[]
  readonly multiple?: boolean
}

export interface LinkField extends BaseField {
  readonly type: 'Link'
  readonly to: string
  readonly filters?: readonly FilterDefinition[]
  readonly fetchFields?: readonly string[]
}

export interface DynamicLinkField extends BaseField {
  readonly type: 'DynamicLink'
  readonly typeField: string
}

export interface ChildTableField extends BaseField {
  readonly type: 'ChildTable'
  readonly schema: string
  readonly minRows?: number
  readonly maxRows?: number
}

export interface TableField extends BaseField {
  readonly type: 'Table'
  readonly columns: readonly TableColumnDef[]
}

export interface AttachField extends BaseField {
  readonly type: 'Attach'
  readonly multiple?: boolean
  readonly allowedTypes?: readonly string[]
  readonly maxSizeMB?: number
}

export interface AttachImageField extends BaseField {
  readonly type: 'AttachImage'
  readonly multiple?: boolean
}

export interface CheckField extends BaseField {
  readonly type: 'Check'
  readonly defaultValue?: boolean
}

export interface AutoNameField extends BaseField {
  readonly type: 'AutoName'
  readonly readOnly?: true
}

export interface JSONField extends BaseField {
  readonly type: 'JSON'
  readonly schema?: string
}

export interface ColorField extends BaseField {
  readonly type: 'Color'
}

export interface BarcodeField extends BaseField {
  readonly type: 'Barcode'
  readonly barcodeType?: 'qr' | 'code128' | 'ean13' | 'auto'
}

export interface GeolocationField extends BaseField {
  readonly type: 'Geolocation'
  readonly showMap?: boolean
}

export interface PasswordField extends BaseField {
  readonly type: 'Password'
  readonly sensitive?: true
}

export interface RatingField extends BaseField {
  readonly type: 'Rating'
  readonly max?: number
}

export interface MarkdownField extends BaseField {
  readonly type: 'Markdown'
}

export interface CodeField extends BaseField {
  readonly type: 'Code'
  readonly language?: string
}

export interface HTMLField extends BaseField {
  readonly type: 'HTML'
}

export interface SignatureField extends BaseField {
  readonly type: 'Signature'
}

export type FieldDefinition =
  | DataField
  | LongTextField
  | IntField
  | FloatField
  | CurrencyField
  | PercentField
  | DateField
  | DateTimeField
  | TimeField
  | DurationField
  | SelectField
  | LinkField
  | DynamicLinkField
  | ChildTableField
  | TableField
  | AttachField
  | AttachImageField
  | CheckField
  | AutoNameField
  | JSONField
  | ColorField
  | BarcodeField
  | GeolocationField
  | PasswordField
  | RatingField
  | MarkdownField
  | CodeField
  | HTMLField
  | SignatureField

// ─── Naming Config ──────────────────────────────────────────────────────────

export type NamingConfig =
  | { readonly type: 'prompt' }
  | { readonly type: 'autoincrement' }
  | { readonly type: 'series'; readonly pattern: string }
  | { readonly type: 'field'; readonly field: string }
  | { readonly type: 'expression'; readonly template: string }

// ─── Permission Rules ───────────────────────────────────────────────────────

export interface PermissionRule {
  readonly role: string
  readonly create?: boolean
  readonly read?: boolean
  readonly write?: boolean
  readonly delete?: boolean
  readonly submit?: boolean
  readonly cancel?: boolean
  readonly amend?: boolean
  readonly export?: boolean
  readonly print?: boolean
  readonly email?: boolean
  readonly if_owner?: boolean
  readonly if_condition?: string
  readonly fields?: {
    readonly read_only?: readonly string[]
    readonly hidden?: readonly string[]
    readonly no_copy?: readonly string[]
  }
}

// ─── Layout Config ──────────────────────────────────────────────────────────

export interface LayoutSection {
  readonly label: string
  readonly columns: 1 | 2 | 3
  readonly fields: readonly string[]
  readonly collapsible?: boolean
  readonly defaultCollapsed?: boolean
}

export interface LayoutConfig {
  readonly sections: readonly LayoutSection[]
}

// ─── Hooks Config ───────────────────────────────────────────────────────────

export type HookRef = string

export interface HooksConfig {
  readonly beforeValidate?: HookRef
  readonly validate?: HookRef
  readonly beforeSave?: HookRef
  readonly afterSave?: HookRef
  readonly beforeSubmit?: HookRef
  readonly afterSubmit?: HookRef
  readonly beforeCancel?: HookRef
  readonly afterCancel?: HookRef
  readonly beforeDelete?: HookRef
  readonly afterDelete?: HookRef
  readonly onFormLoad?: HookRef
  readonly onFieldChange?: Readonly<Record<string, HookRef>>
}

// ─── Index Config ───────────────────────────────────────────────────────────

export interface IndexConfig {
  readonly fields: readonly string[]
  readonly unique?: boolean
  readonly name?: string
}

// ─── Filter Definition ──────────────────────────────────────────────────────

export type FilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in' | 'not in'

export type FilterDefinition = readonly [string, FilterOperator, unknown]

// ─── Table Column Def (for Table field type) ────────────────────────────────

export interface TableColumnDef {
  readonly name: string
  readonly type: 'Data' | 'Int' | 'Float' | 'Currency' | 'Check' | 'Select' | 'Date' | 'Link'
  readonly label?: string
  readonly options?: readonly string[]
  readonly to?: string
}

// ─── Schematype Config (input to defineSchema) ──────────────────────────────

export interface SchematypeConfig<N extends string = string> {
  readonly name: N
  readonly module: string
  readonly label: string
  readonly label_plural?: string
  readonly titleField: string
  readonly naming: NamingConfig
  readonly isSubmittable?: boolean
  readonly isSingleton?: boolean
  readonly trackChanges?: boolean
  readonly searchFields?: readonly string[]
  readonly fields: readonly FieldDefinition[]
  readonly layout?: LayoutConfig
  readonly permissions: readonly PermissionRule[]
  readonly hooks?: HooksConfig
  readonly workflow?: string
  readonly indexes?: readonly IndexConfig[]
}

// ─── Schematype Definition (output of defineSchema) ─────────────────────────

export interface SchematypeDefinition<N extends string = string> extends SchematypeConfig<N> {
  readonly _type: 'SchematypeDefinition'
}
