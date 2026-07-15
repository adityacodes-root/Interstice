'use client';

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

interface NeighborhoodLabelNodeProps {
  data: {
    label: string;
    isNeighborhoodLabel: true;
    neighborhoodTheme?: string;
    parentNodeId?: string;
  };
}

// Cartographic labels anchoring each cluster. Keeps things looking clean.
const NeighborhoodLabelNode = ({ data }: NeighborhoodLabelNodeProps) => {
  return (
    <div
      style={{
        position: 'relative',
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        background: 'rgba(var(--node-bg-rgb), 0.75)',
        backdropFilter: 'blur(3px)',
        border: '1px dashed rgba(var(--node-text-rgb), 0.15)',
        borderRadius: '3px',
      }}
    >
      {/* Zero-size handles so ReactFlow routing doesn't complain */}
      <Handle type="target" position={Position.Left}
        style={{ opacity: 0, width: 0, height: 0, border: 'none', background: 'none', pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Right}
        style={{ opacity: 0, width: 0, height: 0, border: 'none', background: 'none', pointerEvents: 'none' }} />


      <span
        style={{
          fontFamily: 'var(--font-geist-sans), ui-sans-serif, sans-serif',
          fontSize: '8.5px',
          fontWeight: 600,
          letterSpacing: '0.24em',
          color: 'rgba(var(--node-text-rgb), 0.75)',
          textTransform: 'uppercase',
          lineHeight: 1.2,
          whiteSpace: 'normal',
          textAlign: 'center',
          maxWidth: '140px',
          display: 'block',
        }}
      >
        {data.label}
      </span>


      <div style={{
        width: '100%',
        height: '1px',
        background: 'rgba(var(--node-text-rgb), 0.2)',
      }} />


      {data.neighborhoodTheme && (
        <span
          style={{
            fontFamily: 'var(--font-geist-sans), ui-sans-serif, sans-serif',
            fontSize: '7.5px',
            fontWeight: 400,
            letterSpacing: '0.04em',
            color: 'rgba(var(--node-text-rgb), 0.45)',
            textAlign: 'center',
            maxWidth: '130px',
            lineHeight: 1.3,
            whiteSpace: 'normal',
          }}
        >
          {data.neighborhoodTheme}
        </span>
      )}
    </div>
  );
};

export default memo(NeighborhoodLabelNode);
