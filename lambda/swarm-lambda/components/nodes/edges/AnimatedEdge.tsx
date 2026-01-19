'use client';

import type { EdgeProps } from '@xyflow/react';
import { getBezierPath } from '@xyflow/react';

export default function AnimatedEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected
  } = props;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.25
  });

  return (
    <g className={selected ? 'edgeGlow edgeGlow--selected' : 'edgeGlow'}>
      {/* base */}
      <path className="edgeGlow__base" d={edgePath} fill="none" />
      {/* animated dashed overlay */}
      <path className="edgeGlow__dash" d={edgePath} fill="none">
        <animate
          attributeName="stroke-dashoffset"
          values="0;-40"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  );
}
