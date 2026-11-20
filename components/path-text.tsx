// The directory is context. The file name is the part you scan for.
export function PathText({ text }: { text: string }) {
  const slash = text.lastIndexOf("/");
  if (slash === -1) return text;
  return (
    <>
      <span className="text-muted">{text.slice(0, slash + 1)}</span>
      {text.slice(slash + 1)}
    </>
  );
}
