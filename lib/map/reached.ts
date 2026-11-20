// The parse result does not record a role. A page, route, layout, middleware
// file, or config file is still reached by the tool that loads it, so a fan-in
// of zero there is a limit of the import graph, not a fact about the file.
const APP_FILE = /^(page|layout|route)\.(tsx|ts|jsx|js|mjs|cjs)$/;
const MIDDLEWARE = /^middleware\.(tsx|ts|jsx|js|mjs|cjs)$/;
const SOURCE = /\.(tsx|ts|jsx|js|mjs|cjs)$/;

export function reachedByFramework(path: string): boolean {
  const name = path.slice(path.lastIndexOf("/") + 1);
  if (APP_FILE.test(name)) return true;
  if (MIDDLEWARE.test(name) && (path === name || path === `src/${name}`)) return true;
  if (/\.config\.[^.]+$/.test(name)) return true;
  if (/^tsconfig(\..+)?\.json$/.test(name)) return true;
  return inPagesRouter(path, name);
}

function inPagesRouter(path: string, name: string): boolean {
  if (!SOURCE.test(name)) return false;
  const parts = path.split("/");
  const index = parts.indexOf("pages");
  if (index === -1) return false;
  const prefix = parts.slice(0, index);
  return prefix.length === 0 || (prefix.length === 1 && prefix[0] === "src");
}
