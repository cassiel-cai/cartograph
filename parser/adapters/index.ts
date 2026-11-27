import { noFramework, type FrameworkAdapter } from "../adapter"
import { detectExpress } from "./express"
import { readManifests } from "./manifests"
import { detectNest } from "./nestjs"
import { detectNext } from "./nextjs"
import { detectReact } from "./react"

// The order is the rule: the first adapter that matches wins. Next.js and
// NestJS come before Express and React because an app can depend on those
// and still be Next or Nest.
export function detectAdapter(root: string, paths: readonly string[]): FrameworkAdapter {
  const manifests = readManifests(root)
  return (
    detectNext(root, paths, manifests) ??
    detectNest(manifests) ??
    detectExpress(manifests) ??
    detectReact(manifests) ??
    noFramework
  )
}
