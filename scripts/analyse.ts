import { createClient } from "@supabase/supabase-js";

import { runAnalysis } from "../lib/pipeline/run";

// Runs the pipeline before the dashboard form exists. The secret key bypasses
// row level security, so this is not the path the form will use. The form
// passes the signed-in client, and the policy decides which organization the
// row belongs to. The key is read here and never written anywhere.
function main(): Promise<void> {
  const { repositoryUrl, organizationId } = readArgs(process.argv.slice(2));
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const secret = required("SUPABASE_SECRET_KEY");
  const client = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return runAnalysis(client, organizationId, repositoryUrl).then((run) => {
    const lines = [
      `analysis: ${run.id}`,
      `repository: ${run.repositoryUrl}`,
      `state: ${run.state}`,
      `stage: ${run.stage ?? ""}`,
      `commit: ${run.commitSha ?? ""}`,
      `files parsed: ${run.filesParsed ?? ""}`,
      `edges: ${run.edgeCount ?? ""}`,
      `already existed: ${run.alreadyExisted ? "yes" : "no"}`,
    ];
    if (run.detail) lines.push(`detail: ${run.detail}`);
    process.stdout.write(`${lines.join("\n")}\n`);
    if (run.state === "failed") process.exitCode = 1;
  });
}

function readArgs(args: readonly string[]): {
  repositoryUrl: string;
  organizationId: string;
} {
  let repositoryUrl: string | null = null;
  let organizationId: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--org") {
      const next = args[index + 1];
      if (!next) throw new Error("--org needs an organization id");
      organizationId = next;
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) throw new Error(`Unknown argument: ${arg}`);
    if (repositoryUrl) throw new Error("Only one repository URL can be analysed");
    repositoryUrl = arg;
  }
  if (!repositoryUrl || !organizationId) {
    throw new Error("Usage: pnpm analyse <repository url> --org <organization id>");
  }
  return { repositoryUrl, organizationId };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it in .env.local.`);
  return value;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
