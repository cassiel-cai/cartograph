import type { ParseCounts, SkippedFile } from "@/parser/types";

export type Coverage = {
  percent: number;
  filesParsed: number;
  // Parsed files plus source files that should have been parsed and were not.
  sourceFiles: number;
  // Skipped on purpose: not TypeScript or JavaScript, or a symlink.
  notCode: number;
  importsResolved: number;
  importsInternal: number;
};

// A markdown file or an image was never going to be in the graph, so it is
// counted and shown but is not a gap. Any other reason a file was skipped
// (unreadable, not reachable) is a gap, so an unknown reason never hides one.
function isNotCode(file: SkippedFile): boolean {
  return file.reason.startsWith("unsupported extension") || file.reason === "symlink";
}

// The headline is the lower of two plain ratios: source files parsed, and
// internal imports that landed on a file. External packages and excluded
// folders are not gaps. Floored so a map missing anything never reads as 100%.
export function coverageOf(counts: ParseCounts, skipped: readonly SkippedFile[]): Coverage {
  const notCode = skipped.filter(isNotCode).length;
  const sourceFiles = counts.filesParsed + (skipped.length - notCode);
  const importsInternal = counts.importsResolved + counts.importsUnresolved;
  const fileRatio = sourceFiles === 0 ? 1 : counts.filesParsed / sourceFiles;
  const importRatio = importsInternal === 0 ? 1 : counts.importsResolved / importsInternal;
  return {
    percent: Math.floor(Math.min(fileRatio, importRatio) * 100),
    filesParsed: counts.filesParsed,
    sourceFiles,
    notCode,
    importsResolved: counts.importsResolved,
    importsInternal,
  };
}

export function isPartial(coverage: Coverage): boolean {
  return (
    coverage.filesParsed < coverage.sourceFiles ||
    coverage.importsResolved < coverage.importsInternal
  );
}
