import {
  Node,
  SyntaxKind,
  type CallExpression,
  type PropertyAssignment,
  type SourceFile,
} from "ts-morph"

import type { EdgeKind } from "./types"

export type SeenImport = {
  kind: EdgeKind
  typeOnly: boolean
  line: number
  specifier: string | null
  text: string
}

// `import("x").T` is a type query, not one of the edges recorded here.
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
  // `import x = require("literal")` is a require, not an import declaration.
  for (const declaration of source.getDescendantsOfKind(SyntaxKind.ImportEqualsDeclaration)) {
    const reference = declaration.getModuleReference()
    if (!Node.isExternalModuleReference(reference)) continue
    const expression = reference.getExpression()
    if (!expression) continue
    const literal = literalValue(expression)
    seen.push({
      kind: declaration.isExported() ? "reexport" : "import",
      typeOnly: declaration.isTypeOnly(),
      line: lineOf(expression),
      specifier: literal,
      text: literal ?? expressionText(expression),
    })
  }
  // A require() whose argument is not a literal is kept and left unresolved.
  // One that is the value of a CommonJS export is a re-export, and only when
  // the exported name can be read off the syntax. The same file can also
  // import that module; both are reported, and the edge list drops duplicates.
  for (const call of source.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (!isRequireCall(call)) continue
    const first = call.getArguments()[0]
    if (!first) {
      seen.push({
        kind: "import",
        typeOnly: false,
        line: call.getStartLineNumber(),
        specifier: null,
        text: "",
      })
      continue
    }
    const literal = literalValue(first)
    const kind = literal !== null && isCommonJsReexport(call) ? "reexport" : "import"
    if (literal !== null) {
      seen.push({
        kind,
        typeOnly: false,
        line: first.getStartLineNumber(),
        specifier: literal,
        text: literal,
      })
      continue
    }
    seen.push({
      kind: "import",
      typeOnly: false,
      line: first.getStartLineNumber(),
      specifier: null,
      text: expressionText(first),
    })
  }
  return seen
}

function isRequireCall(call: CallExpression): boolean {
  const expression = call.getExpression()
  return Node.isIdentifier(expression) && expression.getText() === "require"
}

// The exported name, read off the assignment this require is the value of.
// "*" is the whole exports object (`module.exports = require(...)`). Null means
// the name is not there or not a literal, so the call stays a plain import.
function exportedName(call: CallExpression): string | null {
  let current: Node = call
  for (;;) {
    const parent = current.getParent()
    if (!parent) return null
    if (isTransparent(parent)) {
      current = parent
      continue
    }
    if (Node.isExportAssignment(parent)) {
      return parent.isExportEquals() ? "*" : "default"
    }
    if (
      Node.isBinaryExpression(parent) &&
      parent.getOperatorToken().getKind() === SyntaxKind.EqualsToken &&
      parent.getRight() === current
    ) {
      return exportAssignmentName(parent.getLeft())
    }
    if (Node.isPropertyAssignment(parent) && parent.getInitializer() === current) {
      if (!objectIsModuleExports(parent.getParent())) return null
      return staticPropertyName(parent)
    }
    if (Node.isSpreadAssignment(parent) && parent.getExpression() === current) {
      if (!objectIsModuleExports(parent.getParent())) return null
      return "*"
    }
    return null
  }
}

function isCommonJsReexport(call: CallExpression): boolean {
  return exportedName(call) !== null
}

function exportAssignmentName(left: Node): string | null {
  if (isModuleExports(left)) return "*"
  if (!Node.isPropertyAccessExpression(left)) return null
  const object = left.getExpression()
  if (isModuleExports(object)) return left.getName()
  if (Node.isIdentifier(object) && object.getText() === "exports") return left.getName()
  return null
}

function isModuleExports(node: Node): boolean {
  return (
    Node.isPropertyAccessExpression(node) &&
    node.getName() === "exports" &&
    Node.isIdentifier(node.getExpression()) &&
    node.getExpression().getText() === "module"
  )
}

function objectIsModuleExports(node: Node | undefined): boolean {
  if (!node) return false
  let current = node
  for (;;) {
    const parent = current.getParent()
    if (!parent) return false
    if (isTransparent(parent)) {
      current = parent
      continue
    }
    if (Node.isExportAssignment(parent)) return parent.isExportEquals()
    return (
      Node.isBinaryExpression(parent) &&
      parent.getOperatorToken().getKind() === SyntaxKind.EqualsToken &&
      parent.getRight() === current &&
      isModuleExports(parent.getLeft())
    )
  }
}

function staticPropertyName(property: PropertyAssignment): string | null {
  if (!Node.isPropertyAssignment(property)) return null
  const name = property.getNameNode()
  if (Node.isIdentifier(name) || Node.isStringLiteral(name) || Node.isNumericLiteral(name)) {
    return property.getName()
  }
  if (Node.isComputedPropertyName(name)) return literalValue(name.getExpression())
  return null
}

function isTransparent(node: Node): boolean {
  return (
    Node.isParenthesizedExpression(node) ||
    Node.isAsExpression(node) ||
    Node.isSatisfiesExpression(node) ||
    Node.isTypeAssertion(node) ||
    Node.isNonNullExpression(node) ||
    Node.isAwaitExpression(node)
  )
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
