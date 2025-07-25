const { Anthropic } = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateInsights(kpiData) {
  console.log('🤖 [AI] Starting AI insights generation...');
  try {
    // Validate input
    if (!kpiData) {
      console.error('❌ [AI] No KPI data provided');
      throw new Error('No KPI data provided');
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ [AI] ANTHROPIC_API_KEY not found in environment variables');
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }
    console.log('📊 [AI] Analyzing KPI data with Claude...');
    const prompt = `\nAs a business analyst for Milea Estate Vineyard, analyze this comprehensive KPI data and provide actionable insights.\n\nKPI DATA:\n${JSON.stringify(kpiData, null, 2)}\n\nPlease analyze the data and provide insights. Return ONLY a valid JSON object in this exact format (no markdown, no explanations, just the JSON):\n\n{\n  "strengths": ["strength 1", "strength 2", "strength 3"],\n  "opportunities": ["opportunity 1", "opportunity 2", "opportunity 3"],\n  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],\n  "threats": ["threat 1", "threat 2"],\n  "staffPraise": [{"name": "Name", "reason": "reason", "metrics": ["metric1"]}],\n  "staffCoaching": [{"name": "Name", "reason": "reason", "metrics": ["metric1"]}],\n  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],\n  "generatedAt": "${new Date().toISOString()}"\n}\n\nFocus on specific metrics from the data. If no staff performance data is available, use empty arrays for staffPraise and staffCoaching.\n`;
    console.log('📝 [AI] Prompt for Claude:', prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''));
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });
    console.log('✅ [AI] Received response from Claude');
    const content = response.content[0];
    if (content.type !== 'text') {
      console.error('❌ [AI] Unexpected response type from Claude:', content.type);
      throw new Error('Unexpected response type from Claude');
    }
    console.log('🔍 [AI] Extracting JSON from Claude response...');
    let responseText = content.text.trim();
    console.log('📝 [AI] Raw Claude response (first 200 chars):', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\s*|```/g, '');
    // Try to find JSON in the response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // If no JSON found, try parsing the entire response
      console.warn('⚠️ [AI] No JSON found in Claude response, using full text');
      jsonMatch = [responseText];
    }
    let insights;
    try {
      insights = JSON.parse(jsonMatch[0]);
      console.log('✅ [AI] Successfully parsed JSON insights');
    } catch (parseError) {
      console.error('❌ [AI] JSON parsing failed:', parseError.message);
      console.error('📝 [AI] Failed to parse (first 500 chars):', jsonMatch[0].substring(0, 500));
      // Fallback: create basic insights structure
      console.log('🔄 [AI] Creating fallback insights...');
      insights = {
        strengths: ["Data analysis completed", "System operational"],
        opportunities: ["Review detailed metrics", "Analyze trends"],
        weaknesses: ["AI parsing temporarily unavailable"],
        threats: ["Data processing issues"],
        staffPraise: [],
        staffCoaching: [],
        recommendations: ["Review KPI data manually", "Check system logs"],
        generatedAt: new Date().toISOString(),
        error: "AI parsing failed, fallback insights provided"
      };
    }
    // Validate insights structure
    const requiredFields = ['strengths', 'opportunities', 'weaknesses', 'threats', 'staffPraise', 'staffCoaching', 'recommendations'];
    for (const field of requiredFields) {
      if (!Array.isArray(insights[field])) {
        insights[field] = [];
      }
    }
    if (!insights.generatedAt) {
      insights.generatedAt = new Date().toISOString();
    }
    // Log summary of insights
    console.log('✅ [AI] AI insights validation completed');
    console.log(`📈 [AI] Generated: strengths=${insights.strengths.length}, opportunities=${insights.opportunities.length}, recommendations=${insights.recommendations.length}`);
    if (insights.error) {
      console.warn('⚠️ [AI] Insights error:', insights.error);
    }
    return insights;
  } catch (error) {
    console.error('❌ [AI] Error generating AI insights:', error.message);
    console.error('Full error:', error);
    // Return fallback insights instead of throwing
    return {
      strengths: ["System is collecting data"],
      opportunities: ["Analyze performance trends"],
      weaknesses: ["AI analysis temporarily unavailable"],
      threats: ["System processing issues"],
      staffPraise: [],
      staffCoaching: [],
      recommendations: ["Review raw KPI data", "Contact system administrator"],
      generatedAt: new Date().toISOString(),
      error: `AI generation failed: ${error.message}`
    };
  }
}

module.exports = { generateInsights };
