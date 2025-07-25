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

  // Fetch last 3 archived SMS messages for this staff/period
  let lastMessagesText = '';
  let usedStrategiesText = '';
  try {
    // @ts-ignore
    const models = await import('../lib/models.js');
    const lastMessages: Array<{ coachingMessage: string }> = await models.CoachingSMSHistoryModel.find({
      staffName: performance.name,
      phoneNumber: config.phoneNumber,
      periodType
    }).sort({ sentAt: -1 }).limit(3).lean();
    if (lastMessages.length > 0) {
      lastMessagesText = '\n\nHere are the last 3 coaching SMS messages sent to this staff member for this period:';
      let usedStrategies: string[] = [];
      lastMessages.forEach((msg: { coachingMessage: string }, idx: number) => {
        lastMessagesText += `\nPrevious message #${idx + 1}: ${msg.coachingMessage}`;
        // Simple keyword extraction for strategies (expand as needed)
        const lower = msg.coachingMessage.toLowerCase();
        if (lower.includes('priming') || lower.includes('prime')) usedStrategies.push('priming');
        if (lower.includes('mention club') || lower.includes('seed club')) usedStrategies.push('mentioning or seeding club early');
        if (lower.includes('rapport')) usedStrategies.push('rapport building');
        if (lower.includes('assumptive')) usedStrategies.push('assumptive closing');
        if (lower.includes('farewell glass')) usedStrategies.push('farewell glass');
        if (lower.includes('value') || lower.includes('discount')) usedStrategies.push('emphasizing value/discounts');
        if (lower.includes('story') || lower.includes('storytelling')) usedStrategies.push('storytelling');
        if (lower.includes('flight')) usedStrategies.push('flight suggestion');
        if (lower.includes('review card')) usedStrategies.push('review card');
        if (lower.includes('personalize')) usedStrategies.push('personalization');
        // Add more as needed
      });
      if (usedStrategies.length > 0) {
        usedStrategiesText = '\n\nThe following strategies/tips have already been used recently: ' + Array.from(new Set(usedStrategies)).join(', ') + '. DO NOT use these again. Pick a new, unique strategy or tip.';
      }
    }
  } catch (err) {
    console.error('[DEBUG] Error fetching last 3 SMS messages for Claude prompt:', err);
  }

  const exampleMessage = `Hi {firstName}! 📊\n\n{PERIOD_LABEL} Performance:\n🍷 Wine Conversion: {wineConversion}% (Goal: 53%)\n👥 Club Conversion: {clubConversion}% (Goal: 6%)\n💰 Revenue: ${'{revenue}'}\n\nGreat job on exceeding your wine conversion goal! Your {wineConversion}% rate shows you're effectively guiding guests to bottle purchases. This skill is translating into solid revenue numbers for the month so far.\n\nHowever, there's an opportunity to boost your club conversion rate. You're currently at {clubConversion}%, which is below the 6% goal. Let's focus on improving this area:\n\n💡 Tip: Try the "priming" technique early in guest interactions. When introducing flight options, casually mention: "Oh, I love that you're interested in a flight. Many of these wines are favorites among our club members." This plants the seed for club membership and creates a natural segue to discuss benefits later in the tasting.\n\nRemember, club members often become our most loyal customers and best advocates. By improving your club conversion rate, you'll not only meet your goals but also cultivate long-term relationships that benefit both the guests and the vineyard.\n\nKeep up the excellent work with bottle sales, and let's see if we can bring that same magic to club sign-ups! 🌟🍷\n\nKeep up the great work! 🍷`;

  const prompt = `Staff member's KPIs:\n${JSON.stringify(performance, null, 2)}\n\nSALES & RAPPORT TECHNIQUES:\n${SALES_TECHNIQUES_TEXT}\n${lastMessagesText}\n${usedStrategiesText}\n
IMPORTANT FORMATTING & STYLE REQUIREMENTS:\n- Use a beautiful, friendly, supportive, and encouraging tone.\n- Use relevant emojis for wine, club, revenue, and encouragement.\n- Start with a friendly greeting using the staff member's first name and an emoji.\n- Show the performance metrics as a block with emojis (🍷, 👥, 💰), including goals.\n- Give a compliment, then a coaching tip, then an encouraging close, all with a positive, supportive tone.\n- Use section headers, bullet points, and clear formatting.\n- DO NOT repeat the same advice, strategy, or tip as the last 3 messages or the strategies listed above.\n- Keep the message concise, actionable, and motivating.\n\nEXAMPLE FORMAT (use as a template, but personalize for this staff member and their data):\n${exampleMessage}\n\nNow, write a personalized, actionable SMS to ${firstName}, referencing their performance and suggesting 2-3 specific things to try next shift.\n\nIMPORTANT REQUIREMENTS:\n1. Start with a genuine compliment about their performance\n2. ALWAYS include their specific metrics in the message: "Your wine bottle conversion rate is ${wineConversion}% (goal: 53%) and club conversion rate is ${clubConversion}% (goal: 6%)"\n3. Provide 2-3 specific, actionable coaching suggestions based on the techniques provided\n4. End with an encouraging compliment about their potential\n5. Be encouraging and motivating throughout\n6. Use their first name: ${firstName}\n7. Keep it conversational and supportive\n8. Make sure to mention both conversion rates and their goals in the message\n\nStructure: Compliment → Include both conversion rates with goals → Coaching → Compliment`;

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