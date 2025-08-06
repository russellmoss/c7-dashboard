import { callClaude } from './sms-worker.worker';
import { COMPANY_GOALS } from '../config/company-goals';

// Helper functions for enhanced admin coaching
async function callClaudeWithRetry(
  prompt: string, 
  maxRetries: number = 2
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000 * attempt)); // Exponential backoff
      }
      
      const response = await callClaude(prompt);
      return response;
      
    } catch (error) {
      console.error(`[Admin Coaching] Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
     throw new Error('Failed after all retry attempts');
 }

 function splitMessage(message: string, maxLength: number): string[] {
   const messages: string[] = [];
   const lines = message.split('\n');
   let currentMessage = '';
   
   for (const line of lines) {
     // If adding this line would exceed the limit, start a new message
     if (currentMessage.length + line.length + 1 > maxLength && currentMessage.length > 0) {
       messages.push(currentMessage.trim());
       currentMessage = line;
     } else {
       currentMessage += (currentMessage ? '\n' : '') + line;
     }
   }
   
   // Add the last message if it has content
   if (currentMessage.trim()) {
     messages.push(currentMessage.trim());
   }
   
   return messages;
 }

 function validateAdminMessage(message: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
     // Check length
   if (message.length > 1000) {
     issues.push(`Message too long: ${message.length} chars (max 1000)`);
   }
  
  // Check for critical metrics
  if (!message.includes('%')) {
    issues.push('Missing conversion rate metrics');
  }
  
  if (!message.includes('$')) {
    issues.push('Missing financial metrics');
  }
  
  // Check for actionable content
  const actionWords = ['focus', 'action', 'improve', 'train', 'review', 'pair', 'coach', 'praise', 'congratulate'];
  const hasAction = actionWords.some(word => 
    message.toLowerCase().includes(word)
  );
  
  if (!hasAction) {
    issues.push('Missing actionable recommendations');
  }
  
  // Check for performance mentions
  const performanceWords = ['top', 'best', 'excellent', 'great', 'outstanding'];
  const hasPerformance = performanceWords.some(word => 
    message.toLowerCase().includes(word)
  );
  
  if (!hasPerformance) {
    issues.push('Missing performance recognition');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// Debug mode for troubleshooting
const DEBUG_MODE = process.env.NODE_ENV === 'development' || 
                   process.env.DEBUG_ADMIN_SMS === 'true';

interface AdminCoachingConfig {
  includeTeamMetrics: boolean;
  includeTopPerformers: boolean;
  includeBottomPerformers: boolean;
  includeGoalComparison: boolean;
  includeManagementTips: boolean;
}

export async function generateAdminCoachingMessage(
  adminName: string,
  kpiData: any,
  periodType: string,
  staffMembers: string[],
  config: AdminCoachingConfig,
  dashboardConfig?: {
    periodType: string;
    frequency: string;
    timeEST: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    weekOfMonth?: number;
    monthOfQuarter?: number;
    isActive: boolean;
  }
): Promise<string> {
  // Log config for debugging (unused but kept for future use)
  console.log('[Admin Coaching Debug] Config:', config);
  if (dashboardConfig) {
    console.log('[Admin Coaching Debug] Dashboard config:', dashboardConfig);
  }
  try {
    console.log(`[Admin Coaching] Generating message for ${adminName}, period: ${periodType}`);
    
    // Validate inputs
    if (!adminName || !kpiData || !periodType || !staffMembers || !config) {
      throw new Error('Missing required parameters for admin coaching message generation');
    }
    
    // Extract basic metrics from KPI data
    // Handle both cases: kpiData.data.current (from background worker) and kpiData.current (from API)
    let overallMetrics = kpiData.data?.current?.overallMetrics || kpiData.current?.overallMetrics;
    let associatePerformance = kpiData.data?.current?.associatePerformance || kpiData.current?.associatePerformance;
    
    // Additional fallback for different data structures
    if (!overallMetrics && kpiData.data?.overallMetrics) {
      overallMetrics = kpiData.data.overallMetrics;
    }
    if (!associatePerformance && kpiData.data?.associatePerformance) {
      associatePerformance = kpiData.data.associatePerformance;
    }
    
    // Handle the case where kpiData is the database document with data nested
    if (!overallMetrics && kpiData.data?.current?.overallMetrics) {
      overallMetrics = kpiData.data.current.overallMetrics;
    }
    if (!associatePerformance && kpiData.data?.current?.associatePerformance) {
      associatePerformance = kpiData.data.current.associatePerformance;
    }
    
    // Final fallback - try to get data directly from kpiData
    if (!overallMetrics && kpiData.overallMetrics) {
      overallMetrics = kpiData.overallMetrics;
    }
    if (!associatePerformance && kpiData.associatePerformance) {
      associatePerformance = kpiData.associatePerformance;
    }
    
    // Debug logging if enabled
    if (DEBUG_MODE) {
      console.log('[Admin Coaching Debug] Full KPI data:', JSON.stringify(kpiData, null, 2));
      console.log('[Admin Coaching Debug] Admin name:', adminName);
      console.log('[Admin Coaching Debug] Period type:', periodType);
      console.log('[Admin Coaching Debug] Overall metrics:', overallMetrics);
      console.log('[Admin Coaching Debug] Associate performance:', associatePerformance);
    }
    
    // Always log the data structure for debugging
    console.log('[Admin Coaching Debug] kpiData structure:', {
      hasData: !!kpiData.data,
      hasCurrent: !!kpiData.current,
      hasDataCurrent: !!kpiData.data?.current,
      hasOverallMetrics: !!overallMetrics,
      hasAssociatePerformance: !!associatePerformance,
      overallMetricsKeys: overallMetrics ? Object.keys(overallMetrics) : 'N/A',
      associatePerformanceKeys: associatePerformance ? Object.keys(associatePerformance) : 'N/A'
    });
    
    // Additional debugging to see the exact data
    console.log('[Admin Coaching Debug] kpiData.data:', kpiData.data);
    console.log('[Admin Coaching Debug] kpiData.current:', kpiData.current);
    console.log('[Admin Coaching Debug] kpiData.data?.current:', kpiData.data?.current);
    console.log('[Admin Coaching Debug] overallMetrics:', overallMetrics);
    console.log('[Admin Coaching Debug] associatePerformance:', associatePerformance);
    
    // More detailed debugging
    console.log('[Admin Coaching Debug] kpiData type:', typeof kpiData);
    console.log('[Admin Coaching Debug] kpiData keys:', Object.keys(kpiData || {}));
    console.log('[Admin Coaching Debug] kpiData.data type:', typeof kpiData.data);
    console.log('[Admin Coaching Debug] kpiData.data keys:', kpiData.data ? Object.keys(kpiData.data) : 'N/A');
    console.log('[Admin Coaching Debug] kpiData.data?.current type:', typeof kpiData.data?.current);
    console.log('[Admin Coaching Debug] kpiData.data?.current keys:', kpiData.data?.current ? Object.keys(kpiData.data.current) : 'N/A');
    
    // Check if the data is actually there but in a different structure
    console.log('[Admin Coaching Debug] kpiData.data?.current?.overallMetrics exists:', !!kpiData.data?.current?.overallMetrics);
    console.log('[Admin Coaching Debug] kpiData.data?.current?.associatePerformance exists:', !!kpiData.data?.current?.associatePerformance);
    console.log('[Admin Coaching Debug] kpiData.current?.overallMetrics exists:', !!kpiData.current?.overallMetrics);
    console.log('[Admin Coaching Debug] kpiData.current?.associatePerformance exists:', !!kpiData.current?.associatePerformance);
    
    if (!overallMetrics || !associatePerformance) {
      console.warn('[Admin Coaching] Missing KPI data structure');
      console.warn('[Admin Coaching] overallMetrics:', !!overallMetrics);
      console.warn('[Admin Coaching] associatePerformance:', !!associatePerformance);
      console.warn('[Admin Coaching] Falling back to generateFallbackMessage');
      return generateFallbackMessage(adminName, periodType, overallMetrics, associatePerformance);
    }
    
    console.log('[Admin Coaching Debug] Proceeding with main filtering logic');
    
    // Get team metrics from overall data
    const teamMetrics = {
      revenue: overallMetrics.totalRevenue || 0,
      bottleConversion: overallMetrics.wineBottleConversionRate || 0,
      clubConversion: overallMetrics.clubConversionRate || 0,
      aov: overallMetrics.avgOrderValue || 0
    };
    
    // Calculate gaps to goals for actionable insights (used for debugging)
    const teamGaps = {
      bottleGap: Math.max(0, COMPANY_GOALS.bottleConversion - teamMetrics.bottleConversion),
      clubGap: Math.max(0, COMPANY_GOALS.clubConversion - teamMetrics.clubConversion),
      aovGap: Math.max(0, COMPANY_GOALS.aov - teamMetrics.aov)
    };
    
    // Log critical focus for debugging (unused but kept for future use)
    const criticalFocus = 
      teamGaps.clubGap > 2 ? "URGENT: Focus on club conversions" :
      teamGaps.bottleGap > 5 ? "Priority: Improve bottle sales" :
      teamGaps.aovGap > 20 ? "Focus: Increase average order value" :
      "Maintain performance";
    
    console.log('[Admin Coaching Debug] Critical focus:', criticalFocus);
    
    // Filter and analyze individual employee performance (ENHANCED FILTERING)
    console.log('[Admin Coaching Debug] Raw associate performance data:', Object.keys(associatePerformance));
    console.log('[Admin Coaching Debug] Active staff members for filtering:', staffMembers);
    
         const employeeAnalysis = Object.entries(associatePerformance)
       .filter(([name, data]: [string, any]) => {
         const bottleConv = data.wineBottleConversionRate || 0;
         const clubConv = data.clubConversionRate || 0;
         const isAdmin = data.isAdmin === true || data.admin === true || name === adminName;
         const hasOrders = (data.orders || 0) > 0;
         
         console.log(`[Admin Coaching Debug] Checking ${name}: bottleConv=${bottleConv}%, clubConv=${clubConv}%, isAdmin=${isAdmin}, hasOrders=${hasOrders}`);
         
         // Exclude admins (including the current admin and any other admin users)
         if (isAdmin) {
           console.log(`[Admin Coaching Debug] Excluding ${name}: isAdmin=true`);
           return false;
         }
         
         // NEW: Only include staff members who are selected in the subscription's SMS coaching staff list
         // This ensures we only report on active staff members who are still with the company
         const isSelectedStaff = staffMembers.some(staff => {
           const staffLower = staff.toLowerCase();
           const nameLower = name.toLowerCase();
           return staffLower === nameLower || 
                  staffLower.includes(nameLower) ||
                  nameLower.includes(staffLower);
         });
         
         if (!isSelectedStaff) {
           console.log(`[Admin Coaching Debug] Excluding ${name}: not found in selected staff members`);
           return false;
         }
         
         console.log(`[Admin Coaching Debug] Including ${name}: found in selected staff members`);
        
        // Exclude employees with no orders
        if (!hasOrders) {
          console.log(`[Admin Coaching Debug] Excluding ${name}: no orders`);
          return false;
        }
        
        // Exclude unrealistic bottle conversion rates (>75% is not real)
        if (bottleConv > 75) {
          console.log(`[Admin Coaching Debug] Excluding ${name}: bottleConv ${bottleConv}% > 75% threshold`);
          return false;
        }
        
        // Exclude unrealistic club conversion rates (>13% is not real)
        if (clubConv > 13) {
          console.log(`[Admin Coaching Debug] Excluding ${name}: clubConv ${clubConv}% > 13% threshold`);
          return false;
        }
        
        // Exclude extremely low performers for coaching recommendations
        if (bottleConv < 25 || clubConv < 0.2) {
          console.log(`[Admin Coaching Debug] Excluding ${name}: too low (bottleConv=${bottleConv}%, clubConv=${clubConv}%)`);
          return false;
        }
        
        console.log(`[Admin Coaching Debug] Including ${name}: passed all filters`);
        return true;
      })
      .map(([name, data]: [string, any]) => ({
        name,
        bottleConversion: data.wineBottleConversionRate || 0,
        clubConversion: data.clubConversionRate || 0,
        aov: data.aov || 0,
        totalRevenue: data.revenue || 0,
        orders: data.orders || 0
      }))
      .sort((a, b) => (b.bottleConversion + b.clubConversion) - (a.bottleConversion + a.clubConversion));

    // Get top performers for bottle conversion (excluding unrealistic rates)
    const topBottlePerformers = employeeAnalysis
      .filter(emp => emp.bottleConversion > 0 && emp.bottleConversion <= 75)
      .sort((a, b) => b.bottleConversion - a.bottleConversion)
      .slice(0, 2);

    // Get top performers for club conversion (excluding unrealistic rates)
    const topClubPerformers = employeeAnalysis
      .filter(emp => {
        const isValid = emp.clubConversion > 0 && emp.clubConversion <= 13 && emp.clubConversion !== 'n/a';
        if (!isValid && emp.clubConversion > 13) {
          console.log(`[Admin Coaching Debug] Excluding ${emp.name} from club performers: ${emp.clubConversion}% > 13% threshold`);
        }
        return isValid;
      })
      .sort((a, b) => b.clubConversion - a.clubConversion)
      .slice(0, 2);

    // Get bottom performers for coaching (excluding extremely low performers)
    const bottomPerformers = employeeAnalysis
      .filter(emp => (emp.bottleConversion >= 25 && emp.bottleConversion < 50) || (emp.clubConversion >= 0.2 && emp.clubConversion < 3))
      .sort((a, b) => (a.bottleConversion + a.clubConversion) - (b.bottleConversion + b.clubConversion))
      .slice(0, 2);

    // Debug logging for filtered staff
    console.log('[Admin Coaching Debug] Final filtered staff count:', employeeAnalysis.length);
    console.log('[Admin Coaching Debug] Final filtered staff:', employeeAnalysis.map(emp => `${emp.name}: ${emp.bottleConversion}% bottles, ${emp.clubConversion}% club`));
    console.log('[Admin Coaching Debug] Top bottle performers:', topBottlePerformers.map(emp => `${emp.name}: ${emp.bottleConversion}%`));
    console.log('[Admin Coaching Debug] Top club performers:', topClubPerformers.map(emp => `${emp.name}: ${emp.clubConversion}%`));
    console.log('[Admin Coaching Debug] Bottom performers:', bottomPerformers.map(emp => `${emp.name}: ${emp.bottleConversion}% bottles, ${emp.clubConversion}% club`));

    // Get trending data for enhanced insights (simplified to avoid import issues)
    let trendingData = '';

    // Build comprehensive prompt for manager coaching (DIRECT FORMAT)
    const prompt = `You are a business management system. Generate a direct SMS message for ${adminName}.

CRITICAL: The message MUST start exactly with these words: "Here are your current ${periodType.toUpperCase()} stats:"

DO NOT add any introduction, preamble, or self-reference. DO NOT say "coaching tips" or similar phrases.

FORMAT THE MESSAGE EXACTLY LIKE THIS:

Here are your current ${periodType.toUpperCase()} stats:
Revenue: $${Math.round(teamMetrics.revenue).toLocaleString()}
Bottle Conversion: ${teamMetrics.bottleConversion.toFixed(1)}% (Goal: 53%)
Club Conversion: ${teamMetrics.clubConversion.toFixed(1)}% (Goal: 6%)
AOV: $${teamMetrics.aov.toFixed(0)} (Goal: $140)${trendingData}

TOP PERFORMERS:
${topBottlePerformers.map((emp: any) => `- ${emp.name}: ${emp.bottleConversion.toFixed(1)}% bottles`).join('\n')}
${topClubPerformers.map((emp: any) => `- ${emp.name}: ${emp.clubConversion.toFixed(1)}% club`).join('\n')}
${employeeAnalysis.sort((a, b) => b.aov - a.aov).slice(0, 2).map((emp: any) => `- ${emp.name}: $${emp.aov.toFixed(0)} AOV`).join('\n')}

COACHING OPPORTUNITIES:
${bottomPerformers.map((emp: any) => `- ${emp.name}: ${emp.bottleConversion.toFixed(1)}% bottles, ${emp.clubConversion.toFixed(1)}% club, $${emp.aov.toFixed(0)} AOV`).join('\n')}

Then provide 2-3 specific coaching actions for the struggling employees.

Keep under 1000 characters. Start immediately with the stats - no other text.`;

    // Add rate limiting to prevent API overload
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('[Admin Coaching] Calling Claude API with enhanced prompt...');
    console.log(`[Admin Coaching] Prompt length: ${prompt.length} characters`);
    
    // Debug logging for prompt
    if (DEBUG_MODE) {
      console.log('[Admin Coaching Debug] Prompt:', prompt);
    }
    
         // Call Claude with retry logic
     const message = await callClaudeWithRetry(prompt);
     
     // Post-process to ensure correct format
     let finalMessage = message;
     
     // Remove any unwanted preamble
     const expectedStart = `Here are your current ${periodType.toUpperCase()} stats:`;
     if (!finalMessage.startsWith(expectedStart)) {
       // Find where the actual stats start
       const statsIndex = finalMessage.indexOf(expectedStart);
       if (statsIndex !== -1) {
         finalMessage = finalMessage.substring(statsIndex);
       } else {
         // If we can't find the expected start, create a clean version
         finalMessage = `${expectedStart}\n${finalMessage}`;
       }
     }
     
     // Remove any self-referential text
     finalMessage = finalMessage.replace(/Here are some coaching tips.*?:\s*/gi, '');
     finalMessage = finalMessage.replace(/staying under \d+ characters.*?:\s*/gi, '');
     finalMessage = finalMessage.replace(/using only the techniques provided.*?:\s*/gi, '');
     
     // Split message if it's too long (SMS limit is ~160 chars, but we'll use 150 to be safe)
     const maxSmsLength = 150;
     if (finalMessage.length > maxSmsLength) {
       const messages = splitMessage(finalMessage, maxSmsLength);
       console.log(`[Admin Coaching] Message split into ${messages.length} parts`);
       return messages.join('\n\n---\n\n');
     }
     
     // Ensure it doesn't exceed SMS limits
     finalMessage = finalMessage.slice(0, 1000);
    
    // Validate the message
    const validation = validateAdminMessage(finalMessage);
    if (!validation.isValid) {
      console.warn('[Admin Coaching] Message validation issues:', validation.issues);
    }
    
    console.log(`[Admin Coaching] Generated message (${finalMessage.length} chars)`);
    return finalMessage;
    
  } catch (error) {
    console.error('[Admin Coaching] Error generating admin coaching:', error);
    return generateFallbackMessage(adminName, periodType, kpiData?.data?.current?.overallMetrics || kpiData?.current?.overallMetrics, kpiData?.data?.current?.associatePerformance || kpiData?.current?.associatePerformance);
  }
}

function generateFallbackMessage(
  adminName: string, 
  periodType: string, 
  metrics?: any,
  associatePerformance?: any
): string {
  console.log('[Admin Coaching Debug] Using generateFallbackMessage');
  if (metrics) {
    // Calculate gaps for coaching focus (used in the logic below)
    const bottleGap = COMPANY_GOALS.bottleConversion - (metrics.wineBottleConversionRate || 0);
    const clubGap = COMPANY_GOALS.clubConversion - (metrics.clubConversionRate || 0);
    const aovGap = COMPANY_GOALS.aov - (metrics.avgOrderValue || 0);
    
         let message = `Here are your current ${periodType.toUpperCase()} stats:\n`;
     message += `Revenue: $${Math.round(metrics.totalRevenue || 0).toLocaleString()}\n`;
     message += `Bottle Conversion: ${(metrics.wineBottleConversionRate || 0).toFixed(1)}% (Goal: 53%)\n`;
     message += `Club Conversion: ${(metrics.clubConversionRate || 0).toFixed(1)}% (Goal: 6%)\n`;
     message += `AOV: $${(metrics.avgOrderValue || 0).toFixed(0)} (Goal: $140)\n\n`;
    
    // Add performance highlights if available
    if (associatePerformance) {
      const topPerformers = Object.entries(associatePerformance)
        .filter(([name, data]: [string, any]) => {
          const bottleConv = data.wineBottleConversionRate || 0;
          const clubConv = data.clubConversionRate || 0;
          return bottleConv > 50 || clubConv > 5;
        })
        .sort((a, b) => {
          const aScore = (a[1] as any).wineBottleConversionRate + (a[1] as any).clubConversionRate;
          const bScore = (b[1] as any).wineBottleConversionRate + (b[1] as any).clubConversionRate;
          return bScore - aScore;
        })
        .slice(0, 2);
      
             if (topPerformers.length > 0) {
         message += `TOP PERFORMERS:\n`;
         topPerformers.forEach(([name, data]: [string, any]) => {
           message += `- ${name}: ${(data as any).wineBottleConversionRate?.toFixed(1) || 0}% bottles, ${(data as any).clubConversionRate?.toFixed(1) || 0}% club\n`;
         });
         message += `\n`;
       }
    }
    
         // Add specific action based on biggest gap
     if (clubGap > 2) {
       message += `COACHING FOCUS: Club sign-ups during tastings`;
     } else if (bottleGap > 5) {
       message += `COACHING FOCUS: Bottle sales techniques`;
     } else if (aovGap > 20) {
       message += `COACHING FOCUS: Upselling premium wines`;
     } else {
       message += `Maintain current strategies.`;
     }
    
         return message.slice(0, 1000); // Ensure under limit
  }
  
  return `${adminName}, team data unavailable for ${periodType.toUpperCase()}. Check dashboard.`;
} 