import { NextRequest, NextResponse } from 'next/server';
import { getAiConfig, callAi } from '@/utils/ai';
import { getMockExpand } from '@/utils/mockData';
import {
  searchWikipedia,
  getWikipediaSummary,
  getWikipediaDetails,
  filterLowValueLinks,
  getWikipediaBacklinks,
  getWikipediaSeeAlsoLinks,
  getWikipediaInfoboxLinks,
  getWikipediaCategoryMembers,
} from '@/utils/wikipedia';


// Each exploration mode defines categories, Wikipedia source biases, and word exclusions.
interface ModeConfig {
  neighborhoods: string[];
  bias: {
    infobox: number;
    seeAlso: number;
    backlinks: number;
    siblings: number;
    internal: number;
  };
  softExclusions: string[];
  hardExclusions: string[];
  positiveKeywords: string[];
  focusInstruction: string;
  exclusionInstruction: string;
  relationshipTypes: string;
}

const MODE_CONFIG: Record<string, ModeConfig> = {
  default: {
    neighborhoods: ['ORIGINS & ESSENTIALS', 'CORE CONCEPTS', 'KEY FIGURES & INFLUENCES', 'APPLICATIONS & IMPACT'],
    bias: { infobox: 1.2, seeAlso: 1.2, backlinks: 1.0, siblings: 1.0, internal: 1.0 },
    softExclusions: [],
    hardExclusions: ['doi (identifier)', 'isbn (identifier)', 'issn (identifier)', 'oclc (identifier)', 'jstor (identifier)', 'lccn (identifier)', 'arxiv (identifier)'],
    positiveKeywords: [],
    focusInstruction:
      'Give a balanced, curious overview. Mix foundational concepts, key people, real-world applications, and surprising lateral connections that a smart generalist would love.',
    exclusionInstruction:
      'Avoid overly narrow technical jargon, academic paper titles, or pure corporate entities unless they are iconic.',
    relationshipTypes:
      'Creator_Work | Historical_Influence | Successor | Predecessor | Shared_Domain | Cause_Effect | Shared_Discovery',
  },

  technical: {
    neighborhoods: ['ARCHITECTURE & DESIGN', 'CORE MECHANISMS', 'TOOLS & IMPLEMENTATIONS', 'STANDARDS & PROTOCOLS'],
    bias: { infobox: 2.0, seeAlso: 1.5, backlinks: 0.5, siblings: 1.0, internal: 2.5 },
    softExclusions: ['history', 'biography', 'politics', 'economics', 'philosophy', 'culture', 'art', 'music', 'literature', 'society', 'social', 'law', 'religion'],
    hardExclusions: ['born ', 'died ', 'politician', 'president', 'prime minister', 'emperor', 'king', 'queen', 'novel', 'film', 'album', 'singer', 'actor', 'director', 'sculpture', 'painting', 'theology', 'mythology', 'pope', 'bishop', 'church', 'monastery', 'treaty of', 'battle of', 'war of'],
    positiveKeywords: ['system', 'software', 'kernel', 'protocol', 'algorithm', 'data structure', 'compiler', 'database', 'network', 'interface', 'api', 'framework', 'library', 'architecture', 'process', 'memory', 'cpu', 'virtual', 'container', 'cluster', 'storage', 'server', 'client', 'driver', 'hardware', 'code', 'programming', 'language', 'spec', 'rfc', 'concurrency', 'thread', 'pipeline', 'runtime', 'engine', 'tool', 'crypto', 'checksum', 'packet', 'socket', 'thread', 'asynchronous', 'synchronous', 'stack', 'queue', 'heap', 'binary', 'byte', 'bit', 'instruction', 'microcode', 'assembly', 'pipeline', 'cache', 'register'],
    focusInstruction:
      'Focus exclusively on how things WORK. Surface architectures, protocols, algorithms, data structures, implementation tools, dependencies, and engineering trade-offs. Every concept must have a direct technical relationship.',
    exclusionInstruction:
      'EXCLUDE: people, biographical entries, political topics, business strategy, historical narratives, cultural context. Only include if it is a technical system, protocol, algorithm, tool, or specification.',
    relationshipTypes:
      'Technological_Dependency | Successor | Predecessor | Shared_Problem | Institutional_Relationship | Shared_Domain',
  },

  historical: {
    neighborhoods: ['ORIGINS & PRECURSORS', 'KEY FIGURES & ACTORS', 'PIVOTAL EVENTS', 'LEGACY & INFLUENCE'],
    bias: { infobox: 1.2, seeAlso: 1.5, backlinks: 2.0, siblings: 1.5, internal: 0.8 },
    softExclusions: ['software version', 'npm', 'pip', 'class', 'method', 'function', 'syntax', 'variable', 'object-oriented', 'database schema', 'query parameter', 'header', 'http status', 'endpoint', 'json', 'yaml', 'xml', 'api library', 'npm package', 'git commit'],
    hardExclusions: ['v1.', 'v2.', 'v3.', 'v4.', 'v5.', 'beta version', 'patch release', 'minor update', 'bug fix', 'pull request'],
    positiveKeywords: ['history', 'origin', 'founder', 'pioneer', 'inventor', 'creation', 'development', 'early', 'era', 'century', 'ancient', 'medieval', 'war', 'empire', 'republic', 'movement', 'pivotal', 'event', 'foundation', 'legacy', 'historical', 'chronology', 'treaty', 'revolution', 'dynasty', 'timeline', 'birth', 'death', 'biography', 'archaeology', 'historian', 'antique', 'heritage'],
    focusInstruction:
      'Reconstruct the historical narrative. Prioritize the people who shaped this concept, the events that caused it, the precursors it grew from, and the long-term legacy it created. Think like a historian.',
    exclusionInstruction:
      'EXCLUDE: modern software tools, technical specifications, business metrics, current products. Focus on historical figures, events, institutions, movements, and eras.',
    relationshipTypes:
      'Historical_Influence | Predecessor | Successor | Creator_Work | Shared_Era | Cause_Effect | Institutional_Relationship | Shared_Geography',
  },

  business: {
    neighborhoods: ['MARKET LANDSCAPE', 'KEY PLAYERS & COMPANIES', 'REVENUE MODELS', 'DISRUPTIONS & TRENDS'],
    bias: { infobox: 2.2, seeAlso: 1.2, backlinks: 1.2, siblings: 1.5, internal: 0.8 },
    softExclusions: ['algorithm', 'theorem', 'philosophy', 'mythology', 'ancient', 'medieval', 'theology', 'quantum', 'physics', 'chemistry', 'biology'],
    hardExclusions: ['math theorem', 'mathematical proof', 'derivation', 'calculus', 'subatomic particle', 'quantum mechanics', 'general relativity'],
    positiveKeywords: ['company', 'corporation', 'startup', 'market', 'industry', 'revenue', 'funding', 'valuation', 'acquisition', 'merger', 'stock', 'ipo', 'nasdaq', 'nyse', 'venture capital', 'ceo', 'founder', 'business model', 'monetization', 'commercial', 'product', 'brand', 'competitor', 'sales', 'marketing', 'strategy', 'cost', 'profit', 'economic', 'finance', 'investment', 'enterprise', 'monopoly', 'pricing', 'customer', 'advertisement', 'advertising'],
    focusInstruction:
      'Map the commercial and economic ecosystem. Identify the dominant companies, business models, market dynamics, competitive forces, and industry disruptions. Think like a business strategist or investor.',
    exclusionInstruction:
      'EXCLUDE: abstract theories, historical-only figures, academic concepts, technical implementation details. Focus on companies, markets, economic models, and commercial trends.',
    relationshipTypes:
      'Institutional_Relationship | Shared_Domain | Cause_Effect | Competitor | Successor | Predecessor',
  },

  philosophical: {
    neighborhoods: ['FOUNDATIONAL CONCEPTS', 'SCHOOLS OF THOUGHT', 'KEY THINKERS', 'CRITIQUES & PARADOXES'],
    bias: { infobox: 0.8, seeAlso: 2.5, backlinks: 1.8, siblings: 1.2, internal: 0.9 },
    softExclusions: ['company', 'corporation', 'software', 'product', 'stock', 'revenue', 'market cap', 'inc.', 'corp.', 'ltd.'],
    hardExclusions: ['version release', 'download link', 'monetization', 'sales pipeline', 'advertising campaign', 'marketing strategy', 'revenue growth'],
    positiveKeywords: ['philosophy', 'thought', 'school', 'thinker', 'ethics', 'morality', 'logic', 'existential', 'epistemology', 'metaphysics', 'theory', 'argument', 'critique', 'reason', 'consciousness', 'mind', 'paradox', 'framework', 'concept', 'idealism', 'realism', 'rationalism', 'empiricism', 'humanism', 'nihilism', 'morals', 'utilitarianism', 'phenomenology', 'ontology', 'dualism', 'determinism', 'free will', 'skepticism'],
    focusInstruction:
      'Explore the landscape of ideas. Surface the abstract concepts, ethical questions, logical paradoxes, competing schools of thought, and the thinkers who defined the intellectual debate. Think like a philosopher.',
    exclusionInstruction:
      'EXCLUDE: commercial companies, software products, market statistics, engineering specifications. Focus only on ideas, arguments, thinkers, and philosophical traditions.',
    relationshipTypes:
      'Philosophical_Influence | Competing_Theory | Alternative_Framework | Shared_Problem | Historical_Influence | Shared_Discovery',
  },

  contrarian: {
    neighborhoods: ['MAINSTREAM ASSUMPTIONS', 'DISSENTING VIEWS', 'NOTABLE FAILURES', 'OVERLOOKED ALTERNATIVES'],
    bias: { infobox: 0.8, seeAlso: 2.0, backlinks: 2.2, siblings: 1.0, internal: 1.2 },
    softExclusions: [],
    hardExclusions: [],
    positiveKeywords: ['criticism', 'controversy', 'failure', 'disaster', 'alternative', 'dissent', 'opposing', 'critique', 'flaw', 'skepticism', 'debate', 'obsolescence', 'shortcoming', 'limitation', 'problem', 'risk', 'vulnerability', 'challenge', 'decline', 'collapse', 'bias', 'fallacy', 'conspiracy', 'scandal', 'opposition', 'backlash', 'defect', 'vulnerability', 'exploit', 'bug'],
    focusInstruction:
      'Challenge the consensus. Actively seek out critics, failures, overlooked alternatives, fringe perspectives, and evidence that contradicts the mainstream narrative. Prioritize the uncomfortable and the surprising.',
    exclusionInstruction:
      'AVOID the obvious, the canonical, the mainstream success stories. Specifically look for: documented failures, criticism articles, alternative approaches, minority viewpoints, and concepts that CHALLENGE the parent concept.',
    relationshipTypes:
      'Competing_Theory | Alternative_Framework | Cause_Effect | Shared_Problem | Historical_Influence',
  },
};


function scoreCandidate(
  name: string,
  sourceType: 'infobox' | 'seeAlso' | 'backlinks' | 'siblings' | 'internal',
  mode: string,
  baseScore: number,
): number {
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.default;
  const nameLower = name.toLowerCase();


  const isHardExcluded = cfg.hardExclusions?.some(kw => nameLower.includes(kw));
  if (isHardExcluded) return 0;


  const multiplier = cfg.bias[sourceType] ?? 1.0;
  let score = baseScore * multiplier;


  const hasPositiveKeyword = cfg.positiveKeywords?.some(kw => nameLower.includes(kw));
  if (hasPositiveKeyword) {
    score *= 4.0;
  }


  const isSoftExcluded = cfg.softExclusions?.some(kw => nameLower.includes(kw));
  if (isSoftExcluded) {
    score *= 0.1;
  }

  return score;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { concept, mode = 'default', existing = [], breadcrumbs = [], depth = 1 } = body;

    if (!concept) {
      return NextResponse.json({ message: 'Concept parameter is required' }, { status: 400 });
    }

    const simulationMode = req.headers.get('x-simulation-mode') === 'true';
    if (simulationMode) {
      const mockData = getMockExpand(concept, mode);
      return NextResponse.json(mockData);
    }


    const canonicalTitle = await searchWikipedia(concept);
    if (!canonicalTitle) {
      return NextResponse.json({ message: `Could not find Wikipedia page for: ${concept}` }, { status: 404 });
    }


    const [summaryData, detailsData, backlinks, seeAlso, infobox] = await Promise.all([
      getWikipediaSummary(canonicalTitle),
      getWikipediaDetails(canonicalTitle),
      getWikipediaBacklinks(canonicalTitle),
      getWikipediaSeeAlsoLinks(canonicalTitle),
      getWikipediaInfoboxLinks(canonicalTitle),
    ]);

    // Grab sibling concepts from the top 3 categories to widen our net.
    const categories = detailsData.categories || [];
    const siblingResults = await Promise.all(
      categories.slice(0, 3).map(cat => getWikipediaCategoryMembers(cat, 80))
    );
    const siblings = siblingResults.flat();



    const scoreMap = new Map<string, number>();
    const sourceMap = new Map<string, string>();

    const addScore = (
      links: string[],
      sourceType: 'infobox' | 'seeAlso' | 'backlinks' | 'siblings' | 'internal',
      baseLabel: string,
      basePoints: number,
    ) => {
      links.forEach(link => {
        const modeScore = scoreCandidate(link, sourceType, mode, basePoints);
        scoreMap.set(link, (scoreMap.get(link) || 0) + modeScore);
        if (!sourceMap.has(link)) sourceMap.set(link, baseLabel);
      });
    };

    addScore(infobox, 'infobox', 'Wikipedia Infobox', 4);
    addScore(seeAlso, 'seeAlso', 'Wikipedia See Also', 3);
    addScore(backlinks, 'backlinks', 'Wikipedia Reciprocal Link', 2);
    addScore(siblings, 'siblings', 'Wikipedia Category Sibling', 1.5);
    addScore(detailsData.internalLinks, 'internal', 'Wikipedia Internal Link', 1);


    const allCandidates = Array.from(new Set([
      ...infobox, ...seeAlso, ...backlinks, ...siblings, ...detailsData.internalLinks,
    ]));

    const cleanCandidates = filterLowValueLinks(allCandidates).filter(link => {
      const ll = link.toLowerCase();
      return (
        !existing.some((ex: string) => ex.toLowerCase() === ll) &&
        ll !== canonicalTitle.toLowerCase()
      );
    });


    const rankedCandidates = cleanCandidates
      .map(name => ({ name, score: scoreMap.get(name) || 1, source: sourceMap.get(name) || 'Wikipedia Link' }))
      .sort((a, b) => b.score - a.score);


    let topCandidates = rankedCandidates.slice(0, 22); // Contrarian mode: inject some lower-ranked candidate nodes to surface weird/unexpected pathways.
    if (mode === 'contrarian') {
      // Add some from the bottom of the ranked list to surface unexpected nodes
      const bottomCandidates = rankedCandidates.slice(-15).filter(
        c => !topCandidates.some(t => t.name === c.name)
      );
      topCandidates = [...topCandidates.slice(0, 16), ...bottomCandidates.slice(0, 6)];
    }


    const candidateSummaries = await Promise.all(
      topCandidates.map(async cand => {
        const summary = await getWikipediaSummary(cand.name);
        return { name: cand.name, extract: summary.extract || 'No summary available.', source: cand.source };
      })
    );

    const candidatesListText = candidateSummaries
      .map((c, i) => `Candidate ${i + 1}: "${c.name}"\nSource: ${c.source}\nSummary: ${c.extract}\n---`)
      .join('\n\n');


    const config = getAiConfig();
    const rootConcept = breadcrumbs[0] || canonicalTitle;
    const isJourneyMode = mode === 'journey';
    const modeCfg = MODE_CONFIG[mode] || MODE_CONFIG.default;

    const depthGuidance =
      depth <= 1
        ? `DEPTH 1 (Root): Establish the most essential, foundational concepts that define the space around "${canonicalTitle}".`
        : depth === 2
          ? `DEPTH 2: Branch into adjacent, meaningful subfields. Begin surfacing less-obvious but highly relevant concepts.`
          : `DEPTH ${depth} (Deep): Surface niche, lateral, or surprising concepts. Prioritize nodes that open genuinely new directions of inquiry.`;

    let systemPrompt: string;

    if (isJourneyMode) {
      systemPrompt = buildJourneyPrompt(canonicalTitle, summaryData.extract, rootConcept, depthGuidance, candidatesListText);
    } else {
      systemPrompt = buildNeighborhoodPrompt(canonicalTitle, summaryData.extract, mode, modeCfg, rootConcept, depthGuidance, candidatesListText);
    }

    const userPrompt = isJourneyMode
      ? `Build a journey narrative path from "${canonicalTitle}".`
      : `Curate "${mode}" mode neighborhoods for "${canonicalTitle}".`;

    let aiResponse: any;
    try {
      aiResponse = await callAi(config, systemPrompt, userPrompt);
    } catch (err) {
      console.error('AI call failed, using fallback', err);
      aiResponse = buildFallback(canonicalTitle, isJourneyMode, candidateSummaries);
    }


    if (!isJourneyMode) {
      return NextResponse.json(
        await processNeighborhoods(
          aiResponse, canonicalTitle, summaryData, detailsData, mode, candidateSummaries
        )
      );
    }
    return NextResponse.json(
      await processJourneyPath(
        aiResponse, canonicalTitle, summaryData, detailsData
      )
    );

  } catch (e) {
    console.error('Error in expand API:', e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}



function buildNeighborhoodPrompt(
  title: string,
  summary: string,
  mode: string,
  cfg: ModeConfig,
  rootConcept: string,
  depthGuidance: string,
  candidatesText: string,
): string {
  return `You are Interstice, a precision knowledge curation engine, NOT a generic assistant.

CONCEPT: "${title}"
SUMMARY: "${summary}"
MODE: ${mode.toUpperCase()}
ROOT CONCEPT: "${rootConcept}"
${depthGuidance}

═══════════════════════════════════════════════════
MODE LENS — READ THIS CAREFULLY:
${cfg.focusInstruction}

WHAT TO EXCLUDE FOR THIS MODE:
${cfg.exclusionInstruction}

REQUIRED NEIGHBORHOOD TYPES (pick 3-4 that fit best):
${cfg.neighborhoods.map(n => `  • ${n}`).join('\n')}
═══════════════════════════════════════════════════

CANDIDATE POOL (you may ONLY select from these — no invented concepts):
${candidatesText}

STRICT RULES:
1. Every selected concept MUST have "evidence" — a direct quote from its candidate summary above.
2. Every "reason" must be derivable ONLY from that evidence. No speculation.
3. Apply the mode lens ruthlessly. If a concept doesn't fit the ${mode.toUpperCase()} lens, skip it even if it's related.
4. Prefer concepts that open further exploration, not dead-ends.
5. Each neighborhood must be thematically distinct — no overlap between neighborhoods.
6. Total concepts: 8–14. Per neighborhood: 2–4.

VALID RELATIONSHIP TYPES FOR ${mode.toUpperCase()} MODE:
${cfg.relationshipTypes}

Return ONLY this JSON (no markdown, no extra text):
{
  "profile": {
    "historicalContext": "One sentence on ${title}'s historical significance."
  },
  "neighborhoods": [
    {
      "id": "short_slug",
      "label": "1-3 ALL-CAPS WORDS",
      "theme": "One sentence: what this neighborhood reveals about ${title}.",
      "concepts": [
        {
          "name": "Exact name from candidate pool",
          "reason": "Why this belongs in ${mode} mode exploration of ${title}. Max 2 sentences, facts only.",
          "evidence": "Direct quote from the candidate summary above.",
          "relationship": { "type": "From the valid types above", "confidence": 0-100 }
        }
      ]
    }
  ],
  "questions": [
    "A specific, probing question about ${title} from the ${mode} perspective.",
    "Another question that challenges assumptions or opens a new angle.",
    "A third question that a ${mode} expert would ask."
  ]
}`;
}

function buildJourneyPrompt(
  title: string,
  summary: string,
  rootConcept: string,
  depthGuidance: string,
  candidatesText: string,
): string {
  return `You are Interstice — a narrative knowledge guide.

CONCEPT: "${title}"
SUMMARY: "${summary}"
JOURNEY ROOT: "${rootConcept}"
${depthGuidance}

Your task: Build a NARRATIVE PATH of 4–6 concepts that tells an intellectually satisfying story starting from "${title}".

STORY RULES:
- Each step must represent a meaningful conceptual PIVOT or DEEPENING — not a random hop.
- The sequence must feel like a guided intellectual journey: each step earns its place by connecting logically to the previous.
- Prioritize concepts that are stepping stones — they should themselves be expandable into rich sub-topics.
- The path should feel surprising but inevitable in hindsight.

CANDIDATE POOL (select ONLY from these):
${candidatesText}

STRICT RULES:
1. Every step must have "evidence" — a direct quote from its candidate summary.
2. "reason" explains the narrative logic of THIS step following the PREVIOUS one.
3. Steps must form a coherent arc, not a list of related concepts.

Return ONLY this JSON:
{
  "profile": {
    "historicalContext": "One sentence on ${title}'s historical significance."
  },
  "path": [
    {
      "name": "Exact name from candidate pool",
      "reason": "Why this step follows logically from the previous in the narrative. Max 2 sentences.",
      "evidence": "Direct quote from the candidate summary."
    }
  ],
  "questions": [
    "A question that invites deeper exploration of this journey.",
    "A question that connects the journey to broader themes.",
    "A question about what this journey reveals."
  ]
}`;
}

function buildFallback(
  title: string,
  isJourney: boolean,
  candidates: Array<{ name: string; extract: string; source: string }>,
): any {
  const concepts = candidates.slice(0, 8).map(c => ({
    name: c.name,
    reason: `Connected to ${title} via ${c.source}.`,
    evidence: c.extract.slice(0, 150),
    relationship: { type: 'Shared_Domain', confidence: 60 },
  }));
  if (isJourney) {
    return {
      profile: { historicalContext: `${title} is a significant concept.` },
      path: concepts.slice(0, 5),
      questions: [`What is the significance of ${title}?`, `How did ${title} develop over time?`, `What is the legacy of ${title}?`],
    };
  }
  return {
    profile: { historicalContext: `${title} is a significant concept.` },
    neighborhoods: [
      { id: 'related', label: 'RELATED', theme: `Core aspects of ${title}.`, concepts: concepts.slice(0, 4) },
      { id: 'context', label: 'CONTEXT', theme: `Broader context of ${title}.`, concepts: concepts.slice(4, 8) },
    ],
    questions: [`What is the significance of ${title}?`, `How did ${title} develop over time?`, `What is the legacy of ${title}?`],
  };
}



async function processNeighborhoods(
  aiResponse: any,
  canonicalTitle: string,
  summaryData: any,
  detailsData: any,
  mode: string,
  candidateSummaries: Array<{ name: string; extract: string; source: string }>,
) {
  const rawNeighborhoods = aiResponse.neighborhoods || [];

  const processedNeighborhoods = await Promise.all(
    rawNeighborhoods.map(async (nb: any) => {
      if (!nb?.concepts) return null;
      const processedConcepts = await Promise.all(
        (nb.concepts || []).map(async (c: any) => {
          if (!c?.name) return null;
          if (!c.evidence || !c.reason) {
            console.warn(`Anti-hallucination reject: "${c.name}" missing evidence/reason`);
            return null;
          }
          const canonical = await searchWikipedia(c.name);
          const matched = candidateSummaries.find(
            cs => cs.name.toLowerCase() === (canonical || c.name).toLowerCase()
          );
          return {
            name: canonical || c.name,
            reason: c.reason,
            evidence: c.evidence,
            relationship: c.relationship || { type: 'Shared_Domain', confidence: 70 },
            supportingSource: matched?.source || 'Wikipedia Link',
            isContrarian:
              mode === 'contrarian' ||
              c.relationship?.type === 'Alternative_Framework' ||
              c.relationship?.type === 'Competing_Theory',
          };
        })
      );
      return {
        id: nb.id || (nb.label || 'related').toLowerCase().replace(/\s+/g, '_'),
        label: nb.label || 'RELATED',
        theme: nb.theme || '',
        concepts: processedConcepts.filter(Boolean),
      };
    })
  );

  const validNeighborhoods = processedNeighborhoods.filter(
    (nb): nb is NonNullable<typeof nb> => nb !== null && nb.concepts.length > 0
  );

  return {
    title: canonicalTitle,
    explanation: summaryData.extract,
    image: summaryData.image,
    url: summaryData.url,
    categories: detailsData.categories,
    sources: detailsData.externalLinks.slice(0, 15),
    profile: aiResponse.profile || { historicalContext: `${canonicalTitle} is a significant concept.` },
    neighborhoods: validNeighborhoods,
    questions: aiResponse.questions || [],
    concepts: validNeighborhoods.flatMap(nb =>
      nb.concepts.map((c: any) => ({
        name: c.name,
        neighborhood: nb.id,
        neighborhoodLabel: nb.label,
        reason: c.reason,
        evidence: c.evidence,
        relationship: {
          type: c.relationship?.type || 'Shared_Domain',
          confidence: c.relationship?.confidence || 70,
          evidence: c.evidence,
          reason: c.reason,
        },
        supportingSource: c.supportingSource,
        isContrarian: c.isContrarian,
        neighborhoods: [nb.label],
        historicalContext: '',
        modeContextJustification: `Selected for ${mode} mode — ${nb.theme}`,
      }))
    ),
    secondaryConnections: [],
  };
}

async function processJourneyPath(
  aiResponse: any,
  canonicalTitle: string,
  summaryData: any,
  detailsData: any,
) {
  const rawPath = aiResponse.path || [];
  const processedPath = await Promise.all(
    rawPath.map(async (step: any) => {
      if (!step?.name) return null;
      if (!step.evidence || !step.reason) {
        console.warn(`Journey anti-hallucination reject: "${step.name}"`);
        return null;
      }
      const canonical = await searchWikipedia(step.name);
      return { name: canonical || step.name, reason: step.reason, evidence: step.evidence };
    })
  );
  const validPath = processedPath.filter(Boolean) as Array<{ name: string; reason: string; evidence: string }>;

  return {
    title: canonicalTitle,
    explanation: summaryData.extract,
    image: summaryData.image,
    url: summaryData.url,
    categories: detailsData.categories,
    sources: detailsData.externalLinks.slice(0, 15),
    profile: aiResponse.profile || { historicalContext: `${canonicalTitle} is a significant concept.` },
    neighborhoods: [],
    path: validPath,
    questions: aiResponse.questions || [],
    concepts: validPath.map((step, i) => ({
      name: step.name,
      neighborhood: 'journey',
      neighborhoodLabel: 'PATH',
      journeyIndex: i,
      reason: step.reason,
      evidence: step.evidence,
      relationship: { type: 'Successor', confidence: 80, evidence: step.evidence, reason: step.reason },
      isContrarian: false,
      neighborhoods: ['PATH'],
      historicalContext: '',
      modeContextJustification: 'Narrative step in journey path.',
    })),
    secondaryConnections: [],
  };
}
