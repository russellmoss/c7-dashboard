import { TwilioSmsService, baseDebug } from "./base";
import fetch from "node-fetch";

console.log("[DEBUG] baseDebug:", baseDebug);

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
  1. Prime for the club: "Oh, I love that you're doing a flight. A lot of the wines in this flight are favorites of our club members." 📺 Training Video: https://youtu.be/gKO-9_rO2vw
  2. Promote the social aspect: "Oh, you're local? I think you'd make a great addition to the club. It's mostly locals and we get together at least once a quarter to have parties." 📺 Training Video: https://youtu.be/ZieaDYwZCqc
  3. Accentuate the value: "You get discounts on wine and free tastings throughout the year and if you join today, all of your flights are waived." 📺 Training Video: https://youtu.be/99BxSWpLvM8
  4. Make the big ask first: Always prime and ask for the club sale first. If they don't want it, ask for the bottle sale after. 📺 Training Video: https://youtu.be/Dda-anb9mo0
  5. If someone buys more than 3 bottles: "Oh, you know if you join the club you'll get 10-15% off those bottles today and you'll get your flight fees waived. You just need to take home 4, 6 or 12 bottles today depending upon what tier is best for you." 📺 Training Video: https://youtu.be/S9ZBp7pRrII
  6. Plant seeds when taking the order: "As you're deciding on your tasting, I just wanted to mention our Wine Club. Members receive complimentary tastings and discounts on all purchases, including today." 📺 Training Video: https://youtu.be/cE5sfFjTe7Y
  7. Personalize based on guest profile: For value seekers emphasize savings; for enthusiasts highlight exclusive wines; for locals mention pickup parties and events. 📺 Training Video: https://youtu.be/HEfc4N7jV18
  8. Use the club brochure visually: "Let me show you our three tiers - Jumper, Grand Prix, and Triple Crown - so you can see which fits your wine enjoyment best." 📺 Training Video: https://youtu.be/PkbHBowCsaU
  9. Connect their favorite wines to club benefits: "Since you loved the Reserve Cabernet Franc, our Grand Prix club would be perfect - you'd get it in your shipments plus 15% off starting today." 📺 Training Video: https://youtu.be/T7A4Qj0ntos
  10. Highlight immediate gratification: "If you join today, your discount applies to these bottles right now, and you can even take your first club shipment home with you." 📺 Training Video: https://youtu.be/KPGlWwxrK8Y
  11. For Triple Crown tier: Mention exclusive perks like accommodation discounts, seasonal plate discounts, and reciprocal benefits at other Hudson Valley vineyards. 📺 Training Video: https://youtu.be/SDVnH2pWTCE
  12. Address hesitation proactively: "We ask for just 4 shipments minimum. Many members stay for years because of the value and exclusive wines." 📺 Training Video: https://youtu.be/f0mo4HJN2aQ

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
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      temperature: 0.7,
      system:
        "You are a wine sales coach. You MUST ONLY use the specific techniques and strategies provided in the prompt. DO NOT invent, create, or hallucinate any new sales techniques, wine names, club benefits, winery history, or experiences that are not explicitly listed in the provided techniques. Stick strictly to the techniques provided and adapt them to the specific situation, but do not add new information.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }
  const data = await response.json();
  return (data as any).content?.[0]?.text || "No response from Claude.";
}

// --- Coaching message generation logic using Claude ---
export async function generateCoachingMessage(
  performance: any,
  config: any,
  periodType: string,
  personalizedGoals?: any,
): Promise<string> {
  console.log(
    "[DEBUG] generateCoachingMessage called with performance:",
    JSON.stringify(performance, null, 2),
  );

  // Extract first name from staff member name
  const firstName = performance.name ? performance.name.split(" ")[0] : "there";

  // Format conversion rates
  const wineConversion =
    typeof performance.wineBottleConversionRate === "number"
      ? performance.wineBottleConversionRate.toFixed(1)
      : performance.wineBottleConversionRate;
  const clubConversion =
    typeof performance.clubConversionRate === "number"
      ? performance.clubConversionRate.toFixed(1)
      : performance.clubConversionRate;

  // Fetch last 3 archived SMS messages for this staff/period
  let lastMessagesText = "";
  let usedStrategiesText = "";
  try {
    // @ts-ignore
    const models = await import(process.env.NODE_ENV === 'production' ? "../models-cjs.cjs" : "../models");
    const lastMessages: Array<{ coachingMessage: string }> =
      await models.CoachingSMSHistoryModel.find({
        staffName: performance.name,
        phoneNumber: config.phoneNumber,
        periodType,
      })
        .sort({ sentAt: -1 })
        .limit(3)
        .lean();
    if (lastMessages.length > 0) {
      lastMessagesText =
        "\n\nHere are the last 3 coaching SMS messages sent to this staff member for this period:";
      let usedStrategies: string[] = [];
      lastMessages.forEach((msg: { coachingMessage: string }, idx: number) => {
        lastMessagesText += `\nPrevious message #${idx + 1}: ${msg.coachingMessage}`;
        // Simple keyword extraction for strategies (expand as needed)
        const lower = msg.coachingMessage.toLowerCase();
        if (lower.includes("priming") || lower.includes("prime"))
          usedStrategies.push("priming");
        if (lower.includes("mention club") || lower.includes("seed club"))
          usedStrategies.push("mentioning or seeding club early");
        if (lower.includes("rapport")) usedStrategies.push("rapport building");
        if (lower.includes("assumptive"))
          usedStrategies.push("assumptive closing");
        if (lower.includes("farewell glass"))
          usedStrategies.push("farewell glass");
        if (lower.includes("value") || lower.includes("discount"))
          usedStrategies.push("emphasizing value/discounts");
        if (lower.includes("story") || lower.includes("storytelling"))
          usedStrategies.push("storytelling");
        if (lower.includes("flight")) usedStrategies.push("flight suggestion");
        if (lower.includes("review card")) usedStrategies.push("review card");
        if (lower.includes("personalize"))
          usedStrategies.push("personalization");
        // Add more as needed
      });
      if (usedStrategies.length > 0) {
        usedStrategiesText =
          "\n\nThe following strategies/tips have already been used recently: " +
          Array.from(new Set(usedStrategies)).join(", ") +
          ". DO NOT use these again. Pick a new, unique strategy or tip.";
      }
    }
  } catch (err) {
    console.error(
      "[DEBUG] Error fetching last 3 SMS messages for Claude prompt:",
      err,
    );
  }

  const exampleMessage = `Hi {firstName}! 📊\n\n{PERIOD_LABEL} Performance:\n🍷 Wine Conversion: {wineConversion}% (Company Goal: 53%)\n👥 Club Conversion: {clubConversion}% (Company Goal: 6%)\n💰 Revenue: ${"{revenue}"}\n\n💡 Hi {firstName}! 🍇\n\nLet's review your Month-to-Date performance:\n\n🍷 Wine Conversion: {wineConversion}% (Company Goal: 53%)\n👥 Club Conversion: {clubConversion}% (Company Goal: 6%)\n💰 Revenue: ${"{revenue}"}\n\nExcellent work on your wine conversion rate! You're exceeding the company goal, which shows in your strong revenue numbers. Your skill in guiding guests to bottle purchases is evident.\n\nHowever, there's a significant opportunity to improve your club conversion rate. You're currently at {clubConversion}%, which is well below the 6% company goal. Let's focus on boosting this area:\n\nTip: Try the "value stack" approach when discussing the wine club. After a guest has enjoyed multiple wines, say something like:\n\n"I'm thrilled you've found several wines you love today. Many guests in your position find our wine club to be an incredible value. As a member, you'd get:\n1. 15% off all these bottles today\n2. Complimentary tastings on future visits\n3. First access to limited releases\n4. Invitations to exclusive member events\n\nWhich of these benefits sounds most appealing to you?"\n\nThis method presents the club as a solution to their enjoyment, highlighting multiple tangible benefits. It also engages the guest in a conversation about which aspects of the club they find most valuable.\n\nKeep up the fantastic work with bottle sales, and let's bring that same excellence to club sign-ups! 🌟🍷`;



  const prompt = `Staff member's KPIs:\n${JSON.stringify(performance, null, 2)}\n\nPersonal Goals: ${personalizedGoals ? JSON.stringify(personalizedGoals, null, 2) : "None set"}\n\nSALES & RAPPORT TECHNIQUES:\n${SALES_TECHNIQUES_TEXT}\n${lastMessagesText}\n${usedStrategiesText}\n
CRITICAL RESTRICTIONS - READ CAREFULLY:\n- You MUST ONLY use the specific techniques listed above in the SALES & RAPPORT TECHNIQUES section.\n- DO NOT invent, create, or hallucinate any new sales techniques, strategies, or approaches.\n- DO NOT invent wine names, varietals, or specific wines not mentioned in the techniques.\n- DO NOT invent club benefits, discounts, or membership details not explicitly listed.\n- DO NOT invent winery history, stories, or experiences not provided.\n- DO NOT invent new guest interactions or scenarios.\n- You can adapt and personalize the provided techniques, but you cannot add new information.\n- If you need to reference specific techniques, only use those from the SALES & RAPPORT TECHNIQUES section above.\n\nIMPORTANT FORMATTING & STYLE REQUIREMENTS:\n- Use a beautiful, friendly, supportive, and encouraging tone.\n- Use relevant emojis for wine, club, revenue, and encouragement.\n- Start with a friendly greeting using the staff member's first name and an emoji.\n- Show the performance metrics as a block with emojis (🍷, 👥, 💰), including BOTH company goals (53% wine, 6% club) AND personal goals if set.\n- Give a compliment, then a coaching tip, then an encouraging close, all with a positive, supportive tone.\n- Use section headers, bullet points, and clear formatting.\n- DO NOT repeat the same advice, strategy, or tip as the last 3 messages or the strategies listed above.\n- Keep the message concise, actionable, and motivating.\n- DO NOT sign off like a manager - end naturally without "Keep up the great work!" or similar manager-style closings.\n\nEXAMPLE FORMAT (use as a template, but personalize for this staff member and their data):\n${exampleMessage}\n\nNow, write a personalized, actionable SMS to ${firstName}, referencing their performance and suggesting 2-3 specific things to try next shift.\n\nIMPORTANT REQUIREMENTS:\n1. Start with a genuine compliment about their performance\n2. ALWAYS include their specific metrics in the message: "Your wine bottle conversion rate is ${wineConversion}% (company goal: 53%) and club conversion rate is ${clubConversion}% (company goal: 6%)"\n3. If personal goals are set, mention them alongside company goals: "Your personal goal is X% and you're at Y%"\n4. Provide 2-3 specific, actionable coaching suggestions based ONLY on the techniques provided above\n5. End naturally without manager-style sign-offs\n6. Be encouraging and motivating throughout\n7. Use their first name: ${firstName}\n8. Keep it conversational and supportive\n9. Make sure to mention both conversion rates and their goals in the message\n10. Include AOV if available in performance data - AOV should be displayed as dollars (e.g., $113.44), NOT as a percentage\n11. REMEMBER: Only use techniques from the SALES & RAPPORT TECHNIQUES section - do not invent new ones\n12. CRITICAL: When suggesting club conversion techniques, ALWAYS include the corresponding YouTube training video link from the technique description. For example, if suggesting "Prime for the club", include: "📺 Watch this training video: https://youtu.be/gKO-9_rO2vw"\n13. ALWAYS include the YouTube video link when recommending any club sales technique - this helps staff learn the technique properly\n\nStructure: Compliment → Include both conversion rates with company AND personal goals → Coaching → Natural ending`;

  console.log("[DEBUG] Sending prompt to Claude:", prompt);
  const response = await callClaude(prompt);
  console.log("[DEBUG] Claude response:", response);
  return response;
}


