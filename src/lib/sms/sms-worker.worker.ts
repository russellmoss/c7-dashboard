import { TwilioSmsService, baseDebug } from './base.js';
import fetch from 'node-fetch';

console.log('[DEBUG] baseDebug:', baseDebug);

let smsService: TwilioSmsService | null = null;

export function getSmsService(): TwilioSmsService {
  if (!smsService) {
    smsService = new TwilioSmsService();
  }
  return smsService;
}

export const sendSms = async (to: string, body: string): Promise<boolean> => {
  return getSmsService().sendSms(to, body);
};

// --- Claude API integration ---
const SALES_TECHNIQUES_TEXT = `TECHNIQUES TO SUGGEST IF BELOW GOAL (use as inspiration/guardrails, do not copy verbatim):
- For low bottle sales:
  1. Ask how they are enjoying the wine. If they like it, say: "Oh, great. I'll take note so we don't forget in case you want to take some home today."
  2. Remind guests that a tasting fee is waived for every 3 bottles purchased.
  3. Always ask for the sale, even with food/glass guests: "How was the chardonnay? Can I send you home with some?"
  4. Always try to sell bottles, no matter the experience. If a guest is having food and a bottle or glass, ask how the wine was and if you can send them home with wine.
  5. Use analogies to make wine concepts accessible: "Think of oak like a spice rack for wine" or "Acidity is like the zing in lemonade."
  6. Share compelling stories about specific wines - the vineyard, winemaking process, or family history to create emotional connections.
  7. Translate features into benefits: "This wine was hand-harvested (feature), which means only the best grapes were selected, giving you purer fruit flavors (benefit)."
  8. During mid-experience check-in, when a guest loves a wine, say: "That's a favorite here. I'll make a note that you liked it in case you want to revisit that thought later."
  9. Use assumptive closing: "Which of your favorites can I wrap up for you to take home?" instead of "Do you want to buy wine?"
  10. Mention helpful reminders: "You're buying 5 bottles - if you add one more, you get our half-case 5% discount" or "We're almost sold out of that vintage you loved."
  11. Suggest a farewell glass: "While we get your wines ready, would you like a final glass of your favorite to sip?"
  12. Strategic flight suggestions: Encourage flights over single glasses - guests who try multiple wines are more likely to find several they love and purchase.

- For low club sales:
  1. Prime for the club: "Oh, I love that you're doing a flight. A lot of the wines in this flight are favorites of our club members."
  2. Promote the social aspect: "Oh, you're local? I think you'd make a great addition to the club. It's mostly locals and we get together at least once a quarter to have parties."
  3. Accentuate the value: "You get discounts on wine and free tastings throughout the year and if you join today, all of your flights are waived."
  4. Make the big ask first: Always prime and ask for the club sale first. If they don't want it, ask for the bottle sale after.
  5. If someone buys more than 3 bottles: "Oh, you know if you join the club you'll get 10-15% off those bottles today and you'll get your flight fees waived. You just need to take home 4, 6 or 12 bottles today depending upon what tier is best for you."
  6. Plant seeds when taking the order: "As you're deciding on your tasting, I just wanted to mention our Wine Club. Members receive complimentary tastings and discounts on all purchases, including today."
  7. Personalize based on guest profile: For value seekers emphasize savings; for enthusiasts highlight exclusive wines; for locals mention pickup parties and events.
  8. Use the club brochure visually: "Let me show you our three tiers - Jumper, Grand Prix, and Triple Crown - so you can see which fits your wine enjoyment best."
  9. Connect their favorite wines to club benefits: "Since you loved the Reserve Cabernet Franc, our Grand Prix club would be perfect - you'd get it in your shipments plus 15% off starting today."
  10. Highlight immediate gratification: "If you join today, your discount applies to these bottles right now, and you can even take your first club shipment home with you."
  11. For Triple Crown tier: Mention exclusive perks like accommodation discounts, seasonal plate discounts, and reciprocal benefits at other Hudson Valley vineyards.
  12. Address hesitation proactively: "We ask for just 4 shipments minimum. Many members stay for years because of the value and exclusive wines."

- General rapport and sales techniques:
  1. Use open-ended questions: "What brings you to wine country today?" to understand their needs and tailor your approach.
  2. Practice positive profiling: Observe cues (are they taking photos? asking about scores? comparing prices?) to identify their guest type and adapt.
  3. Listen for buying signals: "This is delicious!" or "How much is this one?" are invitations to discuss purchase.
  4. Create surprise moments: Offer a complimentary taste of something special for celebrations or enthusiastic guests.
  5. Place your review card early: Put it on the table when introducing yourself to encourage positive feedback.
  6. Capture data naturally: "Can I email you your receipt? We'll also let you know about upcoming releases of the wines you enjoyed today."
`;

// Claude API call function (Anthropic)
export async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      max_tokens: 1024,
      temperature: 0.7,
      system: 'You are a wine sales coach. Use the provided techniques as inspiration, but do not copy verbatim.',
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }
  const data = await response.json();
  return (data as any).content?.[0]?.text || 'No response from Claude.';
}

// --- Coaching message generation logic using Claude ---
export async function generateCoachingMessage(
  performance: any,
  config: any,
  periodType: string
): Promise<string> {
  console.log('[DEBUG] generateCoachingMessage called with performance:', JSON.stringify(performance, null, 2));
  
  // Extract first name from staff member name
  const firstName = performance.name ? performance.name.split(' ')[0] : 'there';
  
  // Format conversion rates
  const wineConversion = typeof performance.wineBottleConversionRate === 'number' 
    ? performance.wineBottleConversionRate.toFixed(1) 
    : performance.wineBottleConversionRate;
  const clubConversion = typeof performance.clubConversionRate === 'number' 
    ? performance.clubConversionRate.toFixed(1) 
    : performance.clubConversionRate;
  
  console.log('[DEBUG] Formatted conversion rates - wine:', wineConversion, 'club:', clubConversion);
  
  const prompt = `Staff member's KPIs:
${JSON.stringify(performance, null, 2)}

SALES & RAPPORT TECHNIQUES:
${SALES_TECHNIQUES_TEXT}

Write a personalized, actionable SMS to ${firstName}, referencing their performance and suggesting 2-3 specific things to try next shift. 

IMPORTANT REQUIREMENTS:
1. Start with a genuine compliment about their performance
2. ALWAYS include their specific metrics in the message: "Your wine bottle conversion rate is ${wineConversion}% (goal: 53%) and club conversion rate is ${clubConversion}% (goal: 6%)"
3. Provide 2-3 specific, actionable coaching suggestions based on the techniques provided
4. End with an encouraging compliment about their potential
5. Be encouraging and motivating throughout
6. Use their first name: ${firstName}
7. Keep it conversational and supportive
8. Make sure to mention both conversion rates and their goals in the message

Structure: Compliment → Include both conversion rates with goals → Coaching → Compliment`;
  
  console.log('[DEBUG] Sending prompt to Claude:', prompt);
  const response = await callClaude(prompt);
  console.log('[DEBUG] Claude response:', response);
  return response;
}

function buildMetricsString(performance: any, config: any): string {
  let metrics = [];
  metrics.push(`🍷 Wine Conversion: ${typeof performance.wineBottleConversionRate === 'number' ? performance.wineBottleConversionRate.toFixed(1) : performance.wineBottleConversionRate}%`);
  metrics.push(`👥 Club Conversion: ${typeof performance.clubConversionRate === 'number' ? performance.clubConversionRate.toFixed(1) : performance.clubConversionRate}%`);
  metrics.push(`💰 Revenue: $${performance.revenue.toLocaleString()}`);
  return metrics.join('\n');
} 