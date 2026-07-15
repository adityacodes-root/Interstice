import { create } from 'zustand';
import { Node, Edge, NodeChange, applyNodeChanges } from 'reactflow';

// Layout rules: prevent overlapping nodes, scale spacing based on group size/depth, and split categories into separate angular sectors.

interface NeighborhoodGroup {
  id: string;
  label: string;
  nodeIds: string[];
}

// Approximate node size for bounding boxes
const NODE_W = 180;
const NODE_H = 40;
const MIN_SEPARATION = 24; // buffer space between nodes

// Collision check between two node bounding boxes.
function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
  padding = MIN_SEPARATION,
): boolean {
  return (
    Math.abs(ax - bx) < (aw + bw) / 2 + padding &&
    Math.abs(ay - by) < (ah + bh) / 2 + padding
  );
}

// Find a spot around the anchor node that has no collisions. Spirals outwards if the space is crowded.
function findFreePosition(
  anchorX: number,
  anchorY: number,
  baseRadius: number,
  baseAngle: number,
  placed: Array<{ x: number; y: number }>,
  maxAttempts = 120,
): { x: number; y: number } {
  let radius = baseRadius;
  const radiusStep = 40;
  const angleStep = (2 * Math.PI) / 12;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const angle = baseAngle + (attempt % 12) * angleStep;
    const r = radius + Math.floor(attempt / 12) * radiusStep;
    const cx = Math.round(anchorX + r * Math.cos(angle));
    const cy = Math.round(anchorY + r * Math.sin(angle));

    const collides = placed.some(p =>
      rectsOverlap(cx, cy, NODE_W, NODE_H, p.x, p.y, NODE_W, NODE_H),
    );

    if (!collides) return { x: cx, y: cy };
  }

  // Give up and add some random offset if we couldn't find a free spot.
  const jitter = maxAttempts * 8;
  return {
    x: Math.round(anchorX + baseRadius * Math.cos(baseAngle) + (Math.random() - 0.5) * jitter),
    y: Math.round(anchorY + baseRadius * Math.sin(baseAngle) + (Math.random() - 0.5) * jitter),
  };
}

function applyNeighborhoodLayout(
  nodes: Node[],
  _edges: Edge[],
  groups: NeighborhoodGroup[],
  centerX = 0,
  centerY = 0,
  isJourney = false,
): Node[] {
  const updated = nodes.map(n => ({ ...n, position: { ...n.position } }));

  // Journey timeline mode: lay nodes out horizontally.
  if (isJourney) {
    const journeyNodes = updated.filter(n => !n.data.isNeighborhoodLabel && n.id !== 'root');
    const nodeCount = journeyNodes.length;
    const SPACING_X = 260;
    const WAVE_Y = 55;
    const totalWidth = (nodeCount - 1) * SPACING_X;

    journeyNodes.forEach((n, i) => {
      n.position.x = Math.round(centerX - totalWidth / 2 + i * SPACING_X);
      n.position.y = Math.round(centerY + Math.sin((i / Math.max(nodeCount - 1, 1)) * Math.PI) * WAVE_Y);
    });
    return updated;
  }

  // Main layout: arrange sub-concepts in radial clusters.
  const numGroups = groups.filter(g => g.nodeIds.length > 0).length;
  if (numGroups === 0) return updated;

  const totalNodes = groups.reduce((acc, g) => acc + g.nodeIds.length, 0);

  const baseOrbitRadius = Math.max(280, 180 + totalNodes * 20);
  const clusterBaseRadius = Math.max(90, 60 + Math.ceil(totalNodes / numGroups) * 18);

  const activeGroups = groups.filter(g => g.nodeIds.length > 0);
  const isRootLayout = centerX === 0 && centerY === 0;

  // Find which nodes we're positioning in this pass.
  const positionedIds = new Set<string>();
  activeGroups.forEach(group => {
    group.nodeIds.forEach(id => positionedIds.add(id));
    const labelNode = updated.find(n => n.id.endsWith(`_${group.id}`) && n.data.isNeighborhoodLabel);
    if (labelNode) positionedIds.add(labelNode.id);
  });

  // Map positions of existing nodes so we can avoid placing new ones on top of them.
  const placed: Array<{ x: number; y: number }> = updated
    .filter(n => !positionedIds.has(n.id))
    .map(n => ({ x: n.position.x, y: n.position.y }));

  // Don't land directly on the parent's coordinates.
  placed.push({ x: centerX, y: centerY });

  // Fan nodes out in the direction they are branching (away from parent).
  const parentAngle = isRootLayout ? -Math.PI / 2 : Math.atan2(centerY, centerX);
  const totalFanSpread = isRootLayout ? 2 * Math.PI : Math.PI * 0.75;
  const sectorSize = isRootLayout
    ? (2 * Math.PI) / activeGroups.length
    : totalFanSpread / Math.max(activeGroups.length - 1, 1);

  activeGroups.forEach((group, gi) => {
    let sectorMid: number;
    if (isRootLayout) {
      sectorMid = parentAngle + gi * sectorSize;
    } else {
      if (activeGroups.length === 1) {
        sectorMid = parentAngle;
      } else {
        sectorMid = (parentAngle - totalFanSpread / 2) + gi * sectorSize;
      }
    }

    const labelPos = findFreePosition(centerX, centerY, baseOrbitRadius, sectorMid, placed);
    const labelNode = updated.find(n => n.id.endsWith(`_${group.id}`) && n.data.isNeighborhoodLabel);
    if (labelNode) {
      labelNode.position.x = labelPos.x;
      labelNode.position.y = labelPos.y;
    }
    placed.push(labelPos);

    const count = group.nodeIds.length;
    const fanSpread = Math.min(sectorSize * 0.65, Math.PI * 0.85);

    group.nodeIds.forEach((nid, ci) => {
      const conceptNode = updated.find(n => n.id === nid);
      if (!conceptNode) return;

      let conceptAngle: number;
      if (count === 1) {
        conceptAngle = sectorMid;
      } else {
        conceptAngle = (sectorMid - fanSpread / 2) + (ci * fanSpread) / (count - 1);
      }

      const pos = findFreePosition(labelPos.x, labelPos.y, clusterBaseRadius, conceptAngle, placed);
      conceptNode.position.x = pos.x;
      conceptNode.position.y = pos.y;
      placed.push(pos);
    });
  });

  return updated;
}

function applyLinearLayout(nodes: Node[]): Node[] {
  return nodes;
}

export type ExplorationMode =
  | 'default'
  | 'technical'
  | 'historical'
  | 'business'
  | 'philosophical'
  | 'contrarian';

export interface ConceptDetail {
  name: string;
  explanation: string;
  reason: string;
  questions: string[];
  image?: string;
  url?: string;
  categories?: string[];
  sources?: string[];
  whyAmISeeingThis?: string;
  isContrarian?: boolean;
  relationshipType?: string;
  supportingSource?: string;
  // Neighborhood atlas fields:
  neighborhood?: string;
  neighborhoodLabel?: string;
  neighborhoodTheme?: string;
  neighborhoods?: string[];
  historicalContext?: string;
  scores?: Record<string, number>;
  relationship?: {
    type: string;
    confidence: number;
    evidence: string;
    reason: string;
  };
  modeContextJustification?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  date: string;
  nodeCount: number;
  depth: number;
  favorite: boolean;
  mode: ExplorationMode;
  nodes: Node[];
  edges: Edge[];
  breadcrumbs: string[];
  conceptDetails: Record<string, ConceptDetail>;
  journey?: string[];
}

interface GraphSnapshot {
  nodes: Node[];
  edges: Edge[];
  conceptDetails: Record<string, ConceptDetail>;
  selectedNodeId: string | null;
  breadcrumbs: string[];
  expandedNodeIds: Set<string>;
  hiddenNodeIds: Set<string>;
  journey: string[];
}

interface IntersticeState {
  activePage: 'landing' | 'explore' | 'connection-finder' | 'saved';
  explorationMode: ExplorationMode;
  isLoading: boolean;
  loadingType: 'expand' | 'preview' | null;

  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  conceptDetails: Record<string, ConceptDetail>;
  breadcrumbs: string[];
  expandedNodeIds: Set<string>;
  hiddenNodeIds: Set<string>;
  journey: string[];
  connectionBridgeResult: {
    conceptA: string;
    conceptB: string;
    path: any[];
    overallExplanation: string;
  } | null;

  undoStack: GraphSnapshot[];
  redoStack: GraphSnapshot[];

  history: HistoryItem[];
  prefetchedData: Record<string, any>;

  notification: { message: string; mode: string } | null;
  setNotification: (notification: { message: string; mode: string } | null) => void;

  setActivePage: (page: 'landing' | 'explore' | 'connection-finder' | 'saved') => void;
  setExplorationMode: (mode: ExplorationMode) => void;
  setIsLoading: (loading: boolean) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setBreadcrumbs: (breadcrumbs: string[]) => void;
  selectNode: (nodeId: string) => Promise<void>;

  undo: () => void;
  redo: () => void;

  initGraph: (topic: string) => Promise<boolean>;
  expandNode: (nodeId: string) => Promise<boolean>;
  findConnection: (conceptA: string, conceptB: string) => Promise<boolean>;
  collapseBranch: (nodeId: string) => void;
  restoreBranch: (nodeId: string) => void;
  expandAllNodes: () => void;
  resetGraph: () => void;
  loadExploration: (item: HistoryItem) => void;
  toggleFavorite: (id: string) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
  onNodesChange: (changes: NodeChange[]) => void;
}

const getStoredHistory = (): HistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('interstice_history');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load history', e);
  }
  return [];
};

const saveHistoryToStorage = (history: HistoryItem[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('interstice_history', JSON.stringify(history));
  }
};

let activeAbortController: AbortController | null = null;
let activeExpandingNodeId: string | null = null;

export const useIntersticeStore = create<IntersticeState>((set, get) => {
  const pushUndo = () => {
    const { nodes, edges, conceptDetails, selectedNodeId, breadcrumbs, expandedNodeIds, hiddenNodeIds, journey, undoStack } = get();
    const snapshot: GraphSnapshot = {
      nodes: nodes.map((n: any) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
      edges: edges.map((e: any) => ({ ...e, data: { ...e.data } })),
      conceptDetails: { ...conceptDetails },
      selectedNodeId,
      breadcrumbs: [...breadcrumbs],
      expandedNodeIds: new Set(expandedNodeIds),
      hiddenNodeIds: new Set(hiddenNodeIds),
      journey: [...journey],
    };
    set({
      undoStack: [...undoStack, snapshot],
      redoStack: [],
    });
  };

  return {
    activePage: 'landing',
    explorationMode: 'default',
    isLoading: false,
    loadingType: null,

    nodes: [],
    edges: [],
    selectedNodeId: null,
    conceptDetails: {},
    breadcrumbs: [],
    expandedNodeIds: new Set<string>(),
    hiddenNodeIds: new Set<string>(),
    journey: [],
    connectionBridgeResult: null,
    prefetchedData: {},
    notification: null,

    undoStack: [],
    redoStack: [],

    history: getStoredHistory(),

    onNodesChange: (changes) => {
      set({
        nodes: applyNodeChanges(changes, get().nodes),
      });
    },

    setActivePage: (activePage) => {
      set({ activePage });
      if (activePage !== 'explore') {
        set({ notification: null });
      }
    },
    setNotification: (notification) => set({ notification }),

    setExplorationMode: (explorationMode) => {
      set({ explorationMode });
      const { nodes, activePage, setNotification } = get();
      if (nodes.length > 0 && activePage === 'explore') {
        const modeLabels: Record<string, string> = {
          default: 'Default',
          technical: 'Technical',
          historical: 'Historical',
          business: 'Business',
          philosophical: 'Philosophical',
          contrarian: 'Contrarian',
        };
        const label = modeLabels[explorationMode] || explorationMode;
        setNotification({
          message: `Subsequent branches will follow the **${label}** lens.`,
          mode: explorationMode,
        });
      }
      const { isLoading, expandNode } = get();
      if (isLoading && activeExpandingNodeId && activeAbortController) {
        activeAbortController.abort();
        const abortedNodeId = activeExpandingNodeId;
        activeAbortController = null;
        activeExpandingNodeId = null;
        setTimeout(() => expandNode(abortedNodeId), 50);
      }
    },

    setIsLoading: (isLoading) => set({ isLoading }),

    setSelectedNodeId: (selectedNodeId) => {
      if (!selectedNodeId) {
        set({ selectedNodeId: null });
        return;
      }

      const { nodes, edges, conceptDetails, journey } = get();

      const path: string[] = [];
      const pathIds: string[] = [];
      let currentId: string | null = selectedNodeId;
      while (currentId) {
        const currentNode = nodes.find(n => n.id === currentId);
        if (!currentNode) break;
        path.unshift(currentNode.data.label);
        pathIds.unshift(currentId);
        const parentEdge = edges.find(e => e.target === currentId);
        currentId = parentEdge ? parentEdge.source : null;
      }

      const selectedNode = nodes.find(n => n.id === selectedNodeId);
      const label = selectedNode?.data.label || '';
      const updatedJourney = [...journey];
      if (label && updatedJourney[updatedJourney.length - 1] !== label) {
        updatedJourney.push(label);
      }

      const pathIdsSet = new Set(pathIds);

      const immediateNeighborIds = new Set<string>();
      edges.forEach(e => {
        if (e.source === selectedNodeId) immediateNeighborIds.add(e.target);
        if (e.target === selectedNodeId) immediateNeighborIds.add(e.source);
      });

      const secondaryNeighborIds = new Set<string>();
      edges.forEach(e => {
        if (immediateNeighborIds.has(e.source) && e.target !== selectedNodeId && !immediateNeighborIds.has(e.target)) {
          secondaryNeighborIds.add(e.target);
        }
        if (immediateNeighborIds.has(e.target) && e.source !== selectedNodeId && !immediateNeighborIds.has(e.source)) {
          secondaryNeighborIds.add(e.source);
        }
      });

      const updatedNodes = nodes.map(node => {
        let relevance: 'focus' | 'immediate' | 'secondary' | 'distant' = 'distant';
        if (node.id === selectedNodeId) relevance = 'focus';
        else if (immediateNeighborIds.has(node.id)) relevance = 'immediate';
        else if (secondaryNeighborIds.has(node.id)) relevance = 'secondary';
        else if (pathIdsSet.has(node.id)) relevance = 'secondary';
        return { ...node, data: { ...node.data, relevance } };
      });

      const updatedEdges = edges.map(edge => {
        let relevance: 'focus' | 'immediate' | 'secondary' | 'distant' = 'distant';
        const connectsToFocus = edge.source === selectedNodeId || edge.target === selectedNodeId;
        const connectsToImmediate = immediateNeighborIds.has(edge.source) || immediateNeighborIds.has(edge.target);
        const connectsToSecondary = secondaryNeighborIds.has(edge.source) || secondaryNeighborIds.has(edge.target);
        const inPath = pathIdsSet.has(edge.source) && pathIdsSet.has(edge.target);
        if (connectsToFocus) relevance = 'focus';
        else if (connectsToImmediate) relevance = 'immediate';
        else if (connectsToSecondary || inPath) relevance = 'secondary';
        return { ...edge, data: { ...edge.data, relevance } };
      });

      set({
        selectedNodeId,
        breadcrumbs: path,
        journey: updatedJourney,
        nodes: updatedNodes,
        edges: updatedEdges,
      });

      const activeDetails = conceptDetails[selectedNodeId];
      if (activeDetails && !activeDetails.whyAmISeeingThis && path.length > 1) {
        const { explorationMode } = get();
        fetch('/api/why-seeing-this', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, selectedNode: label, mode: explorationMode }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.explanation) {
              set(state => {
                const updatedDetails = { ...state.conceptDetails };
                if (updatedDetails[selectedNodeId]) {
                  updatedDetails[selectedNodeId] = {
                    ...updatedDetails[selectedNodeId],
                    whyAmISeeingThis: data.explanation,
                  };
                }
                return { conceptDetails: updatedDetails };
              });
            }
          })
          .catch(err => console.error('Failed to fetch explanation:', err));
      }
    },

    setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

    undo: () => {
      const { undoStack, redoStack, nodes, edges, conceptDetails, selectedNodeId, breadcrumbs, expandedNodeIds, hiddenNodeIds, journey } = get();
      if (undoStack.length === 0) return;
      const previous = undoStack[undoStack.length - 1];
      const currentSnapshot: GraphSnapshot = {
        nodes: nodes.map((n: any) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
        edges: edges.map((e: any) => ({ ...e, data: { ...e.data } })),
        conceptDetails: { ...conceptDetails },
        selectedNodeId,
        breadcrumbs: [...breadcrumbs],
        expandedNodeIds: new Set(expandedNodeIds),
        hiddenNodeIds: new Set(hiddenNodeIds),
        journey: [...journey],
      };
      set({
        nodes: previous.nodes,
        edges: previous.edges,
        conceptDetails: previous.conceptDetails,
        selectedNodeId: previous.selectedNodeId,
        breadcrumbs: previous.breadcrumbs,
        expandedNodeIds: previous.expandedNodeIds,
        hiddenNodeIds: previous.hiddenNodeIds,
        journey: previous.journey,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, currentSnapshot],
      });
    },

    redo: () => {
      const { undoStack, redoStack, nodes, edges, conceptDetails, selectedNodeId, breadcrumbs, expandedNodeIds, hiddenNodeIds, journey } = get();
      if (redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      const currentSnapshot: GraphSnapshot = {
        nodes: nodes.map((n: any) => ({ ...n, data: { ...n.data }, position: { ...n.position } })),
        edges: edges.map((e: any) => ({ ...e, data: { ...e.data } })),
        conceptDetails: { ...conceptDetails },
        selectedNodeId,
        breadcrumbs: [...breadcrumbs],
        expandedNodeIds: new Set(expandedNodeIds),
        hiddenNodeIds: new Set(hiddenNodeIds),
        journey: [...journey],
      };
      set({
        nodes: next.nodes,
        edges: next.edges,
        conceptDetails: next.conceptDetails,
        selectedNodeId: next.selectedNodeId,
        breadcrumbs: next.breadcrumbs,
        expandedNodeIds: next.expandedNodeIds,
        hiddenNodeIds: next.hiddenNodeIds,
        journey: next.journey,
        undoStack: [...undoStack, currentSnapshot],
        redoStack: redoStack.slice(0, -1),
      });
    },

    selectNode: async (nodeId) => {
      const { setSelectedNodeId, conceptDetails } = get();
      setSelectedNodeId(nodeId);

      const details = conceptDetails[nodeId];
      if (details && !details.explanation) {
        set({ isLoading: true, loadingType: 'preview' });
        try {
          const response = await fetch('/api/expand', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              concept: details.name,
              detailsOnly: true,
            }),
          });

          if (!response.ok) throw new Error('Failed to load node details');
          const data = await response.json();

          set((state) => {
            const updatedDetails = { ...state.conceptDetails };
            if (updatedDetails[nodeId]) {
              updatedDetails[nodeId] = {
                ...updatedDetails[nodeId],
                explanation: data.explanation || 'Overview could not be retrieved.',
                image: data.image || '',
                url: data.url || '',
                categories: data.categories || [],
                sources: data.sources || [],
              };
            }
            return { conceptDetails: updatedDetails, isLoading: false, loadingType: null };
          });
        } catch (err) {
          console.error(err);
          set({ isLoading: false, loadingType: null });
        }
      }
    },

    resetGraph: () => {
      set({
        nodes: [],
        edges: [],
        selectedNodeId: null,
        conceptDetails: {},
        breadcrumbs: [],
        expandedNodeIds: new Set(),
        hiddenNodeIds: new Set(),
        journey: [],
        connectionBridgeResult: null,
        undoStack: [],
        redoStack: [],
        notification: null,
        loadingType: null,
      });
    },

    initGraph: async (topic: string) => {
      if (!topic.trim()) return false;
      const { explorationMode, resetGraph } = get();

      resetGraph();
      set({ isLoading: true });

      try {
        const response = await fetch('/api/expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            concept: topic,
            mode: explorationMode,
            existing: [],
            breadcrumbs: [topic],
            depth: 1,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Failed to expand topic');
        }

        const data = await response.json();
        const resolvedTopic = data.title || topic;
        const isJourney = false;

        const rootId = 'root';
        const rootNode: Node = {
          id: rootId,
          position: { x: 0, y: 0 },
          data: {
            label: resolvedTopic,
            isRoot: true,
            isExpanded: true,
            mode: explorationMode,
            relevance: 'focus',
          },
          type: 'concept',
        };

        const rootDetails: ConceptDetail = {
          name: resolvedTopic,
          explanation: data.explanation || 'Overview could not be retrieved.',
          reason: 'Initial starting topic.',
          questions: data.questions || [],
          image: data.image || '',
          url: data.url || '',
          categories: data.categories || [],
          sources: data.sources || [],
          isContrarian: false,
          historicalContext: data.profile?.historicalContext || '',
        };

        const newNodes: Node[] = [rootNode];
        const newEdges: Edge[] = [];
        const newConceptDetails: Record<string, ConceptDetail> = { [rootId]: rootDetails };
        const neighborhoodGroups: NeighborhoodGroup[] = [];

        const neighborhoods: any[] = data.neighborhoods || [];
        const journeyPath: any[] = data.path || [];
        const conceptList = isJourney ? journeyPath : neighborhoods.flatMap((nb: any) =>
          (nb.concepts || []).map((c: any) => ({ ...c, _nbId: nb.id, _nbLabel: nb.label, _nbTheme: nb.theme }))
        );

        if (!isJourney) {
          neighborhoods.forEach((nb: any) => {
            const labelId = `label_${nb.id}`;
            newNodes.push({
              id: labelId,
              position: { x: 0, y: 0 },
              data: {
                label: nb.label || 'RELATED',
                isNeighborhoodLabel: true,
                neighborhoodTheme: nb.theme || '',
              },
              type: 'neighborhoodLabel',
              selectable: false,
              draggable: false,
              zIndex: -5,
            });
            neighborhoodGroups.push({ id: nb.id, label: nb.label, nodeIds: [] });
          });
        }

        conceptList.forEach((concept: any, index: number) => {
          if (!concept || !concept.name) return;
          if (!concept.evidence || !concept.reason) {
            console.warn(`Anti-Hallucination Rejection: "${concept.name}" lacks evidence or reason.`);
            return;
          }
          if (concept.name.toLowerCase() === resolvedTopic.toLowerCase()) return;

          const childId = `node_${Date.now()}_${index}`;
          const nbId = concept._nbId || concept.neighborhood || 'journey';
          const nbLabel = concept._nbLabel || concept.neighborhoodLabel || 'PATH';
          const nbTheme = concept._nbTheme || concept.neighborhoodTheme || '';
          const journeyIndex = isJourney ? index : undefined;

          newNodes.push({
            id: childId,
            position: { x: 0, y: 0 },
            data: {
              label: concept.name,
              isExpanded: false,
              isContrarian: concept.isContrarian || false,
              mode: explorationMode,
              neighborhood: nbId,
              neighborhoodLabel: nbLabel,
              relevance: 'immediate',
              journeyIndex,
            },
            type: 'concept',
          });

          newEdges.push({
            id: `edge_${rootId}_${childId}`,
            source: rootId,
            target: childId,
            type: 'glowing',
            data: {
              relationshipType: concept.relationship?.type || 'Shared_Domain',
              supportingSource: concept.supportingSource || 'Wikipedia Link',
              explanation: concept.reason || '',
              isContrarian: concept.isContrarian || false,
              neighborhood: nbId,
            },
          });

          newConceptDetails[childId] = {
            name: concept.name,
            explanation: '',
            reason: concept.reason || '',
            questions: [],
            image: '',
            url: '',
            categories: [],
            sources: [],
            isContrarian: concept.isContrarian || false,
            relationshipType: concept.relationship?.type || 'Shared_Domain',
            supportingSource: concept.supportingSource || 'Wikipedia Link',
            neighborhood: nbId,
            neighborhoodLabel: nbLabel,
            neighborhoodTheme: nbTheme,
            relationship: concept.relationship
              ? { ...concept.relationship, evidence: concept.evidence, reason: concept.reason }
              : { type: 'Shared_Domain', confidence: 70, evidence: concept.evidence || '', reason: concept.reason || '' },
            modeContextJustification: concept.modeContextJustification || `Selected for ${explorationMode} mode.`,
          };

          const grp = neighborhoodGroups.find(g => g.id === nbId);
          if (grp) grp.nodeIds.push(childId);
        });

        const expandedSet = new Set<string>();
        expandedSet.add(rootId);

        const laidOutNodes = applyNeighborhoodLayout(newNodes, newEdges, neighborhoodGroups, 0, 0, isJourney);

        set({
          nodes: laidOutNodes,
          edges: newEdges,
          conceptDetails: newConceptDetails,
          expandedNodeIds: expandedSet,
          hiddenNodeIds: new Set(),
          isLoading: false,
        });

        get().setSelectedNodeId(rootId);
        const updatedState = get();

        const historyItem: HistoryItem = {
          id: `session_${Date.now()}`,
          title: resolvedTopic,
          date: new Date().toLocaleDateString(),
          nodeCount: updatedState.nodes.length,
          depth: 1,
          favorite: false,
          mode: explorationMode,
          nodes: updatedState.nodes,
          edges: updatedState.edges,
          breadcrumbs: updatedState.breadcrumbs,
          conceptDetails: newConceptDetails,
          journey: updatedState.journey,
        };

        const currentHistory = [historyItem, ...get().history];
        set({ history: currentHistory });
        saveHistoryToStorage(currentHistory);

        return true;
      } catch (e) {
        console.error(e);
        set({ isLoading: false });
        alert(e instanceof Error ? e.message : 'Error connecting to API.');
        return false;
      }
    },

    expandNode: async (nodeId: string) => {
      const { nodes, edges, explorationMode, expandedNodeIds, conceptDetails, breadcrumbs } = get();
      if (expandedNodeIds.has(nodeId)) return false;

      const targetNode = nodes.find(n => n.id === nodeId);
      if (!targetNode) return false;

      const conceptName = targetNode.data.label;
      const cacheKey = conceptName.toLowerCase();

      const cached = get().prefetchedData[cacheKey];
      let data: any;

      if (activeAbortController) {
        activeAbortController.abort();
      }
      activeAbortController = new AbortController();
      activeExpandingNodeId = nodeId;
      const signal = activeAbortController.signal;

      try {
        if (cached && !cached.isLoading) {
          data = cached;
        } else {
          set({ isLoading: true, loadingType: 'expand' });
          const existingNames = nodes.filter(n => !n.data.isNeighborhoodLabel).map(n => n.data.label);

          const response = await fetch('/api/expand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              concept: conceptName,
              mode: explorationMode,
              existing: existingNames,
              breadcrumbs,
              depth: breadcrumbs.length,
            }),
            signal,
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to expand node');
          }

          data = await response.json();
        }

        const isJourney = false;
        const updatedDetails = { ...conceptDetails };

        if (updatedDetails[nodeId]) {
          updatedDetails[nodeId] = {
            ...updatedDetails[nodeId],
            explanation: data.explanation || updatedDetails[nodeId].explanation,
            questions: data.questions || [],
            image: data.image || updatedDetails[nodeId].image || '',
            url: data.url || updatedDetails[nodeId].url || '',
            categories: data.categories || updatedDetails[nodeId].categories || [],
            sources: data.sources || updatedDetails[nodeId].sources || [],
            historicalContext: data.profile?.historicalContext || updatedDetails[nodeId].historicalContext || '',
          };
        }

        const currentNodes = [...nodes];
        const currentEdges = [...edges];
        const px = targetNode.position.x;
        const py = targetNode.position.y;

        const neighborhoods: any[] = data.neighborhoods || [];
        const journeyPath: any[] = data.path || [];
        const conceptList = isJourney
          ? journeyPath
          : neighborhoods.flatMap((nb: any) =>
            (nb.concepts || []).map((c: any) => ({ ...c, _nbId: nb.id, _nbLabel: nb.label, _nbTheme: nb.theme }))
          );

        const neighborhoodGroups: NeighborhoodGroup[] = [];

        if (!isJourney) {
          neighborhoods.forEach((nb: any) => {
            const labelId = `label_${nodeId}_${nb.id}`;
            const alreadyExists = currentNodes.some(n => n.id === labelId);
            if (!alreadyExists) {
              currentNodes.push({
                id: labelId,
                position: { x: px, y: py },
                data: {
                  label: nb.label || 'RELATED',
                  isNeighborhoodLabel: true,
                  neighborhoodTheme: nb.theme || '',
                },
                type: 'neighborhoodLabel',
                selectable: false,
                draggable: false,
                zIndex: -5,
              });
            }
            neighborhoodGroups.push({ id: nb.id, label: nb.label, nodeIds: [] });
          });
        }

        conceptList.forEach((concept: any, index: number) => {
          if (!concept || !concept.name) return;
          if (!concept.evidence || !concept.reason) {
            console.warn(`Anti-Hallucination Rejection: "${concept.name}" lacks evidence or reason.`);
            return;
          }
          if (concept.name.toLowerCase() === conceptName.toLowerCase()) return;

          const nbId = concept._nbId || concept.neighborhood || 'journey';
          const nbLabel = concept._nbLabel || concept.neighborhoodLabel || 'PATH';
          const nbTheme = concept._nbTheme || concept.neighborhoodTheme || '';

          const existingNode = currentNodes.find(
            n => !n.data.isNeighborhoodLabel && n.data.label.toLowerCase() === concept.name.toLowerCase()
          );

          if (existingNode) {
            const edgeExists = currentEdges.some(
              e => (e.source === nodeId && e.target === existingNode.id) ||
                (e.source === existingNode.id && e.target === nodeId)
            );
            if (!edgeExists) {
              currentEdges.push({
                id: `edge_${nodeId}_${existingNode.id}`,
                source: nodeId,
                target: existingNode.id,
                type: 'glowing',
                data: {
                  relationshipType: concept.relationship?.type || 'Shared_Domain',
                  explanation: concept.reason || '',
                  isContrarian: concept.isContrarian || false,
                  neighborhood: nbId,
                },
              });
            }
          } else {
            const childId = `node_${Date.now()}_${index}`;
            currentNodes.push({
              id: childId,
              position: { x: px, y: py },
              data: {
                label: concept.name,
                isExpanded: false,
                isContrarian: concept.isContrarian || false,
                mode: explorationMode,
                neighborhood: nbId,
                neighborhoodLabel: nbLabel,
                relevance: 'immediate',
                journeyIndex: isJourney ? index : undefined,
              },
              type: 'concept',
            });

            currentEdges.push({
              id: `edge_${nodeId}_${childId}`,
              source: nodeId,
              target: childId,
              type: 'glowing',
              data: {
                relationshipType: concept.relationship?.type || 'Shared_Domain',
                explanation: concept.reason || '',
                isContrarian: concept.isContrarian || false,
                neighborhood: nbId,
              },
            });

            updatedDetails[childId] = {
              name: concept.name,
              explanation: '',
              reason: concept.reason || '',
              questions: [],
              image: '',
              url: '',
              categories: [],
              sources: [],
              isContrarian: concept.isContrarian || false,
              relationshipType: concept.relationship?.type || 'Shared_Domain',
              supportingSource: concept.supportingSource || 'Wikipedia Link',
              neighborhood: nbId,
              neighborhoodLabel: nbLabel,
              neighborhoodTheme: nbTheme,
              relationship: concept.relationship
                ? { ...concept.relationship, evidence: concept.evidence, reason: concept.reason }
                : { type: 'Shared_Domain', confidence: 70, evidence: concept.evidence || '', reason: concept.reason || '' },
              modeContextJustification: concept.modeContextJustification || `Selected for ${explorationMode} mode.`,
            };

            const grp = neighborhoodGroups.find(g => g.id === nbId);
            if (grp) grp.nodeIds.push(childId);
          }
        });

        const nextNodes = currentNodes.map(n => {
          if (n.id === nodeId) return { ...n, data: { ...n.data, isExpanded: true } };
          return n;
        });

        const laidOutNodes = applyNeighborhoodLayout(nextNodes, currentEdges, neighborhoodGroups, px, py, isJourney);

        const newExpandedSet = new Set(expandedNodeIds);
        newExpandedSet.add(nodeId);

        pushUndo();

        if (activeExpandingNodeId === nodeId) {
          activeExpandingNodeId = null;
          activeAbortController = null;
        }

        set({
          nodes: laidOutNodes,
          edges: currentEdges,
          conceptDetails: updatedDetails,
          expandedNodeIds: newExpandedSet,
          isLoading: false,
          loadingType: null,
        });

        get().setSelectedNodeId(nodeId);
        const updatedState = get();

        const history = [...get().history];
        if (history.length > 0) {
          const activeHistory = history[0];
          activeHistory.nodes = updatedState.nodes;
          activeHistory.edges = updatedState.edges;
          activeHistory.conceptDetails = updatedDetails;
          activeHistory.nodeCount = updatedState.nodes.length;
          activeHistory.journey = updatedState.journey;

          const currentBreadcrumbLength = updatedState.breadcrumbs.length;
          if (currentBreadcrumbLength > activeHistory.depth) {
            activeHistory.depth = currentBreadcrumbLength;
          }

          set({ history });
          saveHistoryToStorage(history);
        }

        return true;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          console.log(`Expansion aborted for ${nodeId}`);
          return false;
        }
        console.error(e);

        if (activeExpandingNodeId === nodeId) {
          activeExpandingNodeId = null;
          activeAbortController = null;
        }

        set({ isLoading: false, loadingType: null });
        alert(e instanceof Error ? e.message : 'Error expanding node.');
        return false;
      }
    },

    findConnection: async (conceptA: string, conceptB: string) => {
      if (!conceptA.trim() || !conceptB.trim()) return false;
      const { resetGraph, explorationMode } = get();

      resetGraph();
      set({ isLoading: true });

      try {
        const response = await fetch('/api/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conceptA,
            conceptB,
            mode: explorationMode,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Failed to connect concepts');
        }

        const data = await response.json();
        const pathElements = data.path;
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const newConceptDetails: Record<string, ConceptDetail> = {};
        const expandedSet = new Set<string>();

        const startX = -((pathElements.length - 1) * 240) / 2;

        pathElements.forEach((step: any, index: number) => {
          const nodeId = index === 0 ? 'root' : `node_conn_${index}`;

          newNodes.push({
            id: nodeId,
            position: {
              x: startX + index * 240,
              y: 0,
            },
            data: {
              label: step.name,
              isExpanded: true,
              isPathConnection: true,
              mode: explorationMode,
            },
            type: 'concept',
          });

          if (index > 0) {
            const prevId = index - 1 === 0 ? 'root' : `node_conn_${index - 1}`;
            newEdges.push({
              id: `edge_conn_${index}`,
              source: prevId,
              target: nodeId,
              type: 'glowing',
              data: {
                isBridge: true,
                relationshipType: 'Path Connection',
                supportingSource: 'Concept Bridge Traversal',
                mode: explorationMode,
              }
            });
          }

          newConceptDetails[nodeId] = {
            name: step.name,
            explanation: step.explanation || `Intermediate concept connecting ${conceptA} and ${conceptB}.`,
            reason: step.reason,
            questions: [],
            image: step.image || '',
            url: step.url || '',
            categories: step.categories || [],
            sources: step.sources || [],
            isContrarian: false,
          };

          expandedSet.add(nodeId);
        });

        set({
          nodes: newNodes,
          edges: newEdges,
          conceptDetails: newConceptDetails,
          selectedNodeId: 'root',
          breadcrumbs: pathElements.map((p: any) => p.name),
          journey: pathElements.map((p: any) => p.name),
          expandedNodeIds: expandedSet,
          connectionBridgeResult: {
            conceptA,
            conceptB,
            path: pathElements,
            overallExplanation: data.overallExplanation || '',
          },
          isLoading: false,
        });

        const historyItem: HistoryItem = {
          id: `session_${Date.now()}`,
          title: `${conceptA} ⇄ ${conceptB}`,
          date: new Date().toLocaleDateString(),
          nodeCount: newNodes.length,
          depth: newNodes.length,
          favorite: false,
          mode: get().explorationMode,
          nodes: newNodes,
          edges: newEdges,
          breadcrumbs: pathElements.map((p: any) => p.name),
          conceptDetails: newConceptDetails,
          journey: pathElements.map((p: any) => p.name),
        };

        const currentHistory = [historyItem, ...get().history];
        set({ history: currentHistory });
        saveHistoryToStorage(currentHistory);

        return true;
      } catch (e) {
        console.error(e);
        set({ isLoading: false });
        alert(e instanceof Error ? e.message : 'Error finding connection.');
        return false;
      }
    },

    collapseBranch: (nodeId: string) => {
      const { nodes, edges, hiddenNodeIds } = get();
      const childIds = new Set<string>();

      const findChildren = (id: string) => {
        edges.forEach(e => {
          if (e.source === id && !childIds.has(e.target)) {
            childIds.add(e.target);
            findChildren(e.target);
          }
        });
      };
      findChildren(nodeId);

      // Just hide descendants instead of deleting, so they can be uncollapsed later.
      const newHiddenIds = new Set(hiddenNodeIds);
      childIds.forEach(id => newHiddenIds.add(id));

      const updatedNodes = nodes.map(n => {
        if (n.id === nodeId) return { ...n, data: { ...n.data, isExpanded: false } };
        if (childIds.has(n.id)) return { ...n, hidden: true };
        return n;
      });

      const updatedEdges = edges.map(e => {
        if (childIds.has(e.source) || childIds.has(e.target)) return { ...e, hidden: true };
        return e;
      });

      const newExpandedSet = new Set(get().expandedNodeIds);
      childIds.forEach(id => newExpandedSet.delete(id));
      newExpandedSet.delete(nodeId);

      pushUndo();

      set({
        nodes: updatedNodes,
        edges: updatedEdges,
        expandedNodeIds: newExpandedSet,
        hiddenNodeIds: newHiddenIds,
        selectedNodeId: nodeId,
      });
    },

    restoreBranch: (nodeId: string) => {
      // Restore all hidden descendants of nodeId
      const { nodes, edges, hiddenNodeIds, expandedNodeIds } = get();
      const childIds = new Set<string>();

      // Check all connections, including hidden ones, to find sub-nodes.
      edges.forEach(e => {
        if (e.source === nodeId) childIds.add(e.target);
      });

      // Recursively find all descendants
      const allDescendants = new Set<string>();
      const collectAll = (id: string) => {
        edges.forEach(e => {
          if (e.source === id && !allDescendants.has(e.target)) {
            allDescendants.add(e.target);
            collectAll(e.target);
          }
        });
      };
      childIds.forEach(id => { allDescendants.add(id); collectAll(id); });

      const newHiddenIds = new Set(hiddenNodeIds);
      allDescendants.forEach(id => newHiddenIds.delete(id));

      const updatedNodes = nodes.map(n => {
        if (allDescendants.has(n.id)) return { ...n, hidden: false };
        return n;
      });
      const updatedEdges = edges.map(e => {
        if (allDescendants.has(e.source) || allDescendants.has(e.target)) return { ...e, hidden: false };
        return e;
      });

      const newExpandedSet = new Set(expandedNodeIds);
      newExpandedSet.add(nodeId);
      allDescendants.forEach(id => {
        const node = nodes.find(n => n.id === id);
        if (node?.data?.isExpanded) newExpandedSet.add(id);
      });

      const updatedParentNodes = updatedNodes.map(n => {
        if (n.id === nodeId) return { ...n, data: { ...n.data, isExpanded: true } };
        return n;
      });

      set({
        nodes: updatedParentNodes,
        edges: updatedEdges,
        hiddenNodeIds: newHiddenIds,
        expandedNodeIds: newExpandedSet,
      });
    },

    expandAllNodes: () => {
      const { nodes, hiddenNodeIds } = get();
      // Unhide all hidden nodes and mark them all expanded
      const updatedNodes = nodes.map(n => ({
        ...n,
        hidden: false,
        data: { ...n.data, isExpanded: true },
      }));
      set({
        nodes: updatedNodes,
        hiddenNodeIds: new Set(),
        expandedNodeIds: new Set(nodes.map(n => n.id)),
      });
    },

    loadExploration: (item: HistoryItem) => {
      const expandedSet = new Set<string>();
      item.nodes.forEach(n => {
        if (n.data.isExpanded) expandedSet.add(n.id);
      });

      set({
        nodes: item.nodes,
        edges: item.edges,
        breadcrumbs: item.breadcrumbs,
        conceptDetails: item.conceptDetails,
        selectedNodeId: item.nodes[0]?.id || null,
        expandedNodeIds: expandedSet,
        explorationMode: item.mode,
        activePage: 'explore',
        journey: item.journey || item.breadcrumbs,
      });
    },

    toggleFavorite: (id: string) => {
      const history = get().history.map(item => {
        if (item.id === id) {
          return { ...item, favorite: !item.favorite };
        }
        return item;
      });
      set({ history });
      saveHistoryToStorage(history);
    },

    deleteHistoryItem: (id: string) => {
      const history = get().history.filter(item => item.id !== id);
      set({ history });
      saveHistoryToStorage(history);
    },

    clearHistory: () => {
      set({ history: [] });
      saveHistoryToStorage([]);
    },
  };
});
