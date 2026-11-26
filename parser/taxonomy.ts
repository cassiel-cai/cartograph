// The rail's category names, in rail order. Pure data with no imports, so a
// browser component can read it without a parser or the filesystem in the
// bundle. Order is reading order: routable surfaces, the layers behind them,
// then plumbing. It is fixed per adapter and never sorted by count.

export const GENERIC_ADAPTER = "none"

export const ROLE = {
  source: "Source files",
  other: "Other files",
  pageRoutes: "Page routes",
  apiEndpoints: "API endpoints",
  serverActions: "Server actions",
  layouts: "Layouts",
  middleware: "Middleware",
  components: "Components",
  hooks: "Hooks",
  controllers: "Controllers",
  services: "Services",
  modules: "Modules",
  entities: "Entities",
  dtos: "DTOs",
  guards: "Guards",
  interceptors: "Interceptors",
  pipes: "Pipes",
  filters: "Filters",
} as const

const ROLES_BY_ADAPTER: Record<string, readonly string[]> = {
  [GENERIC_ADAPTER]: [ROLE.source],
  nextjs: [
    ROLE.pageRoutes,
    ROLE.apiEndpoints,
    ROLE.serverActions,
    ROLE.layouts,
    ROLE.middleware,
    ROLE.components,
    ROLE.hooks,
    ROLE.other,
  ],
  nestjs: [
    ROLE.controllers,
    ROLE.services,
    ROLE.modules,
    ROLE.entities,
    ROLE.dtos,
    ROLE.guards,
    ROLE.interceptors,
    ROLE.pipes,
    ROLE.filters,
    ROLE.middleware,
    ROLE.other,
  ],
  react: [ROLE.components, ROLE.hooks, ROLE.other],
}

export function rolesFor(adapter: string): readonly string[] | null {
  return ROLES_BY_ADAPTER[adapter] ?? null
}

// The role a file gets when the adapter recognised nothing about it.
export function fallbackRole(adapter: string): string | null {
  const roles = rolesFor(adapter)
  if (!roles) return null
  return roles[roles.length - 1]
}
