import Anthropic from '@anthropic-ai/sdk';
import { AIInsights } from '@/types/kpi';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function chatWithAssistant(
  message: string, 
  kpiContext?: any
): Promise<string> {
  try {
    let contextPrompt = '';
    if (kpiContext) {
      contextPrompt = `
CONTEXT: You have access to Milea Estate Vineyard's latest KPI data:
${JSON.stringify(kpiContext, null, 2)}

Use this data to provide specific, data-driven answers about their performance.
`;
    }
    const prompt = `${contextPrompt}

You are an AI assistant for Milea Estate Vineyard's management team. You help analyze their business performance using KPI data from their Commerce7 system.

User question: ${message}

Provide a helpful, specific answer based on the KPI data when available. If you don't have specific data to answer the question, explain what data would be needed and suggest how they could get insights.
Keep responses concise but informative. Use specific numbers from the data when relevant.`;
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1500,
      messages: [{ 
        role: 'user', 
        content: prompt 
      }]
    });
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    return content.text;
  } catch (error: any) {
    console.error('Error in chat assistant:', error);
    throw new Error(`Failed to process chat message: ${error.message}`);
  }
}
