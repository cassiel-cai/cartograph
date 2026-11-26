import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseResultFromGraph } from "@/lib/map/stored";
import { PARSE_RESULT_VERSION, type ParseResult } from "@/parser/types";

export type StoredMap =
  | { kind: "current"; result: ParseResult }
  // Written by a parser that did not read roles or routes.
  | { kind: "outdated" }
  // Stored, but it does not add up. The reason is shown, not smoothed over.
  | { kind: "unreadable"; reason: string };

export async function loadStoredMap(id: number): Promise<StoredMap | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("analysis_graph", { target_id: id });
  if (error) throw new Error(`Could not read the map: ${error.message}`);
  if (data === null) return null;
  if (readVersion(data) !== PARSE_RESULT_VERSION) return { kind: "outdated" };
  try {
    return { kind: "current", result: parseResultFromGraph(data) };
  } catch (cause) {
    return {
      kind: "unreadable",
      reason: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

function readVersion(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const version = (value as Record<string, unknown>).parse_version;
  return typeof version === "number" ? version : null;
}
