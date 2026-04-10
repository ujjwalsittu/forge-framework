import { describe, it, expect } from 'vitest'
import { checkPermission } from '../rbac'
import type { UserContext } from '../../tenancy/types'
import type { PermissionRule } from '../../schema/types'

function makeUser(roles: readonly string[], id = 'user-1'): UserContext {
  return { id, name: 'Test', email: 'test@test.com', roles }
}

const rules: readonly PermissionRule[] = [
  { role: 'Administrator', read: true, write: true, create: true, delete: true, submit: true, cancel: true },
  { role: 'Editor', read: true, write: true, create: true },
  { role: 'Viewer', read: true },
  { role: 'Sales Rep', read: true, create: true, if_owner: true },
  { role: 'Guest' },
]

describe('RBAC — checkPermission()', () => {
  it('Administrator has all permissions', () => {
    const user = makeUser(['Administrator'])
    expect(checkPermission(user, 'read', rules)).toBe(true)
    expect(checkPermission(user, 'write', rules)).toBe(true)
    expect(checkPermission(user, 'create', rules)).toBe(true)
    expect(checkPermission(user, 'delete', rules)).toBe(true)
    expect(checkPermission(user, 'submit', rules)).toBe(true)
  })

  it('Guest has no write permissions by default', () => {
    const user = makeUser(['Guest'])
    expect(checkPermission(user, 'read', rules)).toBe(false)
    expect(checkPermission(user, 'write', rules)).toBe(false)
    expect(checkPermission(user, 'create', rules)).toBe(false)
  })

  it('Viewer can read but not write', () => {
    const user = makeUser(['Viewer'])
    expect(checkPermission(user, 'read', rules)).toBe(true)
    expect(checkPermission(user, 'write', rules)).toBe(false)
  })

  it('most permissive rule wins when user has multiple roles', () => {
    const user = makeUser(['Viewer', 'Editor'])
    expect(checkPermission(user, 'read', rules)).toBe(true)
    expect(checkPermission(user, 'write', rules)).toBe(true)
    expect(checkPermission(user, 'create', rules)).toBe(true)
    // Editor doesn't have delete, Viewer doesn't have delete
    expect(checkPermission(user, 'delete', rules)).toBe(false)
  })

  it('if_owner restricts to document owner', () => {
    const owner = makeUser(['Sales Rep'], 'owner-1')
    const other = makeUser(['Sales Rep'], 'other-1')

    // With doc owned by owner-1
    expect(checkPermission(owner, 'read', rules, { owner: 'owner-1' })).toBe(true)
    expect(checkPermission(other, 'read', rules, { owner: 'owner-1' })).toBe(false)
  })

  it('returns false for unknown action', () => {
    const user = makeUser(['Administrator'])
    expect(checkPermission(user, 'nonexistent' as never, rules)).toBe(false)
  })

  it('returns false when no rules match user roles', () => {
    const user = makeUser(['UnknownRole'])
    expect(checkPermission(user, 'read', rules)).toBe(false)
  })
})
