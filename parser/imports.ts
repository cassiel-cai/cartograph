import { Node, SyntaxKind, type SourceFile } from "ts-morph"

import type { EdgeKind } from "./types"

export type SeenImport = {
  kind: EdgeKind
  typeOnly: boolean
  line: number
  specifier: string | null
  text: string
}

// require() and `import x = require()` are out of this phase, so they are not read.
// `import("x").T` is a type query, not one of the three edges this phase records.
export function readImports(source: SourceFile): SeenImport[] {
  const seen: SeenImport[] = []
  for (const declaration of source.getImportDeclarations()) {
    const specifier = declaration.getModuleSpecifierValue()
    seen.push({
      kind: "import",
      typeOnly: declaration.isTypeOnly(),
      line: lineOf(declaration.getModuleSpecifier() ?? declaration),
      specifier,
      text: specifier,
    })
  }
  for (const declaration of source.getExportDeclarations()) {
    if (!declaration.hasModuleSpecifier()) continue
    const specifier = declaration.getModuleSpecifierValue()
    if (specifier === undefined) continue
    seen.push({
      kind: "reexport",
      typeOnly: typeOnlyReexport(declaration),
      line: lineOf(declaration.getModuleSpecifier() ?? declaration),
      specifier,
      text: specifier,
    })
  }
  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getKind() !== SyntaxKind.ImportKeyword) continue
    const first = call.getArguments()[0]
    if (!first) {
      seen.push({
        kind: "dynamic",
        typeOnly: false,
        line: call.getStartLineNumber(),
        specifier: null,
        text: "",
      })
      continue
    }
    const literal = literalValue(first)
    if (literal !== null) {
      seen.push({
        kind: "dynamic",
        typeOnly: false,
        line: first.getStartLineNumber(),
        specifier: literal,
        text: literal,
      })
      continue
    }
    seen.push({
      kind: "dynamic",
      typeOnly: false,
      line: first.getStartLineNumber(),
      specifier: null,
      text: expressionText(first),
    })
  }
  return seen
}

function typeOnlyReexport(
  declaration: ReturnType<SourceFile["getExportDeclarations"]>[number],
): boolean {
  if (declaration.isTypeOnly()) return true
  if (declaration.isNamespaceExport() || !declaration.hasNamedExports()) {
    return false
  }
  const named = declaration.getNamedExports()
  return named.length > 0 && named.every((item) => item.isTypeOnly())
}

function literalValue(node: Node): string | null {
  if (Node.isStringLiteral(node)) return node.getLiteralValue()
  if (Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralValue()
  return null
}

function lineOf(node: { getStartLineNumber(): number }): number {
  return node.getStartLineNumber()
}

function expressionText(node: Node): string {
  const text = node.getText().replace(/\s+/g, " ").trim()
  return text.length <= 500 ? text : text.slice(0, 500)
}
