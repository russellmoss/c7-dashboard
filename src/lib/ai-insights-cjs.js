const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateInsights(kpiData) {
  try {
    const prompt = `
As a business analyst for Milea Estate Vineyard, analyze this comprehensive KPI data and provide actionable insights.

KPI DATA:
${JSON.stringify(kpiData, null, 2)}

Return ONLY valid JSON in this exact format:
{
  "strengths": ["strength 1", "strength 2"],
  "opportunities": ["opportunity 1", "opportunity 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "threats": ["threat 1", "threat 2"],
  "staffPraise": [{"name": "Name", "reason": "reason", "metrics": ["metric1"]}],
  "staffCoaching": [{"name": "Name", "reason": "reason", "metrics": ["metric1"]}],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "generatedAt": "${new Date().toISOString()}"
}
`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Claude response');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error generating AI insights:', error);
    throw new Error(`Failed to generate insights: ${error.message}`);
  }
}

module.exports = { generateInsights };
