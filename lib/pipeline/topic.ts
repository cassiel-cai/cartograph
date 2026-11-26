// The migration publishes exactly this topic, event, and payload. The progress
// page subscribes to it and renders the two fields. Nothing else is on the wire.
export const STAGE_EVENT = "stage";

export function analysisTopic(id: number): string {
  return `analysis:${id}`;
}

export type StageMessage = {
  stage: string;
  message: string | null;
};

export function readStageMessage(value: unknown): StageMessage | null {
  if (!isRecord(value)) return null;
  const body = isRecord(value.payload) ? value.payload : value;
  if (typeof body.stage !== "string") return null;
  if (body.message != null && typeof body.message !== "string") return null;
  return { stage: body.stage, message: body.message ?? null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
