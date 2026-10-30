import fs from "node:fs"

type Rule = {
  base: string
  negation: boolean
  directoryOnly: boolean
  expression: RegExp
}

export type IgnoreRules = {
  pushFile(absolutePath: string, base: string): number
  pop(count: number): void
  ignores(relativePath: string, isDirectory: boolean): boolean
}

export function createIgnore(): IgnoreRules {
  const rules: Rule[] = []
  return {
    pushFile(absolutePath, base) {
      const text = fs.readFileSync(absolutePath, "utf8")
      const before = rules.length
      const root = base === "." ? "" : base
      for (const line of text.split("\n")) {
        const rule = parseLine(line, root)
        if (rule) rules.push(rule)
      }
      return rules.length - before
    },
    pop(count) {
      rules.splice(rules.length - count, count)
    },
    ignores(relativePath, isDirectory) {
      let ignored = false
      for (const rule of rules) {
        if (matches(rule, relativePath, isDirectory)) {
          ignored = !rule.negation
        }
      }
      return ignored
    },
  }
}

function parseLine(raw: string, base: string): Rule | null {
  let line = raw.endsWith("\r") ? raw.slice(0, -1) : raw
  line = trimTrailingSpaces(line)
  if (line === "" || line.startsWith("#")) return null

  let negation = false
  if (line.startsWith("!")) {
    negation = true
    line = line.slice(1)
  } else if (line.startsWith("\\#") || line.startsWith("\\!")) {
    line = line.slice(1)
  }
  if (line === "") return null

  let directoryOnly = false
  if (line.endsWith("/")) {
    directoryOnly = true
    line = line.slice(0, -1)
  }
  if (line === "") return null

  let anchored = line.startsWith("/")
  if (anchored) line = line.slice(1)
  if (line.includes("/")) anchored = true
  if (line === "") return null

  const body = globBody(line)
  const source = anchored ? `^${body}$` : `(?:^|/)${body}$`
  let expression: RegExp
  try {
    expression = new RegExp(source)
  } catch {
    throw new Error(`Could not read gitignore pattern: ${raw}`)
  }
  return { base, negation, directoryOnly, expression }
}

function trimTrailingSpaces(line: string): string {
  let end = line.length
  while (end > 0 && line[end - 1] === " ") {
    if (end > 1 && line[end - 2] === "\\") break
    end -= 1
  }
  return line.slice(0, end)
}

function globBody(pattern: string): string {
  let body = ""
  let index = 0
  while (index < pattern.length) {
    const char = pattern[index]
    if (char === "\\") {
      const next = pattern[index + 1]
      if (next === undefined) {
        body += "\\\\"
        index += 1
        continue
      }
      body += escapeLiteral(next)
      index += 2
      continue
    }
    if (char === "*") {
      if (pattern[index + 1] === "*" && pattern[index + 2] === "/") {
        body += "(?:.*/)*"
        index += 3
        continue
      }
      if (pattern[index + 1] === "*") {
        body += ".*"
        index += 2
        continue
      }
      body += "[^/]*"
      index += 1
      continue
    }
    if (char === "?") {
      body += "[^/]"
      index += 1
      continue
    }
    if (char === "[") {
      const end = pattern.indexOf("]", index + 1)
      if (end === -1) {
        body += "\\["
        index += 1
        continue
      }
      body += pattern.slice(index, end + 1)
      index = end + 1
      continue
    }
    body += escapeLiteral(char)
    index += 1
  }
  return body
}

function escapeLiteral(char: string): string {
  if ("\\.^$+(){}|".includes(char)) return `\\${char}`
  return char
}

function matches(
  rule: Rule,
  relativePath: string,
  isDirectory: boolean,
): boolean {
  if (rule.directoryOnly && !isDirectory) return false
  const relative = relativeToBase(rule.base, relativePath)
  if (relative === null || relative === "") return false
  return rule.expression.test(relative)
}

function relativeToBase(base: string, relativePath: string): string | null {
  if (base === "") return relativePath
  if (relativePath === base) return ""
  const prefix = `${base}/`
  if (!relativePath.startsWith(prefix)) return null
  return relativePath.slice(prefix.length)
}
