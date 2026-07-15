'use client';

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ExplorationMode } from '@/store/useIntersticeStore';

interface ConceptNodeProps {
  id: string;
  data: {
    label: string;
    isRoot?: boolean;
    isExpanded?: boolean;
    isPathConnection?: boolean;
    isNeighborhoodLabel?: boolean;
    relevance?: 'focus' | 'immediate' | 'secondary' | 'distant';
    mode?: ExplorationMode;
    neighborhood?: string;
    neighborhoodLabel?: string;
    journeyIndex?: number;
    depth?: number;
  };
  selected?: boolean;
}


const MODE_COLORS: Record<string, { primary: string; glow: string }> = {
  default:       { primary: 'rgb(96, 165, 250)',   glow: 'rgba(96, 165, 250, 0.25)' },
  technical:     { primary: 'rgb(34, 211, 238)',   glow: 'rgba(34, 211, 238, 0.25)' },
  historical:    { primary: 'rgb(251, 191, 36)',   glow: 'rgba(251, 191, 36, 0.25)' },
  business:      { primary: 'rgb(52, 211, 153)',   glow: 'rgba(52, 211, 153, 0.25)' },
  philosophical: { primary: 'rgb(167, 139, 250)',  glow: 'rgba(167, 139, 250, 0.25)' },
  contrarian:    { primary: 'rgb(251, 146, 60)',   glow: 'rgba(251, 146, 60, 0.25)' },
  journey:       { primary: 'rgb(232, 121, 249)',  glow: 'rgba(232, 121, 249, 0.25)' },
};

const ConceptNode = ({ id, data, selected }: ConceptNodeProps) => {
  const isRoot = data.isRoot || id === 'root';
  const isFocus = isRoot || data.relevance === 'focus';
  const relevance = data.relevance ?? (isRoot ? 'focus' : 'distant');
  const isPath = data.isPathConnection;
  const isJourneyStep = data.journeyIndex !== undefined;
  const modeKey = data.mode || 'default';
  const modeColor = MODE_COLORS[modeKey] || MODE_COLORS.default;

  const handle = isPath ? (
    <>
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 0, height: 0, border: 'none', background: 'none', pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 0, height: 0, border: 'none', background: 'none', pointerEvents: 'none' }} />
    </>
  ) : (
    <>
      <Handle type="target" position={Position.Top}
        style={{ opacity: 0, width: 0, height: 0, border: 'none', background: 'none', pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom}
        style={{ opacity: 0, width: 0, height: 0, border: 'none', background: 'none', pointerEvents: 'none' }} />
    </>
  );


  if (isFocus) {
    return (
      <div
        className="select-none"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          background: 'var(--node-bg)',
          border: `1px solid ${selected ? modeColor.primary : 'rgba(var(--node-text-rgb), 0.18)'}`,
          borderRadius: '2px',
          boxShadow: selected
            ? `0 0 0 1px ${modeColor.primary}, var(--shadow-node), 0 0 20px ${modeColor.glow}`
            : 'var(--shadow-node)',
          minWidth: 120,
          cursor: 'default',
        }}
      >
        {handle}

        <div style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: '2px',
          background: modeColor.primary,
          borderRadius: '0 0 2px 2px',
          opacity: 0.85,
        }} />
        <span style={{
          fontFamily: 'var(--font-dm-serif), Georgia, serif',
          fontSize: '18px',
          fontWeight: 400,
          color: 'var(--node-text)',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          textAlign: 'center',
          maxWidth: 200,
          wordBreak: 'break-word',
          whiteSpace: 'normal',
        }}>
          {data.label}
        </span>
        {data.neighborhoodLabel && !isRoot && (
          <span style={{
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontSize: '8px',
            fontWeight: 500,
            letterSpacing: '0.2em',
            color: modeColor.primary,
            textTransform: 'uppercase',
            opacity: 0.7,
          }}>
            {data.neighborhoodLabel}
          </span>
        )}
      </div>
    );
  }


  if (isJourneyStep) {
    const idx = data.journeyIndex!;
    const isFirst = idx === 0;
    return (
      <div
        className="select-none group cursor-pointer"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 16px',
          background: 'var(--node-bg)',
          border: `1px solid ${isFirst ? modeColor.primary : selected ? 'rgba(var(--node-text-rgb), 0.3)' : 'rgba(var(--node-text-rgb), 0.1)'}`,
          borderRadius: '2px',
          transition: 'background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease',
          boxShadow: selected
            ? `0 0 0 1px rgba(var(--node-text-rgb), 0.3), var(--shadow-node)`
            : 'var(--shadow-node)',
          minWidth: 90,
        }}
      >
        {handle}
        <span style={{
          fontFamily: 'var(--font-geist-sans), sans-serif',
          fontSize: '8px',
          fontWeight: 500,
          letterSpacing: '0.2em',
          color: modeColor.primary,
          textTransform: 'uppercase',
          opacity: 0.7,
        }}>
          {String(idx + 1).padStart(2, '0')}
        </span>
        <span style={{
          fontFamily: 'var(--font-geist-sans), sans-serif',
          fontSize: '12px',
          fontWeight: 400,
          color: relevance === 'focus' ? 'var(--node-text)' : relevance === 'immediate' ? 'rgba(var(--node-text-rgb), 0.85)' : 'rgba(var(--node-text-rgb), 0.5)',
          letterSpacing: '0.01em',
          textAlign: 'center',
          maxWidth: 140,
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          lineHeight: 1.3,
          transition: 'color 0.2s',
        }}>
          {data.label}
        </span>
      </div>
    );
  }


  if (isPath) {
    return (
      <div
        className="select-none group cursor-pointer"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          background: 'var(--node-bg)',
          border: `1px solid ${selected ? modeColor.primary : `${modeColor.primary}40`}`,
          borderRadius: '2px',
          transition: 'background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease',
          boxShadow: selected
            ? `0 0 0 1px ${modeColor.primary}50, var(--shadow-node), 0 0 8px ${modeColor.glow}`
            : 'var(--shadow-node)',
          minWidth: 80,
        }}
      >
        {handle}
        <div style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: modeColor.primary,
          flexShrink: 0,
          boxShadow: `0 0 6px ${modeColor.glow}`,
        }} />
        <span style={{
          fontFamily: 'var(--font-geist-sans), sans-serif',
          fontSize: '12px',
          fontWeight: 400,
          color: selected ? 'var(--node-text)' : relevance === 'immediate' ? 'rgba(var(--node-text-rgb), 0.85)' : 'rgba(var(--node-text-rgb), 0.6)',
          letterSpacing: '0.01em',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          maxWidth: 160,
          transition: 'color 0.2s',
        }}>
          {data.label}
        </span>
      </div>
    );
  }



  const styleByRelevance = {
    focus:     { fontSize: 13, opacity: 1.0,  dotSize: 6, borderOpacity: 0.45, bgOpacity: 0.96, labelOpacity: 1.0 },
    immediate: { fontSize: 12, opacity: 0.96, dotSize: 5, borderOpacity: 0.3,  bgOpacity: 0.92, labelOpacity: 0.95 },
    secondary: { fontSize: 11, opacity: 0.8,  dotSize: 4, borderOpacity: 0.18, bgOpacity: 0.85, labelOpacity: 0.75 },
    distant:   { fontSize: 10, opacity: 0.6,  dotSize: 3, borderOpacity: 0.12, bgOpacity: 0.75, labelOpacity: 0.55 },
  };
  const s = styleByRelevance[relevance] || styleByRelevance.distant;

  const dotColor = relevance === 'distant'
    ? `rgba(var(--node-text-rgb), ${s.dotSize * 0.04})`
    : modeColor.primary;

  const isExpanded = data.isExpanded;

  return (
    <div
      className="select-none group cursor-pointer"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        padding: '7px 12px',
        background: `rgba(var(--node-bg-rgb), ${s.bgOpacity})`,
        border: `1px solid rgba(var(--node-text-rgb), ${selected ? 0.35 : s.borderOpacity})`,
        borderRadius: '2px',
        opacity: s.opacity,
        transition: 'opacity 0.3s ease, background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease, transform 0.15s ease',
        boxShadow: selected
          ? `0 0 0 1px rgba(var(--node-text-rgb), 0.25), var(--shadow-node), 0 0 12px ${modeColor.glow}`
          : isExpanded
            ? 'var(--shadow-node)'
            : 'var(--shadow-node)',
        minWidth: 60,
        maxWidth: 180,
      }}
    >
      {handle}


      <div style={{
        width: s.dotSize,
        height: s.dotSize,
        borderRadius: '50%',
        background: dotColor,
        flexShrink: 0,
        boxShadow: relevance !== 'distant' ? `0 0 6px ${modeColor.glow}` : 'none',
        transition: 'background 0.2s',
      }} />


      <span style={{
        fontFamily: 'var(--font-geist-sans), ui-sans-serif, sans-serif',
        fontSize: s.fontSize,
        fontWeight: relevance === 'focus' ? 500 : 400,
        color: `rgba(var(--node-text-rgb), ${s.labelOpacity})`,
        letterSpacing: '0.01em',
        lineHeight: 1.2,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        maxWidth: 150,
        transition: 'color 0.2s',
      }}>
        {data.label}
      </span>


      {isExpanded && !selected && (
        <div style={{
          position: 'absolute',
          bottom: 2,
          right: 4,
          width: 3,
          height: 3,
          borderRadius: '50%',
          background: modeColor.primary,
          opacity: 0.5,
        }} />
      )}
    </div>
  );
};

export default memo(ConceptNode);
