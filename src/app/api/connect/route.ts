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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { conceptA, conceptB, mode = 'default' } = body;

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


    const [titleA, titleB] = await Promise.all([
      searchWikipedia(conceptA),
      searchWikipedia(conceptB)
    ]);

    if (!titleA || !titleB) {
      return NextResponse.json(
        { message: `Could not resolve Wikipedia titles for inputs: ${conceptA}, ${conceptB}` },
        { status: 404 }
      );
    }

    let pathNames: string[] = [];
    let traversalSource = `${mode.charAt(0).toUpperCase() + mode.slice(1)} Connection Pathfinder`;

    const modeInstructions: Record<string, string> = {
      default: "a logical, surprising, and intellectually satisfying path of related concepts",
      technical: "a technological path highlighting engineering systems, computing, physical sciences, mathematical structures, or protocols",
      historical: "a historical path highlighting chronological events, societal shifts, geopolitical movements, or major historical turning points",
      business: "a business path highlighting economics, corporate history, commercial incentives, market dynamics, or industrial changes",
      philosophical: "a philosophical path highlighting intellectual frameworks, conceptual schemas, philosophical doctrines, or logical deductions",
      contrarian: "a contrarian path highlighting systemic paradoxes, criticisms, counter-intuitive connections, or hidden ironies",
    };
    const modeGuideline = modeInstructions[mode] || modeInstructions.default;


    const config = getAiConfig();
    const pathfinderSystemPrompt = `You are Interstice, an advanced knowledge pathfinder.
Your task is to suggest a logical, surprising, and intellectually satisfying path of real concepts (corresponding to exact Wikipedia article titles) that connects Concept A to Concept B under the ${mode.toUpperCase()} lens.

Concept A: "${titleA}"
Concept B: "${titleB}"

MODE LENS GUIDELINE (${mode.toUpperCase()}):
Find a path that represents: ${modeGuideline}.

CRITICAL RULES FOR PATH QUALITY:
1. Every step MUST link to the next step through a direct, concrete, factual relationship (e.g., entity X created Y, event X occurred in country Y, X is a member of Y, X influenced Y, X was banned by Y).
2. NEVER use abstract contrast, superficial comparison, or weak thematic similarities to bridge steps (e.g., do NOT link a digital meme directly to a political party by saying 'this contrasts with the other' or 'both are popular'). If there is no immediate real-world link, you MUST find intermediate steps (like a video app, a country, or a historical era) that factually bridge them.
3. Every transition from Step N to Step N+1 must be direct and explainable with a concrete fact.
4. Output an array of exact Wikipedia article titles starting with "${titleA}" and ending with "${titleB}".
5. PATH LENGTH: The path can be as long as necessary (typically between 3 to 8 steps) to ensure every single transition is a direct, concrete, factual link. Do NOT compress the path or skip intermediate links if it requires more steps to be logical.
6. Every step in the path MUST represent a real, widely known concept with an exact matching page on Wikipedia. Do not hallucinate or make up page titles.

EXAMPLES OF PATH QUALITY:
- Input: "Tung Tung Tung Sahur" to "Narendra Modi"
  * BAD PATH: ["Tung Tung Tung Sahur", "1951-52 Indian general election", "Narendra Modi"] (Illogical - there is no direct factual link between a TikTok meme from 2025 and an election in 1951. Jumping these steps is invalid).
  * GOOD PATH: ["Tung Tung Tung Sahur", "TikTok", "Banning of TikTok in India", "Narendra Modi"] (Logical - Tung Tung Tung Sahur is a TikTok meme; TikTok was banned in India; the ban was enacted under Narendra Modi's administration).

- Input: "Kubernetes" to "Ancient Rome"
  * BAD PATH: ["Kubernetes", "Colosseum", "Ancient Rome"] (Illogical - Kubernetes is software and Colosseum is an ancient monument; they don't link directly).
  * GOOD PATH: ["Kubernetes", "Greek language", "Latin", "Ancient Rome"] (Logical - Kubernetes is derived from a Greek word; Greek has deep linguistic ties to Latin; Latin was the language of Ancient Rome).

You must return a valid JSON object with the following field:
- "path": An array of strings representing the exact Wikipedia article titles, e.g. ["${titleA}", "Unix", "UTF-8", "${titleB}"].`;

    try {
      const pathfinderUserPrompt = `Find a ${mode}-themed path of real Wikipedia article titles connecting "${titleA}" to "${titleB}".`;
      const aiPath = await callAi(config, pathfinderSystemPrompt, pathfinderUserPrompt);
      if (aiPath && Array.isArray(aiPath.path) && aiPath.path.length >= 2) {
        pathNames = aiPath.path;
      }
    } catch (err) {
      console.error('AI pathfinder failed, falling back to BFS', err);
    }


    if (pathNames.length < 2) {
      traversalSource = 'Wikipedia Graph Traversal';
      if (titleA.toLowerCase() === titleB.toLowerCase()) {
        pathNames = [titleA];
      } else {
        const [detailsA, backlinksB] = await Promise.all([
          getWikipediaDetails(titleA),
          getWikipediaBacklinks(titleB),
        ]);

        const filteredALinks = filterLowValueLinks(detailsA.internalLinks);
        const filteredBBacklinks = filterLowValueLinks(backlinksB);

        const directLink = filteredALinks.find(l => l.toLowerCase() === titleB.toLowerCase());
        
        if (directLink) {
          pathNames = [titleA, titleB];
        } else {
          const overlap = filteredALinks.filter(l => 
            filteredBBacklinks.some(bl => bl.toLowerCase() === l.toLowerCase())
          );

          if (overlap.length > 0) {
            pathNames = [titleA, overlap[0], titleB];
          } else {
            const topALinks = filteredALinks.slice(0, 8);
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
                pathNames = [titleA, ad.parent, overlap2, titleB];
                foundPath = true;
                break;
              }
            }

            if (!foundPath) {
              pathNames = [titleA, titleB];
            }
          }
        }
      }
    }


    const resolvedPathDetailsRaw = await Promise.all(
      pathNames.map(async (name) => {
        const canonical = await searchWikipedia(name);
        const summary = await getWikipediaSummary(canonical || name);
        const details = await getWikipediaDetails(canonical || name);
        return {
          name: canonical || name,
          explanation: summary.extract || 'No overview available.',
          image: summary.image,
          url: summary.url,
          categories: details.categories,
          sources: details.externalLinks.slice(0, 10),
        };
      })
    );


    const resolvedPathDetails = resolvedPathDetailsRaw.filter((step, idx, self) => 
      self.findIndex(s => s.name.toLowerCase() === step.name.toLowerCase()) === idx
    );


    const pathSummariesText = resolvedPathDetails.map((step, idx) => {
      return `Step ${idx + 1}: "${step.name}"
Summary: ${step.explanation}`;
    }).join('\n\n');


    const systemPrompt = `You are Interstice, an advanced knowledge pathfinder.
Your task is to take a path of connected concepts and explain why each transition makes sense under the "${mode.toUpperCase()}" lens.
For each transition from Step N to Step N+1, write a compelling, highly informative 1-to-2 sentence connection explanation ("reason") explaining the direct, concrete factual link between the two.

CRITICAL RULES FOR REASONS:
1. Explain the concrete, real-world connection between the concepts (e.g., "Concept A is a video on TikTok, which was banned in India by Narendra Modi's administration").
2. NEVER use contrast, comparison, or abstract similarities as the reason (e.g., do NOT say "Concept A contrasts with Concept B because one is serious and the other is a meme"). If you write a contrast or comparison instead of a real factual connection, you have FAILED.
3. Keep the reason concise, engaging, and under 2 sentences.

Path steps: ${resolvedPathDetails.map(d => d.name).join(' → ')}

SUMMARIES:
${pathSummariesText}

You must return a valid JSON object with the following fields:
1. "path": An array of objects. Each object must contain:
   - "name": The exact name of the concept (must match the step name).
   - "reason": A brief, compelling explanation of why this concept links to the PREVIOUS concept in the path. For the first concept, the reason should be "Origin concept".
2. "overallExplanation": A concise summary (2-3 sentences) explaining the narrative logic of this connection path under the "${mode}" lens.`;

    const userPrompt = `Explain the transitions for the path: ${resolvedPathDetails.map(d => d.name).join(' -> ')}`;

    let aiResponse;
    try {
      aiResponse = await callAi(config, systemPrompt, userPrompt);
    } catch (err) {
      console.error('AI connection explanation failed, using fallback', err);
      aiResponse = {
        path: resolvedPathDetails.map((step, idx) => ({
          name: step.name,
          reason: idx === 0 ? 'Origin concept' : `Connected concept in the path.`,
        })),
        overallExplanation: `A connection path between ${titleA} and ${titleB} traversing related intermediate concepts under the ${mode} lens.`,
      };
    }


    const finalPath = resolvedPathDetails.map((step, idx) => {
      const aiStep = (aiResponse.path || []).find((p: any) => p && p.name && p.name.toLowerCase() === step.name.toLowerCase()) 
        || (aiResponse.path && aiResponse.path[idx])
        || { reason: idx === 0 ? 'Origin concept' : 'Connected concept' };

      return {
        ...step,
        reason: aiStep.reason || (idx === 0 ? 'Origin concept' : 'Connected concept'),
        relationshipType: idx === 0 ? 'Start Node' : 'Path Connection',
        supportingSource: idx === 0 ? 'Start Node' : traversalSource,
      };
    });

    return NextResponse.json({
      path: finalPath,
      overallExplanation: aiResponse.overallExplanation || 'Logical bridge successfully generated.'
    });

  } catch (e) {
    console.error('Error in connect API:', e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
