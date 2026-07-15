import { NextRequest, NextResponse } from 'next/server';
import { getAiConfig, callAi } from '@/utils/ai';

export async function POST(req: NextRequest) {
  try {
    const { journey = [] } = await req.json().catch(() => ({}));
    
    if (!journey || journey.length === 0) {
      return NextResponse.json({ message: 'journey path is required' }, { status: 400 });
    }

    if (journey.length === 1) {
      return NextResponse.json({
        narrative: `You began your exploration at "${journey[0]}". Select and expand related concepts to branch out further into Interstice.`
      });
    }

    const config = getAiConfig();

    const systemPrompt = `You are Interstice, a narrative guide summarizing an intellectual exploration journey.
Your task is to take a list of concepts visited by the user in order and write a cohesive, engaging narrative explanation (3-4 sentences max) describing how their exploration evolved and why the transitions make sense.

Journey steps: ${journey.join(' → ')}

Guidelines:
- Explain why these transitions make sense (e.g., from Kubernetes to Linux, from Unix to Bell Labs, etc.).
- Make it sound like a cohesive story or guided intellectual journey.
- Keep it concise, engaging, educational, and premium.

You must return a valid JSON object with the following field:
- "narrative": The cohesive narrative explanation.`;

    const userPrompt = `Summarize my journey: ${journey.join(' -> ')}`;

    let response;
    try {
      response = await callAi(config, systemPrompt, userPrompt);
    } catch (err) {
      console.error('AI explain-journey failed, using fallback', err);
      response = {
        narrative: `You began your exploration with "${journey[0]}", then transitioned through ${journey.slice(1, -1).map((x: string) => `"${x}"`).join(', ')} before arriving at "${journey[journey.length - 1]}".`
      };
    }

    let narrativeString = '';
    if (typeof response === 'string') {
      narrativeString = response;
    } else if (response && typeof response === 'object') {
      narrativeString = response.narrative || response.explanation || response.response || JSON.stringify(response);
    }

    return NextResponse.json({
      narrative: narrativeString
    });
  } catch (e) {
    console.error('Error in explain-journey API:', e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
