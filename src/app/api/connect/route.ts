import { NextRequest, NextResponse } from 'next/server';
import { getAiConfig, callAi } from '@/utils/ai';
import { getMockConnect } from '@/utils/mockData';
import {
  searchWikipedia,
  getWikipediaSummary,
  getWikipediaDetails,
  getWikipediaBacklinks,
  filterLowValueLinks
} from '@/utils/wikipedia';

interface AiPathStep {
  name: string;
  reason: string;
}

interface AiConnectResponse {
  distance?: 'normal' | 'far' | 'absurd';
  path: AiPathStep[];
  overallExplanation: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { conceptA, conceptB } = body;

    if (!conceptA || !conceptB) {
      return NextResponse.json(
        { message: 'Both conceptA and conceptB parameters are required' },
        { status: 400 }
      );
    }

    const simulationMode = req.headers.get('x-simulation-mode') === 'true';
    if (simulationMode) {
      const mockData = getMockConnect(conceptA, conceptB);
      return NextResponse.json(mockData);
    }

    // Resolve initial Wikipedia canonical titles
    const [titleAraw, titleBraw] = await Promise.all([
      searchWikipedia(conceptA),
      searchWikipedia(conceptB)
    ]);

    const titleA = titleAraw || conceptA.trim();
    const titleB = titleBraw || conceptB.trim();

    if (!titleA || !titleB) {
      return NextResponse.json(
        { message: `Could not resolve Wikipedia titles for inputs: ${conceptA}, ${conceptB}` },
        { status: 404 }
      );
    }

    const config = getAiConfig();
    let aiResult: AiConnectResponse | null = null;

    const pathfinderSystemPrompt = `You are Interstice, the ultimate knowledge pathfinder and intellectual connection engine.
Your mission is to find a real, logically sound, and intellectually thrilling bridge connecting Concept A to Concept B.

CORE PRINCIPLE:
"Everything somehow connects." No matter how disparate, distant, or absurd two concepts seem, there exists a chain of real-world, factual, historical, scientific, or cultural stepping stones between them.

RULES FOR PATH GENERATION:
1. DISTANCE ASSESSMENT & PATH LENGTH:
   - For NORMAL / CLOSELY RELATED concepts (e.g., "Neuroplasticity" -> "Epigenetics", "Electricity" -> "Computer", "DNA" -> "Genetics"):
     Create a clean, seamless, direct path of 3 to 5 total concepts (2 to 4 connections).
   - For DISTANT, ABSURD, UNRELATED, OR FAR CONCEPTS (e.g., "Banana" -> "Black hole", "Toilet paper" -> "Artificial intelligence", "Socks" -> "Superconductivity", "Taylor Swift" -> "Quantum entanglement", "Pizza" -> "Space station", "Rubber duck" -> "French Revolution"):
     You MUST TRY HARD! Do NOT create a lazy short jump or a 2-3 node jump.
     You MUST generate AT LEAST 5 TO 6 CONNECTIONS (meaning AT LEAST 6 TO 8 TOTAL CONCEPTS in the path).
     Example structure: [Concept A, Step 1, Step 2, Step 3, Step 4, Step 5, Concept B] = 7 nodes, 6 connections.

2. FACTUAL & CONCRETE TRANSITIONS:
   - Every transition (from Step N to Step N+1) MUST be based on a concrete, real-world factual link (e.g., material composition, physical law, historical event, technological evolution, causal chain, biological relationship, documented influence).
   - NEVER use abstract contrast or superficial comparison (e.g., do NOT say "both are popular" or "one contrasts with the other").
   - Each concept must be a real, recognizable concept (standard Wikipedia article title, 1 to 4 words).

3. OUTPUT FORMAT:
Return a JSON object with:
- "distance": "normal" | "far" | "absurd"
- "path": Array of objects for each step in the path:
  [
    {
      "name": "Standard Wikipedia Article Title",
      "reason": "Direct, concrete factual explanation of how this connects to the previous concept (for first concept: 'Origin concept')"
    }
  ]
- "overallExplanation": "A compelling 2-3 sentence editorial narrative describing the surprising intellectual bridge discovered between the concepts."`;

    const pathfinderUserPrompt = `Find a connection bridge between Concept A: "${titleA}" and Concept B: "${titleB}". Remember: if they are distant or absurd, generate AT LEAST 5-6 connections (6-8 total concepts).`;

    try {
      const response = await callAi(config, pathfinderSystemPrompt, pathfinderUserPrompt);
      if (response && Array.isArray(response.path) && response.path.length >= 2) {
        aiResult = response;
      }
    } catch (err) {
      console.error('AI pathfinder call failed:', err);
    }

    if (aiResult && aiResult.path && aiResult.distance !== 'normal' && aiResult.path.length < 6) {
      try {
        const expandPrompt = `The connection between "${titleA}" and "${titleB}" is distant/absurd, but the path currently only has ${aiResult.path.length} concepts.
You MUST expand this path so that it has AT LEAST 6 to 8 concepts (at least 5-6 connections) connecting "${titleA}" to "${titleB}".
Every single intermediate concept must be a real, standard Wikipedia article title with a concrete factual reason connecting it to the previous step.

Return ONLY a valid JSON object with:
- "distance": "absurd"
- "path": Array of 6 to 8 concept objects with "name" and "reason"
- "overallExplanation": 2-3 sentence editorial narrative.`;

        const expandedResponse = await callAi(config, pathfinderSystemPrompt, expandPrompt);
        if (expandedResponse && Array.isArray(expandedResponse.path) && expandedResponse.path.length >= 6) {
          aiResult = expandedResponse;
        }
      } catch (expandErr) {
        console.warn('Path expansion attempt failed, retaining original path:', expandErr);
      }
    }

    // path steps
    let rawSteps: AiPathStep[] = [];
    let overallExplanation = '';
    let traversalSource = 'Unified Knowledge Pathfinder';

    if (aiResult && Array.isArray(aiResult.path) && aiResult.path.length >= 2) {
      rawSteps = aiResult.path.map((step, idx) => ({
        name: typeof step === 'string' ? step : step.name || `Step ${idx + 1}`,
        reason: typeof step === 'string'
          ? (idx === 0 ? 'Origin concept' : 'Connected concept in the path.')
          : (step.reason || (idx === 0 ? 'Origin concept' : 'Connected concept in the path.')),
      }));
      overallExplanation = aiResult.overallExplanation || `A logical bridge discovered between ${titleA} and ${titleB}.`;
    } else {
      traversalSource = 'Wikipedia Graph Traversal';
      if (titleA.toLowerCase() === titleB.toLowerCase()) {
        rawSteps = [{ name: titleA, reason: 'Origin concept' }];
      } else {
        const [detailsA, backlinksB] = await Promise.all([
          getWikipediaDetails(titleA),
          getWikipediaBacklinks(titleB),
        ]);

        const filteredALinks = filterLowValueLinks(detailsA.internalLinks);
        const filteredBBacklinks = filterLowValueLinks(backlinksB);

        const directLink = filteredALinks.find(l => l.toLowerCase() === titleB.toLowerCase());

        if (directLink) {
          rawSteps = [
            { name: titleA, reason: 'Origin concept' },
            { name: titleB, reason: `Direct reference found in ${titleA}.` }
          ];
        } else {
          const overlap = filteredALinks.filter(l =>
            filteredBBacklinks.some(bl => bl.toLowerCase() === l.toLowerCase())
          );

          if (overlap.length > 0) {
            rawSteps = [
              { name: titleA, reason: 'Origin concept' },
              { name: overlap[0], reason: `Connected from ${titleA}.` },
              { name: titleB, reason: `Connects to ${titleB}.` }
            ];
          } else {
            const topALinks = filteredALinks.slice(0, 10);
            const aLinksDetails = await Promise.all(
              topALinks.map(async (l) => {
                const details = await getWikipediaDetails(l);
                return { parent: l, links: filterLowValueLinks(details.internalLinks) };
              })
            );

            let foundPath = false;
            for (const ad of aLinksDetails) {
              const overlap2 = ad.links.find(l =>
                filteredBBacklinks.some(bl => bl.toLowerCase() === l.toLowerCase())
              );
              if (overlap2) {
                rawSteps = [
                  { name: titleA, reason: 'Origin concept' },
                  { name: ad.parent, reason: `Key domain linked from ${titleA}.` },
                  { name: overlap2, reason: `Bridging concept.` },
                  { name: titleB, reason: `Connects directly to ${titleB}.` }
                ];
                foundPath = true;
                break;
              }
            }

            if (!foundPath) {
              rawSteps = [
                { name: titleA, reason: 'Origin concept' },
                { name: titleB, reason: `Direct conceptual bridge between ${titleA} and ${titleB}.` }
              ];
            }
          }
        }
      }
      overallExplanation = `A conceptual traversal between ${titleA} and ${titleB}.`;
    }

    // clan up consecutive duplicate step names if any
    const deduplicatedSteps: AiPathStep[] = [];
    for (let i = 0; i < rawSteps.length; i++) {
      if (i === 0 || rawSteps[i].name.toLowerCase() !== rawSteps[i - 1].name.toLowerCase()) {
        deduplicatedSteps.push(rawSteps[i]);
      }
    }


    if (deduplicatedSteps.length > 0) {
      deduplicatedSteps[0].name = deduplicatedSteps[0].name || titleA;
      deduplicatedSteps[deduplicatedSteps.length - 1].name = deduplicatedSteps[deduplicatedSteps.length - 1].name || titleB;
    }

    const resolvedPathDetails = await Promise.all(
      deduplicatedSteps.map(async (step, idx) => {
        const canonical = await searchWikipedia(step.name);
        const effectiveName = canonical || step.name;
        const [summary, details] = await Promise.all([
          getWikipediaSummary(effectiveName),
          getWikipediaDetails(effectiveName)
        ]);

        return {
          name: step.name, // kep the clean conceptual name from the path
          canonicalTitle: effectiveName,
          explanation: summary.extract || `Exploration of ${step.name}.`,
          reason: step.reason || (idx === 0 ? 'Origin concept' : 'Connected concept in the path.'),
          image: summary.image || '',
          url: summary.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(effectiveName.replace(/\s+/g, '_'))}`,
          categories: details.categories || [],
          sources: (details.externalLinks || []).slice(0, 8),
          relationshipType: idx === 0 ? 'Start Node' : 'Path Connection',
          supportingSource: idx === 0 ? 'Start Node' : traversalSource,
        };
      })
    );

    return NextResponse.json({
      path: resolvedPathDetails,
      overallExplanation: overallExplanation || `Logical bridge successfully generated between ${titleA} and ${titleB}.`,
      connectionCount: Math.max(0, resolvedPathDetails.length - 1),
    });

  } catch (e) {
    console.error('Error in connect API:', e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
