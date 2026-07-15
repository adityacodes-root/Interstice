import { NextRequest, NextResponse } from 'next/server';
import { getAiConfig, callAi } from '@/utils/ai';

export async function POST(req: NextRequest) {
  try {
    const { path = [], selectedNode, mode = 'curiosity' } = await req.json().catch(() => ({}));

    if (!selectedNode) {
      return NextResponse.json({ message: 'selectedNode is required' }, { status: 400 });
    }

    if (path.length <= 1) {
      return NextResponse.json({
        explanation: `"${selectedNode}" is the starting concept of your exploration.`
      });
    }

    const config = getAiConfig();
    const parentNode = path[path.length - 2] || '';
    const startingNode = path[0] || '';

    const modePrompts = {
      default: 'Focus on a balanced, curious overview. Mix foundational concepts, key people, real-world applications, and surprising lateral connections.',
      technical: 'Focus on implementation, systems, architectures, software/hardware mechanisms, computer science, and engineering principles.',
      historical: 'Focus on origins, historical timelines, key historical figures, evolutionary phases, major events, and societal impact over time.',
      business: 'Focus on industries, markets, economics, business models, startups, monetization, and commercial trends.',
      philosophical: 'Focus on abstract ideas, ethics, reasoning, consciousness, epistemology, and theoretical frameworks.',
      contrarian: 'Focus on challenge, criticisms, dissenting viewpoints, failures, and alternative perspectives that go against the mainstream consensus.',
      curiosity: 'Focus on fascinating, lateral, and intriguing details that naturally spark wonder, mystery, and interest in a curious learner.',
      random: 'Focus on surprising, highly unconventional, yet logical connections that bridge completely different domains of knowledge.',
    };
    const modeText = modePrompts[mode as keyof typeof modePrompts] || modePrompts.default;

    const systemPrompt = `You are Interstice, the guide in a knowledge exploration engine.
Your task is to write a concise, educational, 1-2 sentence explanation answering the question "Why am I seeing this?" for a concept in a path.

Concept: "${selectedNode}"
Parent Concept (directly connected): "${parentNode}"
Starting Concept (overall journey began here): "${startingNode}"
Full exploration path: ${path.join(' → ')}
Exploration Mode: "${mode}"

RULES:
1. Explain the relationship between "${selectedNode}" and the parent node "${parentNode}".
2. Put this connection in the context of the overall journey starting at "${startingNode}".
3. Be factual, concise (1-2 sentences), and educational. Do not sound like a generic chatbot.
4. Adapt your explanation to focus on the active exploration mode: ${modeText}

You must return a valid JSON object with the following field:
- "explanation": The concise 1-2 sentence explanation.`;

    const userPrompt = `Explain why I am seeing "${selectedNode}" in the path: ${path.join(' -> ')}.`;

    let response;
    try {
      response = await callAi(config, systemPrompt, userPrompt);
    } catch (err) {
      console.error('AI why-seeing-this failed, using fallback', err);
      response = {
        explanation: `"${selectedNode}" connects directly to "${parentNode}", which was reached during your exploration starting from "${startingNode}".`
      };
    }

    let explanationString = '';
    if (typeof response === 'string') {
      explanationString = response;
    } else if (response && typeof response === 'object') {
      explanationString = response.explanation || response.response || response.answer || JSON.stringify(response);
    }

    return NextResponse.json({
      explanation: explanationString
    });
  } catch (e) {
    console.error('Error in why-seeing-this API:', e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
