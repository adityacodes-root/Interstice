'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  useReactFlow,
  Controls,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useIntersticeStore } from '@/store/useIntersticeStore';
import ConceptNode from '../graph/ConceptNode';
import ConnectionEdge from '../graph/ConnectionEdge';
import NeighborhoodLabelNode from '../graph/NeighborhoodLabelNode';

const nodeTypes = { concept: ConceptNode, neighborhoodLabel: NeighborhoodLabelNode };
const edgeTypes = { glowing: ConnectionEdge };


function DetailPanel() {
  const {
    selectedNodeId,
    setSelectedNodeId,
    conceptDetails,
    nodes,
    edges,
    isLoading,
    explorationMode,
    breadcrumbs,
    collapseBranch,
    restoreBranch,
  } = useIntersticeStore();

  const activeDetails = selectedNodeId ? conceptDetails[selectedNodeId] : null;

  const handleQuestionClick = async (question: string) => {
    if (!selectedNodeId) return;
    const currentNode = nodes.find((n) => n.id === selectedNodeId);
    if (!currentNode) return;

    let conceptName = question.replace(/[?.]/g, '').trim();
    if (conceptName.length > 45) conceptName = conceptName.substring(0, 45) + '…';

    useIntersticeStore.setState({ isLoading: true });

    try {
      const existingNames = nodes.map((n) => n.data.label);
      const childId = `node_${Date.now()}_q`;

      const response = await fetch('/api/expand', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept: question,
          mode: explorationMode,
          existing: existingNames,
          breadcrumbs: breadcrumbs,
          depth: breadcrumbs.length + 1,
        }),
      });

      if (!response.ok) throw new Error('Failed to expand question');
      const data = await response.json();

      const resolvedTitle = data.title || conceptName;

      // If a node with the same name exists, we select it or link to it instead of duplicating.
      const existingNode = nodes.find(
        (n) => n.data.label.toLowerCase() === resolvedTitle.toLowerCase()
      );

      if (existingNode) {
        if (existingNode.id === selectedNodeId) {
          const updatedDetails = {
            ...conceptDetails,
            [selectedNodeId]: {
              ...conceptDetails[selectedNodeId],
              explanation: data.explanation || conceptDetails[selectedNodeId].explanation,
              questions: data.questions || [],
              image: data.image || conceptDetails[selectedNodeId].image || '',
              url: data.url || conceptDetails[selectedNodeId].url || '',
              categories: data.categories || conceptDetails[selectedNodeId].categories || [],
              sources: data.sources || conceptDetails[selectedNodeId].sources || [],
            }
          };
          useIntersticeStore.setState({
            conceptDetails: updatedDetails,
            isLoading: false
          });
          return;
        }

        // If the node already exists elsewhere, draw the connection to it.
        const edgeExists = edges.some(
          (e) => (e.source === selectedNodeId && e.target === existingNode.id) ||
            (e.source === existingNode.id && e.target === selectedNodeId)
        );

        const newEdges = edgeExists ? edges : [...edges, {
          id: `edge_${selectedNodeId}_${existingNode.id}`,
          source: selectedNodeId,
          target: existingNode.id,
          type: 'glowing',
        }];

        useIntersticeStore.setState({
          edges: newEdges,
          selectedNodeId: existingNode.id,
          isLoading: false
        });
        return;
      }

      // Otherwise, add it as a new node.
      const px = currentNode.position.x;
      const py = currentNode.position.y;
      const angle = Math.random() * 2 * Math.PI;
      const radius = 240;

      const newNodes = [...nodes, {
        id: childId,
        position: {
          x: Math.round(px + radius * Math.cos(angle)),
          y: Math.round(py + radius * Math.sin(angle)),
        },
        data: {
          label: resolvedTitle,
          isExpanded: true,
          isContrarian: false
        },
        type: 'concept',
      }];

      const newEdges = [...edges, {
        id: `edge_${selectedNodeId}_${childId}`,
        source: selectedNodeId,
        target: childId,
        type: 'glowing',
      }];

      const updatedDetails = {
        ...conceptDetails,
        [childId]: {
          name: resolvedTitle,
          explanation: data.explanation || `An exploration of: ${question}`,
          reason: `From question: "${question}"`,
          questions: data.questions || [],
          image: data.image || '',
          url: data.url || '',
          categories: data.categories || [],
          sources: data.sources || [],
          isContrarian: false,
        },
      };

      const finalNodes = newNodes.map((n) =>
        n.id === selectedNodeId ? { ...n, data: { ...n.data, isExpanded: true } } : n
      );

      const expandedSet = new Set(useIntersticeStore.getState().expandedNodeIds);
      expandedSet.add(selectedNodeId);
      expandedSet.add(childId);

      useIntersticeStore.setState({
        nodes: finalNodes,
        edges: newEdges,
        conceptDetails: updatedDetails,
        selectedNodeId: childId,
        expandedNodeIds: expandedSet,
        isLoading: false,
      });
    } catch (err) {
      console.error(err);
      useIntersticeStore.setState({ isLoading: false });
    }
  };

  if (!selectedNodeId || !activeDetails) return null;

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  if (selectedNode?.data?.isNeighborhoodLabel) return null;

  const hasConnection = activeDetails.reason && activeDetails.reason !== 'Initial starting topic.';

  return (
    <aside
      className="w-[320px] flex-shrink-0 border-l border-[var(--border)] flex flex-col overflow-hidden bg-[var(--bg-sidebar)] z-10"
      style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >

      {activeDetails.image && (
        <div className="w-full h-[150px] relative overflow-hidden bg-[var(--bg-panel)] border-b border-[var(--border)] shrink-0">
          <img
            src={activeDetails.image}
            alt={activeDetails.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}


      <div className="px-6 pt-6 pb-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">

          {activeDetails.neighborhoodLabel && (
            <span className="text-[8px] tracking-[0.25em] uppercase font-mono text-[var(--muted)] block opacity-75">
              {activeDetails.neighborhoodLabel}
            </span>
          )}
          <h2
            className="text-lg font-medium text-[var(--text)] leading-snug font-serif truncate"
            style={{ fontFamily: 'var(--font-dm-serif)' }}
          >
            {activeDetails.name}
          </h2>
          {activeDetails.url && (
            <a
              href={activeDetails.url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[var(--muted)] hover:text-[var(--text)] underline tracking-wide"
            >
              Wikipedia Article ↗
            </a>
          )}
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer text-lg leading-none mt-0.5 shrink-0"
        >
          &times;
        </button>
      </div>


      <div className="flex-1 overflow-y-auto">


        <div className="px-6 py-5 border-b border-[var(--border)]">
          <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] block mb-3 font-medium">
            Overview
          </span>
          {activeDetails.explanation ? (
            <p className="text-[13px] text-[var(--text)] leading-relaxed font-light">
              {activeDetails.explanation}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {[100, 85, 70].map((w) => (
                <div
                  key={w}
                  className="h-3 bg-[var(--border)] rounded animate-pulse"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          )}
        </div>


        {activeDetails.neighborhoods && activeDetails.neighborhoods.length > 0 && (
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] block mb-2.5 font-medium">
              Neighborhoods
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeDetails.neighborhoods.map((n) => (
                <span
                  key={n}
                  className="px-2 py-0.5 bg-[var(--bg-panel)] text-[var(--text)] text-[9px] rounded-sm border border-[var(--border)] select-none font-mono tracking-wide"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}


        {activeDetails.historicalContext && (
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] block mb-2 font-medium">
              Historical Context
            </span>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed italic">
              {activeDetails.historicalContext}
            </p>
          </div>
        )}


        {breadcrumbs.length > 1 && (
          <div className="px-6 py-3 border-b border-[var(--border)]">
            <details className="text-[11px] text-[var(--muted)] border border-[var(--border)] rounded p-2 bg-[var(--bg)] cursor-pointer transition-colors hover:border-[var(--muted)] group">
              {/* Why Am I Seeing This? */}
              <summary className="font-medium hover:text-[var(--text)] select-none outline-none flex items-center justify-between">
                <span>Why am I seeing this?</span>
                <span className="text-[9px] text-[var(--muted)] group-hover:text-[var(--text)] transition-colors">▼</span>
              </summary>
              <div className="mt-1.5 leading-relaxed italic text-[var(--muted)] opacity-85">
                {activeDetails.whyAmISeeingThis ? (
                  activeDetails.whyAmISeeingThis
                ) : (
                  <div className="flex flex-col gap-1 pt-0.5">
                    <div className="h-2 bg-[var(--border)] rounded w-full animate-pulse" />
                    <div className="h-2 bg-[var(--border)] rounded w-[85%] animate-pulse" />
                  </div>
                )}
              </div>
            </details>
          </div>
        )}


        {hasConnection && activeDetails.relationship ? (
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] font-medium">
                Connection
              </span>
            </div>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[8px] uppercase tracking-widest bg-[var(--bg-sidebar)] text-[var(--text)] border border-[var(--border)] px-2 py-0.5 font-mono font-medium rounded-sm">
                {(activeDetails.relationship.type || activeDetails.relationshipType || '').replace(/_/g, ' ')}
              </span>
              {activeDetails.supportingSource && (
                <span className="text-[9px] text-[var(--muted)] font-mono">
                  via {activeDetails.supportingSource}
                </span>
              )}
            </div>

            <p className="text-[12px] text-[var(--muted)] leading-relaxed mb-3">
              {activeDetails.relationship.reason || activeDetails.reason}
            </p>

            {activeDetails.relationship.evidence && (
              <blockquote className="border-l-2 border-[var(--border)] pl-3">
                <p className="text-[10px] text-[var(--muted)] leading-relaxed italic">
                  {activeDetails.relationship.evidence}
                </p>
              </blockquote>
            )}

            {activeDetails.modeContextJustification && (
              <p className="text-[9px] text-[var(--muted)] leading-relaxed mt-2.5 pt-2.5 border-t border-[var(--border)]">
                {activeDetails.modeContextJustification}
              </p>
            )}
          </div>
        ) : hasConnection ? (

          <div className="px-6 py-4 border-b border-[var(--border)]">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] block mb-2 font-medium">
              Why This Exists
            </span>
            <p className="text-[12px] text-[var(--muted)] leading-relaxed mb-2">
              {activeDetails.reason}
            </p>
            {activeDetails.relationshipType && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[9px] uppercase tracking-wider bg-[var(--bg-sidebar)] text-[var(--text)] border border-[var(--border)] px-1.5 py-0.5 rounded font-mono font-medium">
                  {activeDetails.relationshipType.replace(/_/g, ' ')}
                </span>
                {activeDetails.supportingSource && (
                  <span className="text-[9px] text-[var(--muted)] font-mono">
                    via {activeDetails.supportingSource}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : null}


        {activeDetails.categories && activeDetails.categories.length > 0 && (
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] block mb-3 font-medium">
              Categories
            </span>
            <div className="flex flex-wrap gap-2">
              {activeDetails.categories.slice(0, 5).map((cat) => (
                <span
                  key={cat}
                  className="px-2 py-0.5 bg-[var(--bg-sidebar)] text-[var(--muted)] text-[10px] rounded border border-[var(--border)] select-none"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}


        {activeDetails.sources && activeDetails.sources.length > 0 && (
          <div className="px-6 py-5 border-b border-[var(--border)]">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] block mb-3 font-medium">
              Sources
            </span>
            <ul className="flex flex-col gap-2">
              {activeDetails.sources.slice(0, 5).map((src, idx) => {
                let domain = src;
                try {
                  domain = new URL(src).hostname;
                } catch { }
                return (
                  <li key={idx} className="text-[11px] text-[var(--muted)] hover:text-[var(--text)] truncate list-disc list-inside">
                    <a href={src} target="_blank" rel="noreferrer" className="hover:underline">
                      {domain}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}


        {activeDetails.questions && activeDetails.questions.length > 0 && (
          <div className="px-6 py-5">
            <span className="text-[10px] tracking-[0.15em] uppercase text-[var(--muted)] block mb-3 font-medium">
              Explore Further
            </span>
            <div className="flex flex-col gap-0">
              {activeDetails.questions.map((q: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleQuestionClick(q)}
                  disabled={isLoading}
                  className="text-left text-[12px] text-[var(--muted)] hover:text-[var(--text)] py-2 border-b border-[var(--border)] last:border-b-0 transition-colors cursor-pointer disabled:opacity-40 flex items-start gap-2 group"
                >
                  <span className="text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0 mt-px">→</span>
                  <span className="leading-snug">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>


      <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-sidebar)]">
        <span className="text-[10px] text-[var(--muted)] uppercase tracking-widest font-medium">
          Depth {breadcrumbs.length}
        </span>
        {selectedNodeId !== 'root' && (
          <div className="flex items-center gap-3">
            {/* Show option to restore if children are collapsed. */}
            {nodes.find(n => n.id === selectedNodeId)?.data?.isExpanded === false &&
              edges.some(e => e.source === selectedNodeId && (e as any).hidden) ? (
              <button
                onClick={() => restoreBranch(selectedNodeId)}
                disabled={isLoading}
                className="text-[11px] text-[#38BDF8] hover:text-white transition-colors cursor-pointer disabled:opacity-40 font-medium"
              >
                Restore Branch
              </button>
            ) : nodes.find(n => n.id === selectedNodeId)?.data?.isExpanded ? (
              <button
                onClick={() => { collapseBranch(selectedNodeId); }}
                disabled={isLoading}
                className="text-[11px] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
              >
                Collapse
              </button>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}


function GraphCanvas() {
  const {
    nodes, edges,
    selectedNodeId, selectNode,
    expandNode, isLoading,
    loadingType,
    onNodesChange,
  } = useIntersticeStore();

  const { fitView, setCenter } = useReactFlow();

  // Track node count to trigger zoom-to-fit on expansions.
  const prevNodeCount = React.useRef(nodes.length);

  // Fit graph to screen when layout expands.
  useEffect(() => {
    const prev = prevNodeCount.current;
    prevNodeCount.current = nodes.length;

    if (nodes.length > prev && nodes.length > 1) {
      // Small timeout lets layout render before fitting the view.
      const t = setTimeout(() => fitView({ padding: 0.18, duration: 700, includeHiddenNodes: false }), 120);
      return () => clearTimeout(t);
    }
  }, [nodes.length, fitView]);

  // Soft center camera on the newly selected node.
  useEffect(() => {
    if (selectedNodeId) {
      const n = nodes.find((nd) => nd.id === selectedNodeId);
      if (n) {
        setCenter(n.position.x, n.position.y, { zoom: Math.min(1.0, 1.0), duration: 600 });
      }
    }
  }, [selectedNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeClick = useCallback(async (_: React.MouseEvent, node: Node) => {
    if (node.data.isNeighborhoodLabel) return;
    await selectNode(node.id);
  }, [selectNode]);

  const handleNodeDoubleClick = useCallback(async (_: React.MouseEvent, node: Node) => {
    if (node.data.isNeighborhoodLabel) return;
    if (!node.data.isExpanded) {
      await expandNode(node.id);
    }
  }, [expandNode]);

  return (
    <div className="flex-1 flex overflow-hidden h-full relative">


      <div className="flex-1 h-full relative bg-[var(--bg)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.04}
          maxZoom={2.5}
          panOnScroll
          zoomOnScroll
          nodeOrigin={[0.5, 0.5]}
          deleteKeyCode={null}
          defaultEdgeOptions={{ type: 'glowing', markerEnd: undefined, markerStart: undefined }}
          proOptions={{ hideAttribution: false }}
        >
          <Controls
            showInteractive={false}
            position="bottom-left"
            className="m-4"
          />


          <svg style={{ position: 'absolute', width: 0, height: 0 }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--grid-line)" strokeWidth="0.5" />
              </pattern>
            </defs>
          </svg>
        </ReactFlow>


        {nodes.some(n => n.id === selectedNodeId && !n.data?.isExpanded) && !isLoading && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-3 py-1.5 z-20 select-none pointer-events-none"
            style={{ borderRadius: 2 }}
          >
            <span className="text-[10px] text-[var(--muted)] tracking-[0.08em]">
              Double click to expand
            </span>
          </div>
        )}


        {isLoading && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] px-5 py-2.5 z-20 select-none"
            style={{ borderRadius: 2, boxShadow: 'var(--shadow-node)' }}>
            <span className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1 h-1 rounded-full bg-[var(--text)]"
                  style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`, display: 'inline-block' }}
                />
              ))}
            </span>
            <span className="text-[11px] text-[var(--muted)] tracking-[0.1em] uppercase">
              {loadingType === 'preview' ? 'Loading overview…' : 'Expanding…'}
            </span>
          </div>
        )}
      </div>


      <DetailPanel />
    </div>
  );
}


interface JourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  journey: string[];
}

function JourneySummaryModal({ isOpen, onClose, journey }: JourneyModalProps) {
  const [narrative, setNarrative] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && journey.length > 0) {
      setLoading(true);
      setNarrative('');
      fetch('/api/explain-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journey }),
      })
        .then(res => res.json())
        .then(data => {
          setNarrative(data.narrative || 'Could not explain your journey.');
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setNarrative('Failed to fetch narrative summary.');
          setLoading(false);
        });
    }
  }, [isOpen, journey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">

      <div className="absolute inset-0 bg-black/80" onClick={onClose} />


      <div className="relative bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-xl p-8 z-10 flex flex-col gap-6">

  
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)] font-semibold">
            Your Exploration Journey
          </span>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer text-lg leading-none"
          >
            &times;
          </button>
        </div>


        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[12px] text-[var(--muted)] whitespace-nowrap">
          {journey.map((step, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-[var(--muted)]">&rarr;</span>}
              <span className={idx === journey.length - 1 ? 'text-[var(--text)] font-medium' : ''}>
                {step}
              </span>
            </React.Fragment>
          ))}
        </div>


        <div className="py-4">
          {loading ? (
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-[var(--bg-panel)] rounded w-full animate-pulse" />
              <div className="h-4 bg-[var(--bg-panel)] rounded w-[95%] animate-pulse" />
              <div className="h-4 bg-[var(--bg-panel)] rounded w-[80%] animate-pulse" />
            </div>
          ) : (
            <p
              className="text-[18px] text-[var(--text)] leading-relaxed font-serif tracking-tight"
              style={{ fontFamily: 'var(--font-dm-serif)' }}
            >
              {narrative}
            </p>
          )}
        </div>


        <div className="flex justify-end border-t border-[var(--border)] pt-4">
          <button
            onClick={onClose}
            className="text-[12px] tracking-[0.1em] uppercase text-[var(--text)] border border-[var(--border)] px-5 py-2.5 hover:border-[var(--text)] hover:bg-[var(--bg-panel)] transition-all cursor-pointer font-medium"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
}


function GraphToolbar() {
  const { nodes, edges, breadcrumbs, journey, setActivePage, setSelectedNodeId, hiddenNodeIds, restoreBranch, expandAllNodes, explorationMode } = useIntersticeStore();
  const { fitView } = useReactFlow();
  const [isJourneyOpen, setIsJourneyOpen] = useState(false);

  // Identify parent nodes with collapsed branches.
  const collapsedParents = nodes.filter(n => {
    if (n.data?.isNeighborhoodLabel || n.hidden) return false;
    return edges.some(e => e.source === n.id && (e as any).hidden);
  });


  const handleCrumbClick = (label: string) => {
    const target = nodes.find(n => n.data.label === label);
    if (target) setSelectedNodeId(target.id);
  };


  const modeColors: Record<string, string> = {
    default: '#60A5FA', technical: '#22D3EE', historical: '#FCD34D',
    business: '#34D399', philosophical: '#A78BFA', contrarian: '#FB923C',
  };
  const modeColor = modeColors[explorationMode] || '#60A5FA';

  return (
    <>
      <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-sidebar)]">

        <div className="h-9 flex items-center px-4 gap-4">

          <div className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA] overflow-x-auto whitespace-nowrap flex-1 min-w-0">
            <button
              onClick={() => setActivePage('landing')}
              className="hover:text-white transition-colors cursor-pointer shrink-0"
            >
              ←
            </button>
            <span className="text-[#3F3F46] mx-1 shrink-0">/</span>
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-[#3F3F46] shrink-0">/</span>}
                  {isLast ? (
                    <span className="text-white font-medium">{crumb}</span>
                  ) : (
                    <button
                      onClick={() => handleCrumbClick(crumb)}
                      className="text-[#A1A1AA] hover:text-white hover:underline transition-colors cursor-pointer"
                    >
                      {crumb}
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>


          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[10px] text-[#3F3F46]">
              {nodes.filter(n => !n.data?.isNeighborhoodLabel && !n.hidden).length} nodes
              {hiddenNodeIds.size > 0 && (
                <span className="text-[#52525B] ml-1">· {hiddenNodeIds.size} hidden</span>
              )}
            </span>


            <span
              className="text-[9px] uppercase tracking-[0.15em] font-mono px-2 py-0.5 rounded-sm border"
              style={{ color: modeColor, borderColor: `${modeColor}40`, background: `${modeColor}12` }}
            >
              {explorationMode}
            </span>

            {journey.length > 1 && (
              <button
                onClick={() => setIsJourneyOpen(true)}
                className="text-[11px] hover:text-white transition-colors cursor-pointer font-medium"
                style={{ color: modeColor }}
              >
                Explain Journey
              </button>
            )}

            {hiddenNodeIds.size > 0 && (
              <button
                onClick={() => expandAllNodes()}
                className="text-[11px] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
              >
                Show All
              </button>
            )}
          </div>
        </div>


        {collapsedParents.length > 0 && (
          <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto">
            <span className="text-[9px] text-[#3F3F46] uppercase tracking-[0.15em] shrink-0">
              Collapsed:
            </span>
            {collapsedParents.map(n => (
              <button
                key={n.id}
                onClick={() => restoreBranch(n.id)}
                className="flex items-center gap-1.5 text-[10px] text-[#71717A] hover:text-white border border-[#27272A] hover:border-[#3F3F46] px-2 py-0.5 transition-colors cursor-pointer shrink-0"
                style={{ borderRadius: 2 }}
                title={`Restore branch from ${n.data.label}`}
              >
                <span style={{ color: modeColor, fontSize: 8 }}>↑</span>
                {n.data.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <JourneySummaryModal
        isOpen={isJourneyOpen}
        onClose={() => setIsJourneyOpen(false)}
        journey={journey}
      />
    </>
  );
}


export default function ExplorePage() {
  return (
    <ReactFlowProvider>
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <GraphToolbar />
        <GraphCanvas />
      </div>
    </ReactFlowProvider>
  );
}
