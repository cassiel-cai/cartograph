import { extensionColor, extensionOf, fileCategories } from "@/lib/map/categories";
import { GENERIC_ADAPTER, rolesFor } from "@/parser/taxonomy";

export type RailItem = {
  key: string;
  label: string;
  count: number;
  // Only the extension rail has colour; a role name needs none.
  color: string | null;
};

type RailFile = { path: string; role: string };

// A framework repository is listed by role in the adapter's fixed order, so a
// category never moves because of its count. With no adapter the rail falls
// back to file extensions, which is all that is known.
export function railItems(adapter: string, files: readonly RailFile[]): RailItem[] {
  if (adapter === GENERIC_ADAPTER) {
    return fileCategories(files).map((category) => ({
      key: category.extension,
      label: category.extension,
      count: category.count,
      color: extensionColor(category.extension),
    }));
  }
  const roles = rolesFor(adapter);
  if (!roles) throw new Error(`No role list for adapter ${adapter}.`);
  const counts = new Map<string, number>();
  for (const file of files) counts.set(file.role, (counts.get(file.role) ?? 0) + 1);
  return roles
    .filter((role) => (counts.get(role) ?? 0) > 0)
    .map((role) => ({ key: role, label: role, count: counts.get(role) ?? 0, color: null }));
}

export function inRailCategory(adapter: string, file: RailFile, key: string): boolean {
  return adapter === GENERIC_ADAPTER ? extensionOf(file.path) === key : file.role === key;
}
