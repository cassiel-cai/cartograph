import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { canonicalRepositoryUrl, type RepositoryRef } from "./url";

const execFileAsync = promisify(execFile);

export type FetchedRepository = {
  ref: RepositoryRef;
  commitSha: string;
  root: string;
  cleanup: () => Promise<void>;
};

// Public archives only. git is told not to use a credential helper, so a token
// on this machine is neither sent nor stored. The commit recorded is the one
// the archive was built from.
export async function fetchRepository(input: string): Promise<FetchedRepository> {
  const ref = canonicalRepositoryUrl(input);
  const named = ref.ref;
  const commitSha =
    named !== null && /^[0-9a-f]{40}$/.test(named) ? named : await readRemoteCommit(ref);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "cartograph-"));
  const cleanup = () => fs.rm(directory, { recursive: true, force: true });

  try {
    const archivePath = path.join(directory, "archive.tar.gz");
    await downloadArchive(ref, commitSha, archivePath);
    const extracted = path.join(directory, "source");
    await fs.mkdir(extracted);
    await execFileAsync("tar", ["-xzf", archivePath, "-C", extracted]);
    const root = await archiveRoot(extracted);
    return { ref, commitSha, root, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function readRemoteCommit(ref: RepositoryRef): Promise<string> {
  const remote = `https://github.com/${ref.owner}/${ref.repo}.git`;
  const wanted = ref.ref ? `refs/heads/${ref.ref}` : "HEAD";
  let stdout = "";
  try {
    const result = await execFileAsync(
      "git",
      ["-c", "credential.helper=", "ls-remote", "--symref", remote, wanted],
      { env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, timeout: 30_000 },
    );
    stdout = result.stdout;
  } catch (error) {
    throw gitFailure(error, ref.url);
  }

  for (const line of stdout.split("\n")) {
    if (line.startsWith("ref:")) continue;
    const [commit, name] = line.split("\t");
    if (name === wanted && /^[0-9a-f]{40}$/.test(commit ?? "")) return commit;
  }
  throw new Error(`GitHub did not return a commit for ${ref.url}.`);
}

async function downloadArchive(
  ref: RepositoryRef,
  commitSha: string,
  destination: string,
): Promise<void> {
  const response = await fetch(
    `https://codeload.github.com/${ref.owner}/${ref.repo}/tar.gz/${commitSha}`,
    { headers: { "user-agent": "cartograph" }, redirect: "follow" },
  );
  if (response.status === 404) {
    throw new Error(`GitHub could not find ${ref.url} at ${commitSha}.`);
  }
  if (!response.ok) {
    throw new Error(
      `GitHub archive download failed for ${ref.url} (${response.status}).`,
    );
  }
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function archiveRoot(extracted: string): Promise<string> {
  const entries = await fs.readdir(extracted);
  if (entries.length !== 1) {
    throw new Error(
      `The archive extracted to ${entries.length} entries; expected one directory.`,
    );
  }
  const root = path.join(extracted, entries[0]);
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) {
    throw new Error("The archive did not contain a repository directory.");
  }
  return root;
}

function gitFailure(error: unknown, label: string): Error {
  const stderr = execText(error, "stderr");
  if (/not found|authentication|denied|terminal prompts disabled/i.test(stderr)) {
    return new Error(
      `GitHub could not find ${label}. It may be missing, private, or renamed.`,
    );
  }
  const detail = stderr.trim() || (error instanceof Error ? error.message : String(error));
  return new Error(`Could not read ${label} from GitHub. ${detail}`);
}

function execText(error: unknown, field: "stderr" | "stdout"): string {
  if (typeof error !== "object" || error === null || !(field in error)) return "";
  const value = (error as { stderr?: unknown; stdout?: unknown })[field];
  return typeof value === "string" ? value : "";
}
