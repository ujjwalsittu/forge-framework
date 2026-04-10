/**
 * Role-Based Access Control — permission checking.
 *
 * Three-layer system:
 * 1. Role-action-schematype (this module)
 * 2. Attribute-based conditions (if_owner, if_condition) — basic support here
 * 3. Field-level rules — handled at API response layer
 *
 * Most permissive rule wins when user has multiple roles.
 */
import type { UserContext } from '../tenancy/types'
import type { PermissionRule } from '../schema/types'

export type PermAction = 'read' | 'write' | 'create' | 'delete' | 'submit' | 'cancel' | 'amend' | 'export' | 'print' | 'email'

const VALID_ACTIONS = new Set<string>([
  'read', 'write', 'create', 'delete', 'submit', 'cancel', 'amend', 'export', 'print', 'email',
])

/**
 * Check if a user has permission for an action on a schematype.
 *
 * @param user - The current user context
 * @param action - The action to check
 * @param rules - Permission rules from the schematype definition
 * @param doc - Optional document for if_owner checks
 * @returns true if any matching rule grants the permission
 */
export function checkPermission(
  user: UserContext,
  action: PermAction,
  rules: readonly PermissionRule[],
  doc?: { owner?: string },
): boolean {
  if (!VALID_ACTIONS.has(action)) {
    return false
  }

  // Find all rules that match the user's roles
  for (const rule of rules) {
    if (!user.roles.includes(rule.role)) {
      continue
    }

    // Check if_owner constraint
    if (rule.if_owner === true && doc) {
      if (doc.owner !== user.id) {
        continue
      }
    } else if (rule.if_owner === true && !doc) {
      // if_owner rule but no doc context — cannot evaluate, skip
      continue
    }

    // Check if the action is granted
    const granted = rule[action as keyof PermissionRule]
    if (granted === true) {
      return true
    }
  }

  return false
}
