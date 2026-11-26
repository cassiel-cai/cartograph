import { noFramework, type FrameworkAdapter } from "../adapter"
import { readManifests } from "./manifests"
import { detectNest } from "./nestjs"
import { detectNext } from "./nextjs"
import { detectReact } from "./react"

// The order is the rule: the first adapter that matches wins. Next.js and
// NestJS come before React because both of them usually sit on top of it.
export function detectAdapter(root: string, paths: readonly string[]): FrameworkAdapter {
  const manifests = readManifests(root)
  return (
    detectNext(root, paths, manifests) ??
    detectNest(manifests) ??
    detectReact(manifests) ??
    noFramework
  )
}
