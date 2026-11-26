export type RepositoryRef = {
  owner: string;
  repo: string;
  url: string;
  ref: string | null;
};

// One stored row per repository, so the URL has to land on a single spelling.
// GitHub treats the owner and name as case-insensitive.
export function canonicalRepositoryUrl(input: string): RepositoryRef {
  let parsed: URL;
  const text = input.trim();
  try {
    // The form's placeholder shows the address without a scheme.
    parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    throw new Error("That is not a repository URL.");
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") {
    throw new Error(
      "Only a public https://github.com repository URL can be analysed.",
    );
  }

  const parts = parsed.pathname.split("/").filter((part) => part.length > 0);
  if (parts.length < 2) {
    throw new Error("The URL needs a GitHub owner and repository.");
  }

  const owner = parts[0].toLowerCase();
  let repo = parts[1].toLowerCase();
  if (repo.endsWith(".git")) repo = repo.slice(0, -4);
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo) || repo.length === 0) {
    throw new Error("The URL needs a GitHub owner and repository.");
  }

  let ref: string | null = null;
  if (parts[2] === "tree" || parts[2] === "commit") {
    ref = decodeURIComponent(parts.slice(3).join("/"));
    if (ref.length === 0) {
      throw new Error("The URL names a branch or commit but the name is missing.");
    }
  } else if (parts.length > 2) {
    throw new Error("Paste the repository URL, not a file inside it.");
  }

  return {
    owner,
    repo,
    url: `https://github.com/${owner}/${repo}`,
    ref,
  };
}
