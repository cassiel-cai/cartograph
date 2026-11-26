export function analysisPath(id: number, state: string): string {
  return state === "complete" ? `/analyses/${id}/map` : `/analyses/${id}`;
}
