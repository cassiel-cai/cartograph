import type { FrameworkAdapter } from "../adapter"
import { ROLE } from "../taxonomy"
import type { Manifest } from "./manifests"

// Directory convention, not filename suffixes. Singular and plural are the same
// role. `router` is the same layer as `route`: Express repositories use both words.
const FOLDER_ROLES: Record<string, string> = {
  route: ROLE.routes,
  routes: ROLE.routes,
  router: ROLE.routes,
  routers: ROLE.routes,
  controller: ROLE.controllers,
  controllers: ROLE.controllers,
  middleware: ROLE.middleware,
  middlewares: ROLE.middleware,
  model: ROLE.models,
  models: ROLE.models,
  service: ROLE.services,
  services: ROLE.services,
  view: ROLE.views,
  views: ROLE.views,
  config: ROLE.config,
  configs: ROLE.config,
}

export function detectExpress(manifests: readonly Manifest[]): FrameworkAdapter | null {
  if (!manifests.some((manifest) => manifest.dependencies.has("express"))) return null
  return {
    name: "express",
    excludedDirectories: () => [],
    entryPoints: () => [],
    roleOf(file) {
      return roleFromPath(file.path)
    },
    // A route is built at runtime from routers and middleware, so there is no
    // pattern to read. The table stays empty.
    routes: () => [],
  }
}

function roleFromPath(filePath: string): string {
  const segments = filePath.split("/")
  segments.pop()
  for (const segment of segments) {
    const role = FOLDER_ROLES[segment.toLowerCase()]
    if (role) return role
  }
  return ROLE.other
}
