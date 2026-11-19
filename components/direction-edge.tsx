"use client";

import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from "@xyflow/react";

type DirectionData = { colored: boolean };

export type DirectionFlowEdge = Edge<DirectionData, "direction">;

// The orange number is fan-out, so the line leaves in --out.
// The green number is fan-in, so the same line arrives in --in.
export function DirectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps<DirectionFlowEdge>) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const colored = data?.colored === true;
  const gradientId = `dir-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  return (
    <>
      {colored ? (
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={sourceX}
            y1={sourceY}
            x2={targetX}
            y2={targetY}
          >
            <stop offset="0%" stopColor="var(--out)" />
            <stop offset="100%" stopColor="var(--in)" />
          </linearGradient>
        </defs>
      ) : null}
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: colored
            ? `url(#${gradientId})`
            : "color-mix(in srgb, var(--foreground) 55%, transparent)",
          strokeWidth: colored ? 1.25 : 1,
        }}
      />
    </>
  );
}