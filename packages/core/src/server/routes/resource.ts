/**
 * Auto-generated CRUD routes for Schematype resources.
 *
 * Generates: GET (list), POST (create), GET/:name, PUT/:name, DELETE/:name
 * for every registered Schematype.
 */
import type { FastifyInstance } from 'fastify'
import type { SchemaRegistry } from '../../schema/registry'

interface DocStore {
  docs: Array<Record<string, unknown>>
  nextId: number
}

/**
 * Register CRUD routes for all schemas in the registry.
 * Uses an in-memory store for Phase 1 (replaced by Drizzle ORM in integration).
 */
export function registerResourceRoutes(
  app: FastifyInstance,
  registry: SchemaRegistry,
): void {
  // In-memory doc stores per schematype (Phase 1 — replaced by ORM later)
  const stores = new Map<string, DocStore>()

  function getStore(name: string): DocStore {
    let store = stores.get(name)
    if (!store) {
      store = { docs: [], nextId: 1 }
      stores.set(name, store)
    }
    return store
  }

  // Wildcard route handler for /api/resource/:schematype
  app.get<{ Params: { schematype: string } }>(
    '/api/resource/:schematype',
    (request, reply) => {
      const { schematype } = request.params
      if (!registry.has(schematype)) {
        return reply.status(404).send({ message: `Schema "${schematype}" not found`, data: null })
      }
      const store = getStore(schematype)
      return reply.send({
        data: store.docs,
        total: store.docs.length,
        page: 1,
      })
    },
  )

  app.post<{ Params: { schematype: string }; Body: Record<string, unknown> }>(
    '/api/resource/:schematype',
    (request, reply) => {
      const { schematype } = request.params
      if (!registry.has(schematype)) {
        return reply.status(404).send({ message: `Schema "${schematype}" not found`, data: null })
      }
      const store = getStore(schematype)
      const doc = {
        ...request.body,
        name: `${schematype}-${String(store.nextId).padStart(4, '0')}`,
        docstatus: 0,
        created_at: new Date().toISOString(),
      }
      store.nextId++
      store.docs.push(doc)
      return reply.status(201).send({ data: doc })
    },
  )

  app.get<{ Params: { schematype: string; name: string } }>(
    '/api/resource/:schematype/:name',
    (request, reply) => {
      const { schematype, name } = request.params
      if (!registry.has(schematype)) {
        return reply.status(404).send({ message: `Schema "${schematype}" not found`, data: null })
      }
      const store = getStore(schematype)
      const doc = store.docs.find(d => d['name'] === name)
      if (!doc) {
        return reply.status(404).send({ message: `Document "${name}" not found`, data: null })
      }
      return reply.send({ data: doc })
    },
  )

  app.put<{ Params: { schematype: string; name: string }; Body: Record<string, unknown> }>(
    '/api/resource/:schematype/:name',
    (request, reply) => {
      const { schematype, name } = request.params
      if (!registry.has(schematype)) {
        return reply.status(404).send({ message: `Schema "${schematype}" not found`, data: null })
      }
      const store = getStore(schematype)
      const idx = store.docs.findIndex(d => d['name'] === name)
      if (idx === -1) {
        return reply.status(404).send({ message: `Document "${name}" not found`, data: null })
      }
      const existing = store.docs[idx]
      if (!existing) {
        return reply.status(404).send({ message: `Document "${name}" not found`, data: null })
      }
      const updated = { ...existing, ...request.body, name }
      store.docs[idx] = updated
      return reply.send({ data: updated })
    },
  )

  app.delete<{ Params: { schematype: string; name: string } }>(
    '/api/resource/:schematype/:name',
    (request, reply) => {
      const { schematype, name } = request.params
      if (!registry.has(schematype)) {
        return reply.status(404).send({ message: `Schema "${schematype}" not found`, data: null })
      }
      const store = getStore(schematype)
      const idx = store.docs.findIndex(d => d['name'] === name)
      if (idx === -1) {
        return reply.status(404).send({ message: `Document "${name}" not found`, data: null })
      }
      store.docs.splice(idx, 1)
      return reply.send({ data: null, message: 'Deleted' })
    },
  )
}
