'use client';

import React, { memo } from 'react';
import { EdgeProps, getBezierPath, getStraightPath } from 'reactflow';

const ConnectionEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps) => {
  const relevance = data?.relevance as 'focus' | 'immediate' | 'secondary' | 'distant' | undefined;
  const isContrarian = !!data?.isContrarian;
  const isBridge = !!data?.isBridge || data?.relationshipType === 'Path Connection';
  const isJourney = data?.neighborhood === 'journey';


  const usesBezier = !isJourney;

  let edgePath: string;
  if (usesBezier) {
    [edgePath] = getBezierPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      curvature: 0.25,
    });
  } else {
    [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  }


  let stroke: string;
  let strokeWidth: number;
  let strokeDasharray = 'none';
  let opacity = 1;

  if (isBridge) {

    const modeKey = data?.mode || 'default';
    const colors: Record<string, string> = {
      default: '96, 165, 250',
      technical: '34, 211, 238',
      historical: '251, 191, 36',
      business: '52, 211, 153',
      philosophical: '167, 139, 250',
      contrarian: '251, 146, 60',
    };
    const rgb = colors[modeKey] || colors.default;
    const baseColor = `rgba(${rgb},`;
    stroke = relevance === 'focus'     ? `${baseColor}0.85)` :
             relevance === 'immediate' ? `${baseColor}0.55)` :
             relevance === 'secondary' ? `${baseColor}0.28)` :
                                         `${baseColor}0.12)`;
    strokeWidth = relevance === 'focus' ? 1.4 : 1.0;
  } else if (isContrarian) {
    const baseColor = 'rgba(251, 146, 60,';
    stroke = relevance === 'focus'     ? `${baseColor}0.70)` :
             relevance === 'immediate' ? `${baseColor}0.45)` :
             relevance === 'secondary' ? `${baseColor}0.22)` :
                                         `${baseColor}0.10)`;
    strokeWidth = 0.85;
    strokeDasharray = '4 3';
  } else if (isJourney) {
    const baseColor = 'rgba(232, 121, 249,';
    stroke = relevance === 'focus'     ? `${baseColor}0.65)` :
             relevance === 'immediate' ? `${baseColor}0.40)` :
             relevance === 'secondary' ? `${baseColor}0.20)` :
                                         `${baseColor}0.08)`;
    strokeWidth = 1.0;
  } else {

    if (relevance === 'focus') {
      stroke = 'rgba(255, 255, 255, 0.55)';
      strokeWidth = 1.0;
    } else if (relevance === 'immediate') {
      stroke = 'rgba(255, 255, 255, 0.28)';
      strokeWidth = 0.85;
    } else if (relevance === 'secondary') {
      stroke = 'rgba(255, 255, 255, 0.12)';
      strokeWidth = 0.7;
    } else {
      // distant
      stroke = 'rgba(255, 255, 255, 0.05)';
      strokeWidth = 0.5;
      opacity = 0.6;
    }
  }


  if (style?.stroke) stroke = style.stroke as string;
  if (style?.strokeWidth) strokeWidth = style.strokeWidth as number;

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={strokeDasharray}
      opacity={opacity}
      markerEnd={markerEnd}
      className="react-flow__edge-path"
      style={{ transition: 'stroke 0.4s ease, stroke-width 0.4s ease, opacity 0.4s ease' }}
    />
  );
};

export default memo(ConnectionEdge);
