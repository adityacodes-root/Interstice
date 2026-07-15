export function getAiConfig(): { apiKey: string; baseUrl: string; model: string } {
  const apiKey = process.env.GROQ_API_KEY || '';
  const baseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  return { apiKey, baseUrl, model };
}

// LLMs sometimes wrap the JSON response in ```json ... ```. This strips those fences out.
function extractJson(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return raw.trim();
}

export async function callAi(
  config: { apiKey: string; baseUrl: string; model: string },
  systemPrompt: string,
  userPrompt: string
) {
  if (!config.apiKey) {
    throw new Error('Groq API Key is missing. Please configure GROQ_API_KEY in your environment.');
  }

  const cleanBaseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = `${cleanBaseUrl}/chat/completions`;

  const fullSystemPrompt = `${systemPrompt}\n\nCRITICAL: Return ONLY valid JSON. Do not include markdown, code fences, or external text.`;

  let lastError: Error | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: fullSystemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI API raw error (Status ${response.status}):`, errorText);

        let errorMessage = `API Request failed with status ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText.substring(0, 300);
        }

        // If we get rate-limited (429) or the server is overloaded (503), wait and retry.
        if ((response.status === 503 || response.status === 429) && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
          continue;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from AI completion.');
      }

      const cleaned = extractJson(content);
      try {
        return JSON.parse(cleaned);
      } catch {
        console.error('Failed to parse JSON from model response:', content);
        throw new Error('AI returned an invalid JSON structure. Please try again.');
      }
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }

  throw lastError || new Error('API Request failed after max attempts');
}

// Fallback to ask the LLM if Wikipedia has no summary or page for the concept.
export async function generateAiFallbackSummary(concept: string): Promise<string> {
  const config = getAiConfig();
  if (!config.apiKey) {
    console.warn('API key is missing, cannot generate fallback summary.');
    return '';
  }
  
  const systemPrompt = `You are Interstice, an expert educator.
Provide a concise, direct, factual, and interesting 2-3 sentence overview or answer for the concept or question: "${concept}".
Do not include any introductions. Return a JSON object with a single field:
{
  "summary": "your 2-3 sentence overview or answer"
}`;
  
  const userPrompt = `Provide a concise 2-3 sentence overview or answer for: "${concept}".`;
  
  try {
    const res = await callAi(config, systemPrompt, userPrompt);
    return res.summary || '';
  } catch (err) {
    console.error('Failed to generate AI fallback summary:', err);
    return '';
  }
}
