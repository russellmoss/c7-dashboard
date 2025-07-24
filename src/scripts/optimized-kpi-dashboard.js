// ===================================================================================
// Commerce7 KPI Master Script for Milea Estate Vineyard (Performance Optimized + MongoDB Integration)
//
// This version merges the gold standard logic from the root script with MongoDB integration.
// ===================================================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
const axios = require('axios');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const mongoose = require('mongoose');
const { connectToDatabase } = require('../lib/mongodb-cjs.js');
const { KPIDataModel } = require('../lib/models-cjs.js');
const ai = require('../lib/ai-insights-cjs.js');
const generateInsights = ai.generateInsights;

// --- (All gold standard config, helpers, and logic from root optimized-kpi-dashboard.js) ---
//region Configuration
const { C7_APP_ID, C7_API_KEY, C7_TENANT_ID } = process.env;
const BASE_URL = 'https://api.commerce7.com/v1';
const API_LIMIT = 50;
const MAX_PAGES = Infinity;
const MAX_RETRIES = 3;
const API_DELAY_MS = 2000;
const GUEST_PRODUCT_IDS = {
    'fe778da9-5164-4688-acd2-98d044d7ce84': 'Non-Club Guest',
    '75d4f6cf-cf69-4e76-8f3b-bb35cc7ddeb3': 'Club Member',
    '718b9fbb-4e23-48c7-8b2d-da86d2624b36': 'Trade Guest'
};
const WINE_BOTTLE_DEPARTMENT_ID = '7f3a16cc-62b3-4625-b995-e4a3af41e441';
const TASTING_DEPARTMENT_ID = '8571508b-bcfe-4d96-b12d-0a2b941bc3f1';
const DINING_DEPARTMENT_ID = '3b4ae488-af0a-4f72-955e-571dfabea081';
const WINE_BY_THE_GLASS_DEPARTMENT_ID = 'b95fae3f-7671-47ea-82f6-617a7ce4b826';
const CLUB_NAMES = {
    "2ba4f45e-51b9-45af-ab34-6162b9383948": "Jumper Club",
    "a708a00a-2bd6-4f5d-9ce6-e1e37b107808": "Grand Prix Club",
    "0a2dbd7e-656c-4cb9-a0c7-146187fccefe": "Triple Crown Club"
};
const PERFORMANCE_GOALS = {
    wineBottleConversionRate: 53,
    clubConversionRate: 6
};
//endregion

// --- HELPER FUNCTIONS ---
//region Helper Functions
const log = {
    info: (message) => console.log(chalk.gray(message)),
    step: (message) => console.log(chalk.yellow.bold(message)),
    success: (message) => console.log(chalk.green(message)),
    error: (message) => console.log(chalk.red.bold(message)),
    header: (message) => console.log(chalk.magenta.bold(message)),
    cyan: (message) => console.log(chalk.cyan(message)),
    white: (message) => console.log(chalk.white(message)),
    green: (message) => console.log(chalk.green(message)),
    yellow: (message) => console.log(chalk.yellow(message)),
    darkCyan: (message) => console.log(chalk.cyanBright(message)),
    magenta: (message) => console.log(chalk.magenta(message)),
    darkGray: (message) => console.log(chalk.dim.gray(message))
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getAuthHeaders() {
    const authString = `${C7_APP_ID}:${C7_API_KEY}`;
    const encoded = Buffer.from(authString).toString('base64');
    return {
        'Authorization': `Basic ${encoded}`,
        'tenant': C7_TENANT_ID,
        'Content-Type': 'application/json',
    };
}

function getDateRanges(periodType, baseDate = new Date()) {
    const ranges = {
        current: { start: null, end: null, label: '' },
        previous: { start: null, end: null, label: '' }
    };
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const quarter = Math.floor(month / 3);
    if (periodType.includes(':')) {
        const [type, specifier] = periodType.split(':');
        if (type === 'month') {
            const targetMonth = parseInt(specifier) - 1;
            ranges.current.start = new Date(year, targetMonth, 1);
            ranges.current.end = new Date(year, targetMonth + 1, 0);
            ranges.current.label = ranges.current.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            ranges.previous.start = new Date(year - 1, targetMonth, 1);
            ranges.previous.end = new Date(year - 1, targetMonth + 1, 0);
            ranges.previous.label = ranges.previous.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (type === 'quarter') {
            const targetQuarter = parseInt(specifier) - 1;
            ranges.current.start = new Date(year, targetQuarter * 3, 1);
            ranges.current.end = new Date(year, (targetQuarter + 1) * 3, 0);
            ranges.current.label = `Q${targetQuarter + 1} ${year}`;
            ranges.previous.start = new Date(year - 1, targetQuarter * 3, 1);
            ranges.previous.end = new Date(year - 1, (targetQuarter + 1) * 3, 0);
            ranges.previous.label = `Q${targetQuarter + 1} ${year - 1}`;
        } else if (type === 'year') {
            const targetYear = parseInt(specifier);
            ranges.current.start = new Date(targetYear, 0, 1);
            ranges.current.end = new Date(targetYear, 11, 31);
            ranges.current.label = `${targetYear}`;
            ranges.previous.start = new Date(targetYear - 1, 0, 1);
            ranges.previous.end = new Date(targetYear - 1, 11, 31);
            ranges.previous.label = `${targetYear - 1}`;
        }
    } else {
        switch (periodType) {
            case 'mtd':
                ranges.current.start = new Date(year, month, 1);
                ranges.current.end = new Date(baseDate);
                ranges.current.label = `${ranges.current.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (MTD)`;
                ranges.previous.start = new Date(year - 1, month, 1);
                ranges.previous.end = new Date(year - 1, month, baseDate.getDate());
                ranges.previous.label = `${ranges.previous.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Same period)`;
                break;
            case 'qtd':
                const quarterStartMonth = quarter * 3;
                ranges.current.start = new Date(year, quarterStartMonth, 1);
                ranges.current.end = new Date(baseDate);
                ranges.current.label = `Q${quarter + 1} ${year} (QTD)`;
                const daysIntoQuarter = Math.floor((baseDate - ranges.current.start) / (1000 * 60 * 60 * 24));
                ranges.previous.start = new Date(year - 1, quarterStartMonth, 1);
                ranges.previous.end = new Date(year - 1, quarterStartMonth, 1);
                ranges.previous.end.setDate(ranges.previous.end.getDate() + daysIntoQuarter);
                ranges.previous.label = `Q${quarter + 1} ${year - 1} (Same period)`;
                break;
            case 'ytd':
            case 'year':
                ranges.current.start = new Date(year, 0, 1);
                ranges.current.end = new Date(baseDate);
                ranges.current.label = `${year} (YTD)`;
                const dayOfYear = Math.floor((baseDate - ranges.current.start) / (1000 * 60 * 60 * 24));
                ranges.previous.start = new Date(year - 1, 0, 1);
                ranges.previous.end = new Date(year - 1, 0, 1 + dayOfYear);
                ranges.previous.label = `${year - 1} (Same period)`;
                break;
            case 'month':
                const targetMonth = month === 0 ? 11 : month - 1;
                const targetYear = month === 0 ? year - 1 : year;
                ranges.current.start = new Date(targetYear, targetMonth, 1);
                ranges.current.end = new Date(targetYear, targetMonth + 1, 0);
                ranges.current.label = ranges.current.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                ranges.previous.start = new Date(targetYear - 1, targetMonth, 1);
                ranges.previous.end = new Date(targetYear - 1, targetMonth + 1, 0);
                ranges.previous.label = ranges.previous.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                break;
            case 'quarter':
                const lastQuarter = quarter === 0 ? 3 : quarter - 1;
                const qYear = quarter === 0 ? year - 1 : year;
                ranges.current.start = new Date(qYear, lastQuarter * 3, 1);
                ranges.current.end = new Date(qYear, (lastQuarter + 1) * 3, 0);
                ranges.current.label = `Q${lastQuarter + 1} ${qYear}`;
                ranges.previous.start = new Date(qYear - 1, lastQuarter * 3, 1);
                ranges.previous.end = new Date(qYear - 1, (lastQuarter + 1) * 3, 0);
                ranges.previous.label = `Q${lastQuarter + 1} ${qYear - 1}`;
                break;
            case 'fullyear':
                ranges.current.start = new Date(year - 1, 0, 1);
                ranges.current.end = new Date(year - 1, 11, 31);
                ranges.current.label = `${year - 1}`;
                ranges.previous.start = new Date(year - 2, 0, 1);
                ranges.previous.end = new Date(year - 2, 11, 31);
                ranges.previous.label = `${year - 2}`;
                break;
        }
    }
    ranges.current.start.setHours(0, 0, 0, 0);
    ranges.current.end.setHours(23, 59, 59, 999);
    ranges.previous.start.setHours(0, 0, 0, 0);
    ranges.previous.end.setHours(23, 59, 59, 999);
    return ranges;
}

function getQuarterDateRanges(quarterNum, baseDate = new Date()) {
    const ranges = {
        current: { start: null, end: null, label: '' },
        previous: { start: null, end: null, label: '' }
    };
    const year = baseDate.getFullYear();
    const currentMonth = baseDate.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;
    const targetQuarter = quarterNum - 1;
    if (quarterNum < currentQuarter) {
        ranges.current.start = new Date(year, targetQuarter * 3, 1);
        ranges.current.end = new Date(year, (targetQuarter + 1) * 3, 0);
        ranges.current.label = `Q${quarterNum} ${year}`;
        ranges.previous.start = new Date(year - 1, targetQuarter * 3, 1);
        ranges.previous.end = new Date(year - 1, (targetQuarter + 1) * 3, 0);
        ranges.previous.label = `Q${quarterNum} ${year - 1}`;
    } else if (quarterNum === currentQuarter) {
        ranges.current.start = new Date(year, targetQuarter * 3, 1);
        const yesterday = new Date(baseDate);
        yesterday.setDate(yesterday.getDate() - 1);
        ranges.current.end = new Date(yesterday);
        ranges.current.label = `Q${quarterNum} ${year} (QTD)`;
        ranges.previous.start = new Date(year - 1, targetQuarter * 3, 1);
        const lastYearEnd = new Date(year - 1, yesterday.getMonth(), yesterday.getDate());
        ranges.previous.end = new Date(lastYearEnd);
        ranges.previous.label = `Q${quarterNum} ${year - 1} (Same QTD period)`;
        log.darkCyan(`   📅 QTD Calculation for Q${quarterNum}:`);
        log.darkCyan(`      Current: ${ranges.current.start.toISOString().split('T')[0]} to ${ranges.current.end.toISOString().split('T')[0]}`);
        log.darkCyan(`      Previous: ${ranges.previous.start.toISOString().split('T')[0]} to ${ranges.previous.end.toISOString().split('T')[0]}`);
    } else {
        return null;
    }
    ranges.current.start.setHours(0, 0, 0, 0);
    ranges.current.end.setHours(23, 59, 59, 999);
    ranges.previous.start.setHours(0, 0, 0, 0);
    ranges.previous.end.setHours(23, 59, 59, 999);
    return ranges;
}

async function fetchPaginatedData(endpoint, queryParams = {}) {
    const allItems = [];
    const headers = getAuthHeaders();
    let page = 1;
    let totalPages = 'unknown';
    let continueLooping = true;
    log.info(`🔄 Fetching data from '${endpoint}' endpoint...`);
    const params = new URLSearchParams({ limit: API_LIMIT, ...queryParams });
    while (continueLooping && page <= MAX_PAGES) {
        let currentTry = 1;
        let success = false;
        params.set('page', page);
        const url = `${BASE_URL}/${endpoint}?${params.toString()}`;
        while (currentTry <= MAX_RETRIES && !success) {
            try {
                if (page % 10 === 0) log.cyan(`   📊 Progress: Page ${page}, ${allItems.length} items fetched...`);
                const response = await axios.get(url, { headers });
                const propertyName = Object.keys(response.data).find(k => Array.isArray(response.data[k]));
                const items = propertyName ? response.data[propertyName] : [];
                if (items.length > 0) {
                    allItems.push(...items);
                } else {
                    totalPages = page - 1;
                    continueLooping = false;
                }
                success = true;
                if (items.length < API_LIMIT) {
                    totalPages = page;
                    continueLooping = false;
                } else {
                    await delay(API_DELAY_MS);
                }
            } catch (error) {
                log.error(`   - ⚠️ Attempt ${currentTry}/${MAX_RETRIES} failed for Page ${page}. Error: ${error.message}`);
                currentTry++;
                if (currentTry > MAX_RETRIES) {
                    log.error(`   - ❌ Giving up on page ${page} after ${MAX_RETRIES} attempts.`);
                    continueLooping = false;
                    break;
                }
                await delay(currentTry * API_DELAY_MS);
            }
        }
        if (!success) break;
        page++;
    }
    log.success(`✅ Total items fetched from '${endpoint}': ${allItems.length}`);
    return allItems;
}

async function fetchAllDataParallel(dateRanges) {
    log.step("FETCHING ALL DATA IN PARALLEL (Different Endpoints)...");
    const startTime = Date.now();
    const fetchPromises = [
        fetchPaginatedData('order', {
            orderPaidDate: `btw:${dateRanges.current.start.toISOString().split('T')[0]}|${dateRanges.current.end.toISOString().split('T')[0]}`
        }),
        fetchPaginatedData('order', {
            orderPaidDate: `btw:${dateRanges.previous.start.toISOString().split('T')[0]}|${dateRanges.previous.end.toISOString().split('T')[0]}`
        }),
        fetchPaginatedData('club-membership', {
            signupDate: `gte:${dateRanges.previous.start.toISOString().split('T')[0]}`
        })
    ];
    const [currentPeriodOrders, previousPeriodOrders, clubMemberships] = await Promise.all(fetchPromises);
    const fetchDuration = (Date.now() - startTime) / 1000;
    log.success(`✅ All data fetched in ${fetchDuration.toFixed(2)} seconds`);
    const orderMap = new Map();
    [...currentPeriodOrders, ...previousPeriodOrders].forEach(order => {
        orderMap.set(order.id, order);
    });
    const allOrders = Array.from(orderMap.values());
    log.info(`📊 Data Fetching Summary: ${allOrders.length} unique orders, ${clubMemberships.length} club memberships`);
    return { allOrders, clubMemberships };
}

async function fetchAllDataForAllQuarters(baseDate = new Date()) {
    log.step("FETCHING TARGETED DATA FOR ALL-QUARTERS ANALYSIS...");
    const startTime = Date.now();
    const year = baseDate.getFullYear();
    const currentQuarter = Math.floor(baseDate.getMonth() / 3) + 1;
    const quarterRangesToFetch = [];
    for (let q = 1; q <= currentQuarter; q++) {
        const ranges = getQuarterDateRanges(q, baseDate);
        if (ranges) quarterRangesToFetch.push(ranges);
    }
    const allOrderResults = [];
    for (const qRanges of quarterRangesToFetch) {
        const [current, previous] = await Promise.all([
            fetchPaginatedData('order', { orderPaidDate: `btw:${qRanges.current.start.toISOString().split('T')[0]}|${qRanges.current.end.toISOString().split('T')[0]}` }),
            fetchPaginatedData('order', { orderPaidDate: `btw:${qRanges.previous.start.toISOString().split('T')[0]}|${qRanges.previous.end.toISOString().split('T')[0]}` })
        ]);
        allOrderResults.push(...current, ...previous);
    }
    const earliestDate = quarterRangesToFetch[0]?.previous.start;
    const clubMemberships = earliestDate ? await fetchPaginatedData('club-membership', {
        signupDate: `gte:${earliestDate.toISOString().split('T')[0]}`
    }) : [];
    const orderMap = new Map();
    allOrderResults.forEach(order => orderMap.set(order.id, order));
    const allOrders = Array.from(orderMap.values());
    const fetchDuration = (Date.now() - startTime) / 1000;
    log.success(`✅ All-quarters data fetched in ${fetchDuration.toFixed(2)} seconds`);
    return { allOrders, clubMemberships };
}

// Gold standard helper functions
const getOrderRevenue = (order) => (order?.subTotal ?? 0) + (order?.taxTotal ?? 0);

const getOrderDate = (order) => {
    const dateString = order?.createdAt ?? order?.orderPaidDate ?? order?.orderDate;
    return dateString ? new Date(dateString) : null;
};

const round = (value, decimals = 2) => {
    if (isNaN(value) || !isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
};

/**
 * Calculate KPIs for a specific date range (unchanged from original)
 */
function calculateKPIsForPeriod(orders, clubMemberships, startDate, endDate, periodLabel) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter orders for this period
    const periodOrders = orders.filter(order => {
        const orderDate = getOrderDate(order);
        return orderDate && orderDate >= startDate && orderDate <= endDate;
    });
    
    const revenueOrders = periodOrders.filter(order => getOrderRevenue(order) > 0);
    
    // Debug logging
    console.log(`\n📅 Processing ${periodLabel}:`);
    console.log(`   - Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`   - Orders in period: ${periodOrders.length}`);
    console.log(`   - Revenue-generating orders: ${revenueOrders.length}`);
    
    // Filter club signups for this period
    const periodClubSignups = clubMemberships.filter(mem => {
        const signupDate = mem.signupDate ? new Date(mem.signupDate) : null;
        return signupDate && signupDate >= startDate && signupDate <= endDate;
    });
    
    const clubSignupCustomers = new Map(periodClubSignups.map(mem => [mem.customerId, true]));
    
    // Initialize KPI structure
    const kpiData = {
        periodLabel,
        dateRange: { 
            start: startDate.toISOString().split('T')[0], 
            end: endDate.toISOString().split('T')[0] 
        },
        overallMetrics: { 
            totalRevenue: 0, totalOrders: 0, totalGuests: 0, totalBottlesSold: 0, 
            avgOrderValue: 0, avgGuestsPerOrder: 0, conversionRate: 0, 
            wineBottleConversionRate: 0, clubConversionRate: 0, 
            totalCustomersWhoSignedUpForClub: 0, totalGuestsWhoBoughtWineBottles: 0, 
            totalNonClubAndTradeGuests: 0, subTotal: 0, shippingTotal: 0, 
            taxTotal: 0, tipTotal: 0, grandTotal: 0,
            wineBottleConversionGoalVariance: 0, clubConversionGoalVariance: 0 
        },
        todayMetrics: { totalRevenue: 0, totalOrders: 0, totalGuests: 0, totalBottlesSold: 0 },
        guestBreakdown: {},
        clubSignupBreakdown: {},
        associatePerformance: {},
        serviceTypeAnalysis: {
            tasting: { orders: 0, guests: 0, bottles: 0, revenue: 0, guestsWhoBoughtBottles: 0, guestsWhoSignedUpForClub: 0, nonClubGuests: 0, bottleConversionRate: 0, clubConversionRate: 0, aov: 0 },
            dining: { orders: 0, guests: 0, bottles: 0, revenue: 0, guestsWhoBoughtBottles: 0, guestsWhoSignedUpForClub: 0, nonClubGuests: 0, bottleConversionRate: 0, clubConversionRate: 0, aov: 0 },
            byTheGlass: { orders: 0, guests: 0, bottles: 0, revenue: 0, guestsWhoBoughtBottles: 0, guestsWhoSignedUpForClub: 0, nonClubGuests: 0, bottleConversionRate: 0, clubConversionRate: 0, aov: 0 },
            retail: { orders: 0, guests: 0, bottles: 0, revenue: 0, guestsWhoBoughtBottles: 0, guestsWhoSignedUpForClub: 0, nonClubGuests: 0, bottleConversionRate: 0, clubConversionRate: 0, aov: 0 },
        },
        conversionFunnel: { guestOnlyOrders: 0, wineOrders: 0, mixedOrders: 0 },
    };
    
    Object.values(GUEST_PRODUCT_IDS).forEach(name => { kpiData.guestBreakdown[name] = 0; });
    Object.values(CLUB_NAMES).forEach(name => { kpiData.clubSignupBreakdown[name] = 0; });
    
    const customerClubSignupAttribution = new Map();
    
    // Process orders (same logic as original)
    for (const order of revenueOrders) {
        const orderDate = getOrderDate(order);
        if (!orderDate) continue;

        const orderRevenue = getOrderRevenue(order);

        kpiData.overallMetrics.totalOrders++;
        kpiData.overallMetrics.totalRevenue += orderRevenue;
        kpiData.overallMetrics.subTotal += order.subTotal ?? 0;
        kpiData.overallMetrics.shippingTotal += order.shippingTotal ?? 0;
        kpiData.overallMetrics.taxTotal += order.taxTotal ?? 0;
        kpiData.overallMetrics.tipTotal += order.tip ?? 0;
        kpiData.overallMetrics.grandTotal += order.total ?? 0;

        if (orderDate.toDateString() === today.toDateString()) {
            kpiData.todayMetrics.totalOrders++;
            kpiData.todayMetrics.totalRevenue += orderRevenue;
        }

        const associateName = order.salesAssociate?.name || "Unknown";
        if (!kpiData.associatePerformance[associateName]) {
            kpiData.associatePerformance[associateName] = { 
                orders: 0, guests: 0, revenue: 0, bottles: 0, wineBottleSales: 0, 
                clubSignups: 0, wineBottleConversionRate: 0, clubConversionRate: 0, 
                nonClubGuests: 0, wineBottleConversionGoalVariance: 'n/a', 
                clubConversionGoalVariance: 'n/a' 
            };
        }
        kpiData.associatePerformance[associateName].orders++;
        kpiData.associatePerformance[associateName].revenue += orderRevenue;

        let orderGuestCount = 0, orderNonClubAndTradeGuestCount = 0, orderBottleCount = 0;
        let hasGuestItems = false, hasWineBottleItems = false;
        let isTastingOrder = false, hasDiningItem = false, hasWineByTheGlassItem = false;

        for (const item of order.items) {
            if (GUEST_PRODUCT_IDS[item.productId]) {
                const guestType = GUEST_PRODUCT_IDS[item.productId];
                orderGuestCount += item.quantity;
                kpiData.guestBreakdown[guestType] += item.quantity;
                hasGuestItems = true;
                if (guestType === 'Non-Club Guest' || guestType === 'Trade Guest') {
                    orderNonClubAndTradeGuestCount += item.quantity;
                }
            }
            
            if (item.departmentId === TASTING_DEPARTMENT_ID) isTastingOrder = true;
            if (item.departmentId === DINING_DEPARTMENT_ID) hasDiningItem = true;
            if (item.departmentId === WINE_BY_THE_GLASS_DEPARTMENT_ID) hasWineByTheGlassItem = true;
            
            const isWineBottle = item.departmentId === WINE_BOTTLE_DEPARTMENT_ID;
            if (isWineBottle) {
                hasWineBottleItems = true;
                orderBottleCount += item.quantity;
            }
        }

        const customerSignedUpForClub = clubSignupCustomers.has(order.customerId);

        kpiData.overallMetrics.totalBottlesSold += orderBottleCount;
        if (orderDate.toDateString() === today.toDateString()) kpiData.todayMetrics.totalBottlesSold += orderBottleCount;
        kpiData.associatePerformance[associateName].bottles += orderBottleCount;

        let serviceType;
        if (isTastingOrder) serviceType = 'tasting';
        else if (hasDiningItem) serviceType = 'dining';
        else if (hasWineByTheGlassItem) serviceType = 'byTheGlass';
        else serviceType = 'retail';

        const serviceMetrics = kpiData.serviceTypeAnalysis[serviceType];
        serviceMetrics.orders++;
        serviceMetrics.guests += orderGuestCount;
        serviceMetrics.bottles += orderBottleCount;
        serviceMetrics.revenue += orderRevenue;
        serviceMetrics.nonClubGuests += orderNonClubAndTradeGuestCount;
        
        if (hasWineBottleItems && orderGuestCount > 0) {
            serviceMetrics.guestsWhoBoughtBottles += orderGuestCount;
        }
        
        if (customerSignedUpForClub) {
            if (!customerClubSignupAttribution.has(order.customerId)) {
                customerClubSignupAttribution.set(order.customerId, associateName);
                kpiData.associatePerformance[associateName].clubSignups += 1;
                kpiData.overallMetrics.totalCustomersWhoSignedUpForClub += 1;
                serviceMetrics.guestsWhoSignedUpForClub += 1;
            }
        }

        if (orderGuestCount > 0) {
            kpiData.overallMetrics.totalGuests += orderGuestCount;
            kpiData.overallMetrics.totalNonClubAndTradeGuests += orderNonClubAndTradeGuestCount;
            if (orderDate.toDateString() === today.toDateString()) kpiData.todayMetrics.totalGuests += orderGuestCount;
            kpiData.associatePerformance[associateName].guests += orderGuestCount;
            kpiData.associatePerformance[associateName].nonClubGuests += orderNonClubAndTradeGuestCount;

            if (hasWineBottleItems) {
                kpiData.associatePerformance[associateName].wineBottleSales += orderGuestCount;
            }
        }
        
        if (hasGuestItems && !hasWineBottleItems) kpiData.conversionFunnel.guestOnlyOrders++;
        else if (!hasGuestItems && hasWineBottleItems) kpiData.conversionFunnel.wineOrders++;
        else if (hasGuestItems && hasWineBottleItems) kpiData.conversionFunnel.mixedOrders++;
    }
    
    periodClubSignups.forEach(mem => {
        const clubName = CLUB_NAMES[mem.clubId];
        if (clubName) kpiData.clubSignupBreakdown[clubName]++;
    });
    
    // Final calculations (same as original)
    const { overallMetrics, serviceTypeAnalysis, associatePerformance, conversionFunnel } = kpiData;
    
    overallMetrics.totalGuestsWhoBoughtWineBottles = Object.values(serviceTypeAnalysis).reduce((acc, metrics) => acc + metrics.guestsWhoBoughtBottles, 0);

    overallMetrics.avgOrderValue = round(overallMetrics.totalRevenue / overallMetrics.totalOrders, 2);
    overallMetrics.avgGuestsPerOrder = round(overallMetrics.totalGuests / overallMetrics.totalOrders, 2);
    const totalGuestExperiences = conversionFunnel.guestOnlyOrders + conversionFunnel.mixedOrders;
    overallMetrics.conversionRate = round((conversionFunnel.mixedOrders / totalGuestExperiences) * 100, 2);
    overallMetrics.wineBottleConversionRate = round((overallMetrics.totalGuestsWhoBoughtWineBottles / overallMetrics.totalGuests) * 100, 2);
    overallMetrics.clubConversionRate = round((overallMetrics.totalCustomersWhoSignedUpForClub / overallMetrics.totalNonClubAndTradeGuests) * 100, 2);
    
    // Add goal variance for overall metrics
    overallMetrics.wineBottleConversionGoalVariance = round(overallMetrics.wineBottleConversionRate - PERFORMANCE_GOALS.wineBottleConversionRate, 2);
    overallMetrics.clubConversionGoalVariance = round(overallMetrics.clubConversionRate - PERFORMANCE_GOALS.clubConversionRate, 2);

    for (const type in serviceTypeAnalysis) {
        const metrics = serviceTypeAnalysis[type];
        metrics.bottleConversionRate = round((metrics.guestsWhoBoughtBottles / metrics.guests) * 100, 2);
        metrics.clubConversionRate = round((metrics.guestsWhoSignedUpForClub / metrics.nonClubGuests) * 100, 2);
        metrics.aov = round(metrics.revenue / metrics.orders, 2);
        metrics.revenue = round(metrics.revenue / 100, 2);
        metrics.aov = round(metrics.aov / 100, 2);
        
        // Add goal variance for service types
        metrics.bottleConversionGoalVariance = !isNaN(metrics.bottleConversionRate) ? 
            round(metrics.bottleConversionRate - PERFORMANCE_GOALS.wineBottleConversionRate, 2) : 'n/a';
        metrics.clubConversionGoalVariance = !isNaN(metrics.clubConversionRate) ? 
            round(metrics.clubConversionRate - PERFORMANCE_GOALS.clubConversionRate, 2) : 'n/a';
    }

    for (const name in associatePerformance) {
        const assoc = associatePerformance[name];
        assoc.wineBottleConversionRate = round((assoc.wineBottleSales / assoc.guests) * 100, 2);
        if (assoc.nonClubGuests > 0) {
            assoc.clubConversionRate = round((assoc.clubSignups / assoc.nonClubGuests) * 100, 2);
        } else {
            assoc.clubConversionRate = 'n/a';
        }
        assoc.revenue = round(assoc.revenue / 100, 2);
        
        // Add goal variance calculations
        assoc.wineBottleConversionGoalVariance = assoc.wineBottleConversionRate !== 0 ? 
            round(assoc.wineBottleConversionRate - PERFORMANCE_GOALS.wineBottleConversionRate, 2) : 'n/a';
        
        assoc.clubConversionGoalVariance = (assoc.clubConversionRate !== 'n/a' && assoc.clubConversionRate !== 0) ? 
            round(assoc.clubConversionRate - PERFORMANCE_GOALS.clubConversionRate, 2) : 'n/a';
    }

    Object.keys(overallMetrics).forEach(key => {
        if (['totalRevenue', 'subTotal', 'shippingTotal', 'taxTotal', 'tipTotal', 'grandTotal', 'avgOrderValue'].includes(key)) {
            overallMetrics[key] = round(overallMetrics[key] / 100, 2);
        }
    });
    kpiData.todayMetrics.totalRevenue = round(kpiData.todayMetrics.totalRevenue / 100, 2);
    
    return kpiData;
}

function calculateYoYChanges(current, previous) {
    const calculateChange = (currentVal, previousVal) => {
        if (!previousVal || previousVal === 0) return null;
        return round(((currentVal - previousVal) / previousVal) * 100, 2);
    };
    const calculateGoalVariance = (actual, goal) => {
        return round(actual - goal, 2);
    };
    return {
        revenue: {
            current: current.overallMetrics.totalRevenue,
            previous: previous.overallMetrics.totalRevenue,
            change: calculateChange(current.overallMetrics.totalRevenue, previous.overallMetrics.totalRevenue)
        },
        guests: {
            current: current.overallMetrics.totalGuests,
            previous: previous.overallMetrics.totalGuests,
            change: calculateChange(current.overallMetrics.totalGuests, previous.overallMetrics.totalGuests)
        },
        orders: {
            current: current.overallMetrics.totalOrders,
            previous: previous.overallMetrics.totalOrders,
            change: calculateChange(current.overallMetrics.totalOrders, previous.overallMetrics.totalOrders)
        },
        bottlesSold: {
            current: current.overallMetrics.totalBottlesSold,
            previous: previous.overallMetrics.totalBottlesSold,
            change: calculateChange(current.overallMetrics.totalBottlesSold, previous.overallMetrics.totalBottlesSold)
        },
        avgOrderValue: {
            current: current.overallMetrics.avgOrderValue,
            previous: previous.overallMetrics.avgOrderValue,
            change: calculateChange(current.overallMetrics.avgOrderValue, previous.overallMetrics.avgOrderValue)
        },
        wineConversionRate: {
            current: current.overallMetrics.wineBottleConversionRate,
            previous: previous.overallMetrics.wineBottleConversionRate,
            change: current.overallMetrics.wineBottleConversionRate - previous.overallMetrics.wineBottleConversionRate,
            goal: PERFORMANCE_GOALS.wineBottleConversionRate,
            goalVariance: calculateGoalVariance(current.overallMetrics.wineBottleConversionRate, PERFORMANCE_GOALS.wineBottleConversionRate)
        },
        clubConversionRate: {
            current: current.overallMetrics.clubConversionRate,
            previous: previous.overallMetrics.clubConversionRate,
            change: current.overallMetrics.clubConversionRate - previous.overallMetrics.clubConversionRate,
            goal: PERFORMANCE_GOALS.clubConversionRate,
            goalVariance: calculateGoalVariance(current.overallMetrics.clubConversionRate, PERFORMANCE_GOALS.clubConversionRate)
        }
    };
}

function getDefinitions() {
    return {
        totalRevenue: "Total Revenue generated from orders within the selected period.",
        totalOrders: "Total number of orders placed within the selected period.",
        totalClubMemberships: "Total number of new club memberships acquired within the selected period.",
        wineBottleConversionRate: "Percentage of orders that resulted in a new club membership, specifically for wine bottle purchases.",
        clubConversionRate: "Percentage of orders that resulted in a new club membership, regardless of product type."
    };
}
//endregion

// --- MONGODB SAVE FUNCTION ---
async function saveKPIDataToMongoDB(kpiData, periodType, startDate = null, endDate = null) {
    let retries = 0;
    const maxRetries = 3;
    while (retries < maxRetries) {
        try {
            await connectToDatabase();
            // Generate AI insights
            const insights = await generateInsights(kpiData);
            // Prepare complete data document
            const dataDocument = {
                periodType,
                generatedAt: kpiData.generatedAt,
                year: kpiData.year || new Date().getFullYear(),
                data: kpiData,
                insights,
                status: 'completed',
                metrics: {
                    yearOverYear: kpiData.yearOverYear,
                    current: {
                        overallMetrics: kpiData.current?.overallMetrics,
                        serviceTypeAnalysis: kpiData.current?.serviceTypeAnalysis,
                        staffAnalysis: kpiData.current?.staffAnalysis,
                        conversionMetrics: kpiData.current?.conversionMetrics,
                        wineMetrics: kpiData.current?.wineMetrics,
                        guestMetrics: kpiData.current?.guestMetrics
                    },
                    previous: {
                        overallMetrics: kpiData.previous?.overallMetrics,
                        serviceTypeAnalysis: kpiData.previous?.serviceTypeAnalysis,
                        staffAnalysis: kpiData.previous?.staffAnalysis,
                        conversionMetrics: kpiData.previous?.conversionMetrics,
                        wineMetrics: kpiData.previous?.wineMetrics,
                        guestMetrics: kpiData.previous?.guestMetrics
                    }
                }
            };

            // Add custom date fields if provided
            if (periodType === 'custom' && startDate && endDate) {
                dataDocument.startDate = startDate;
                dataDocument.endDate = endDate;
            }

            // Build query for upsert
            const query = { periodType, year: dataDocument.year };
            if (periodType === 'custom' && startDate && endDate) {
                query.startDate = startDate;
                query.endDate = endDate;
            }

            // Upsert the data
            await KPIDataModel.findOneAndUpdate(
                query,
                dataDocument,
                { upsert: true, new: true }
            );
            log.success('✅ KPI data saved to MongoDB successfully');
            return;
        } catch (error) {
            retries++;
            log.error(`❌ Error saving to MongoDB (attempt ${retries}): ${error.message}`);
            if (retries >= maxRetries) {
                log.error('❌ Max retries reached. Failing.');
                throw error;
            } else {
                log.info('Retrying in 2 seconds...');
                await delay(2000);
            }
        }
    }
}

function exportToJson(data) {
    try {
        // Sanitize the period type to remove characters that are invalid in Windows filenames
        const safePeriodType = data.periodType.replace(/[<>:"/\\|?*]/g, '-');
        // Create timestamp without colons
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        // Build the filename
        const filename = `C7_KPI_Data_${safePeriodType}_${timestamp}.json`;
        // Get the full path (writes to script directory)
        const filepath = path.join(__dirname, filename);
        // Write the file
        require('fs').writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
        // Verify the file was created
        if (require('fs').existsSync(filepath)) {
            const stats = require('fs').statSync(filepath);
            log.success(`✅ Successfully exported all KPI data to '${filename}'`);
            log.info(`   File size: ${stats.size.toLocaleString()} bytes`);
            log.info(`   Full path: ${filepath}`);
        } else {
            throw new Error('File was not created successfully');
        }
    } catch (error) {
        log.error(`❌ CRITICAL ERROR: Failed to export data to JSON. ${error.message}`);
        log.error(`   Error details: ${error.stack}`);
        // Try to save with a fallback filename
        try {
            const fallbackFilename = `C7_KPI_Data_backup_${Date.now()}.json`;
            const fallbackPath = path.join(__dirname, fallbackFilename);
            require('fs').writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf8');
            log.yellow(`⚠️  Saved to fallback filename: ${fallbackFilename}`);
        } catch (fallbackError) {
            log.error(`❌ Even fallback save failed: ${fallbackError.message}`);
        }
    }
}

// --- TEST MODE DISPLAY FUNCTION ---
function displayTestResults(data, periodType) {
    log.header(`🧪 TEST MODE - ${periodType.toUpperCase()} RESULTS`);
    log.cyan("=========================================");
    
    if (periodType === 'all-quarters') {
        // Display all quarters summary
        displayAllQuartersSummary(data);
    } else {
        // Display regular period summary
        displayComparativeSummary(data);
    }
    
    log.yellow("\n📋 DATA STRUCTURE VALIDATION:");
    const validationResult = verifyDataStructure(data);
    if (validationResult.length === 0) {
        log.success("✅ All required data fields present");
    } else {
        log.error("❌ Missing required fields:");
        validationResult.forEach(field => log.error(`   - ${field}`));
    }
    
    log.magenta("\n💾 TEST MODE: Data NOT saved to MongoDB");
    log.info("To save data, run without test mode");
}

/**
 * Display all-quarters summary - NEW FUNCTIONALITY
 */
function displayAllQuartersSummary(report) {
    const { quarters, quarterComparisons, year } = report;
    const toCurrency = (val) => (val ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const formatChange = (change) => {
        if (change === null) return 'N/A';
        const arrow = change > 0 ? chalk.green : change < 0 ? chalk.red : chalk.gray;
        return arrow(`${arrow} ${Math.abs(change)}%`);
    };
    const formatGoalVariance = (variance) => {
        if (variance === null || variance === 'n/a') return 'N/A';
        const color = variance >= 0 ? chalk.green : chalk.red;
        const sign = variance >= 0 ? '+' : '';
        return color(`${sign}${variance} pts`);
    };
    
    log.green(`\n--- ALL QUARTERS KPI SUMMARY FOR ${year} ---`);
    
    // Display each quarter
    Object.keys(quarters).forEach(quarter => {
        const qData = quarters[quarter];
        const qComparison = quarterComparisons[quarter];
        
        log.white(`\n${quarter.toUpperCase()} PERFORMANCE:`);
        log.white(`Current: ${qData.current.periodLabel} | Previous: ${qData.previous.periodLabel}`);
        
        log.cyan(`  Revenue:     ${toCurrency(qComparison.revenue.current)} vs ${toCurrency(qComparison.revenue.previous)} ${formatChange(qComparison.revenue.change)}`);
        log.cyan(`  Guests:      ${qComparison.guests.current.toLocaleString()} vs ${qComparison.guests.previous.toLocaleString()} ${formatChange(qComparison.guests.change)}`);
        log.cyan(`  Orders:      ${qComparison.orders.current.toLocaleString()} vs ${qComparison.orders.previous.toLocaleString()} ${formatChange(qComparison.orders.change)}`);
        log.cyan(`  Bottles:     ${qComparison.bottlesSold.current.toLocaleString()} vs ${qComparison.bottlesSold.previous.toLocaleString()} ${formatChange(qComparison.bottlesSold.change)}`);
        log.cyan(`  Avg Order:   ${toCurrency(qComparison.avgOrderValue.current)} vs ${toCurrency(qComparison.avgOrderValue.previous)} ${formatChange(qComparison.avgOrderValue.change)}`);
        
        log.yellow(`  Wine Conv:   ${qComparison.wineConversionRate.current}% vs ${qComparison.wineConversionRate.previous}% (YoY: ${qComparison.wineConversionRate.change > 0 ? '+' : ''}${qComparison.wineConversionRate.change.toFixed(2)} pts) | Goal: ${formatGoalVariance(qComparison.wineConversionRate.goalVariance)}`);
        log.yellow(`  Club Conv:   ${qComparison.clubConversionRate.current}% vs ${qComparison.clubConversionRate.previous}% (YoY: ${qComparison.clubConversionRate.change > 0 ? '+' : ''}${qComparison.clubConversionRate.change.toFixed(2)} pts) | Goal: ${formatGoalVariance(qComparison.clubConversionRate.goalVariance)}`);
    });
    
    // Summary table
    log.white(`\n--- QUARTERLY TRENDS SUMMARY ---`);
    log.darkCyan("Quarter | Revenue      | Guests | Orders | Wine Conv% | Club Conv%");
    log.darkCyan("--------|--------------|--------|--------|------------|----------");
    
    Object.keys(quarters).forEach(quarter => {
        const qComparison = quarterComparisons[quarter];
        const revStr = toCurrency(qComparison.revenue.current).padStart(12);
        const guestStr = qComparison.guests.current.toLocaleString().padStart(6);
        const orderStr = qComparison.orders.current.toLocaleString().padStart(6);
        const wineStr = `${qComparison.wineConversionRate.current}%`.padStart(8);
        const clubStr = `${qComparison.clubConversionRate.current}%`.padStart(8);
        
        log.darkCyan(`${quarter.padEnd(7)} | ${revStr} | ${guestStr} | ${orderStr} | ${wineStr}   | ${clubStr}`);
    });
}

/**
 * Display comparative summary with YoY data and goal comparisons (unchanged)
 */
function displayComparativeSummary(report) {
    const { current, previous, yearOverYear } = report;
    const toCurrency = (val) => (val ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const formatChange = (change) => {
        if (change === null) return 'N/A';
        const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
        const color = change > 0 ? chalk.green : change < 0 ? chalk.red : chalk.gray;
        return color(`${arrow} ${Math.abs(change)}%`);
    };
    const formatGoalVariance = (variance, isPercentage = true) => {
        if (variance === null || variance === 'n/a') return 'N/A';
        const color = variance >= 0 ? chalk.green : chalk.red;
        const sign = variance >= 0 ? '+' : '';
        return color(`${sign}${variance}${isPercentage ? ' pts' : ''}`);
    };
    
    log.green(`\n--- COMPARATIVE KPI SUMMARY ---`);
    log.white(`CURRENT PERIOD: ${current.periodLabel}`);
    log.white(`PREVIOUS PERIOD: ${previous.periodLabel}\n`);
    
    log.white("KEY METRICS COMPARISON:");
    log.cyan(`Revenue:`);
    log.cyan(`  Current:  ${toCurrency(yearOverYear.revenue.current)}`);
    log.cyan(`  Previous: ${toCurrency(yearOverYear.revenue.previous)}`);
    log.cyan(`  Change:   ${formatChange(yearOverYear.revenue.change)}\n`);
    
    log.cyan(`Guests:`);
    log.cyan(`  Current:  ${yearOverYear.guests.current.toLocaleString()}`);
    log.cyan(`  Previous: ${yearOverYear.guests.previous.toLocaleString()}`);
    log.cyan(`  Change:   ${formatChange(yearOverYear.guests.change)}\n`);
    
    log.cyan(`Wine Bottle Conversion Rate:`);
    log.cyan(`  Current:  ${yearOverYear.wineConversionRate.current}%`);
    log.cyan(`  Previous: ${yearOverYear.wineConversionRate.previous}%`);
    log.cyan(`  YoY Change: ${yearOverYear.wineConversionRate.change > 0 ? '+' : ''}${yearOverYear.wineConversionRate.change.toFixed(2)} pts`);
    log.cyan(`  Goal:     ${yearOverYear.wineConversionRate.goal}%`);
    log.cyan(`  vs Goal:  ${formatGoalVariance(yearOverYear.wineConversionRate.goalVariance)}\n`);
    
    log.cyan(`Club Conversion Rate:`);
    log.cyan(`  Current:  ${yearOverYear.clubConversionRate.current}%`);
    log.cyan(`  Previous: ${yearOverYear.clubConversionRate.previous}%`);
    log.cyan(`  YoY Change: ${yearOverYear.clubConversionRate.change > 0 ? '+' : ''}${yearOverYear.clubConversionRate.change.toFixed(2)} pts`);
    log.cyan(`  Goal:     ${yearOverYear.clubConversionRate.goal}%`);
    log.cyan(`  vs Goal:  ${formatGoalVariance(yearOverYear.clubConversionRate.goalVariance)}\n`);
    
    log.cyan(`Average Order Value:`);
    log.cyan(`  Current:  ${toCurrency(yearOverYear.avgOrderValue.current)}`);
    log.cyan(`  Previous: ${toCurrency(yearOverYear.avgOrderValue.previous)}`);
    log.cyan(`  Change:   ${formatChange(yearOverYear.avgOrderValue.change)}\n`);
    
    // Display current period detailed metrics (same as original)
    log.white(`CURRENT PERIOD DETAILS (${current.periodLabel}):`);
    displaySummary(current);
}

/**
 * Original display summary function (unchanged)
 */
function displaySummary(kpiData) {
    const { overallMetrics, serviceTypeAnalysis } = kpiData;
    const toCurrency = (val) => (val ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    log.cyan(`  - Total Revenue: ${toCurrency(overallMetrics.totalRevenue)}`);
    log.cyan(`  - Total Orders: ${overallMetrics.totalOrders}`);
    log.cyan(`  - Total Guests: ${overallMetrics.totalGuests}`);
    log.cyan(`  - Total Bottles Sold: ${overallMetrics.totalBottlesSold}`);
    
    log.white("\nSERVICE TYPE BREAKDOWN:");
    for (const [type, metrics] of Object.entries(serviceTypeAnalysis)) {
        if (metrics.orders > 0) {
            const icon = type === 'tasting' ? '🍷' : type === 'dining' ? '🍽️' : type === 'byTheGlass' ? '🥂' : '🛒';
            log.yellow(`  ${icon} ${type.toUpperCase()}: ${metrics.orders} orders, ${metrics.guests} guests, ${toCurrency(metrics.revenue)} revenue`);
        }
    }
}

// --- MAIN RUN LOGIC ---
async function runAllQuartersReport(testMode = false) {
    const startTime = Date.now();
    try {
        log.header("🍷 MILEA ESTATE VINEYARD - ALL QUARTERS KPI DASHBOARD (OPTIMIZED)");
        const baseDate = new Date();
        const { allOrders, clubMemberships } = await fetchAllDataForAllQuarters(baseDate);
        if (allOrders.length === 0) {
            log.error("❌ CRITICAL ERROR: No orders returned. Cannot continue.");
            return;
        }
        log.step("CALCULATING KPIS FOR ALL QUARTERS");
        const quarterResults = {};
        const quarterComparisons = {};
        for (let qNum = 1; qNum <= 4; qNum++) {
            const qRanges = getQuarterDateRanges(qNum, baseDate);
            if (!qRanges) continue;
            const [currentKPIs, previousKPIs] = await Promise.all([
                calculateKPIsForPeriod(allOrders, clubMemberships, qRanges.current.start, qRanges.current.end, qRanges.current.label),
                calculateKPIsForPeriod(allOrders, clubMemberships, qRanges.previous.start, qRanges.previous.end, qRanges.previous.label)
            ]);
            quarterResults[`Q${qNum}`] = { current: currentKPIs, previous: previousKPIs };
            quarterComparisons[`Q${qNum}`] = calculateYoYChanges(currentKPIs, previousKPIs);
        }
        const allQuartersReport = {
            generatedAt: new Date().toISOString(),
            periodType: 'all-quarters',
            year: baseDate.getFullYear(),
            definitions: getDefinitions(),
            quarters: quarterResults,
            quarterComparisons
        };
        const duration = Date.now() - startTime;
        if (testMode) {
            displayTestResults(allQuartersReport, 'all-quarters');
        } else {
            await saveKPIDataToMongoDB(allQuartersReport, 'all-quarters');
            // Fetch the saved document with insights
            await connectToDatabase();
            const { KPIDataModel } = require('../lib/models-cjs.js');
            const saved = await KPIDataModel.findOne({ periodType: 'all-quarters', year: baseDate.getFullYear() }).sort({ createdAt: -1 });
            if (saved && saved.insights) {
                allQuartersReport.insights = saved.insights;
            }
            exportToJson(allQuartersReport);
        }
        log.magenta(`\nScript finished in ${(duration / 1000).toFixed(2)} seconds`);
    } catch (error) {
        log.error("An error occurred during the all-quarters analysis:", error && (error.stack || error.message || error));
        throw error;
    }
}

async function runReport(periodType = 'mtd', testMode = false) {
    if (periodType === 'all-quarters') {
        return await runAllQuartersReport(testMode);
    }
    try {
        log.header("🍷 MILEA ESTATE VINEYARD - KPI DASHBOARD DATA GENERATOR (OPTIMIZED + MongoDB)");
        log.cyan("=========================================================");
        const startTime = new Date();
        const dateRanges = getDateRanges(periodType);
        log.info(`Script started at ${startTime.toLocaleString()}`);
        log.info(`Period Type: ${periodType.toUpperCase()}`);
        log.info(`Current Period: ${dateRanges.current.label} (${dateRanges.current.start.toISOString().split('T')[0]} to ${dateRanges.current.end.toISOString().split('T')[0]})`);
        log.info(`Previous Period: ${dateRanges.previous.label} (${dateRanges.previous.start.toISOString().split('T')[0]} to ${dateRanges.previous.end.toISOString().split('T')[0]})\n`);
        log.step("STEP 1: FETCHING DATA FROM COMMERCE7 API (PARALLEL MODE)");
        const { allOrders, clubMemberships } = await fetchAllDataParallel(dateRanges);
        if (allOrders.length === 0) {
            log.error("❌ CRITICAL ERROR: The API returned 0 orders for the specified date range. Cannot continue.");
            return;
        }
        log.step("STEP 2: CALCULATING KPIS FOR BOTH PERIODS");
        const [currentPeriodKPIs, previousPeriodKPIs] = await Promise.all([
            calculateKPIsForPeriod(
                allOrders, 
                clubMemberships, 
                dateRanges.current.start, 
                dateRanges.current.end,
                dateRanges.current.label
            ),
            calculateKPIsForPeriod(
                allOrders, 
                clubMemberships, 
                dateRanges.previous.start, 
                dateRanges.previous.end,
                dateRanges.previous.label
            )
        ]);
        const yoyComparison = calculateYoYChanges(currentPeriodKPIs, previousPeriodKPIs);
        const finalReport = {
            generatedAt: startTime.toISOString(),
            periodType,
            definitions: getDefinitions(),
            current: currentPeriodKPIs,
            previous: previousPeriodKPIs,
            yearOverYear: yoyComparison
        };
        log.step("STEP 3: DISPLAYING SUMMARY & EXPORTING TO JSON" + (testMode ? "" : " & MONGODB"));
        if (testMode) {
            displayTestResults(finalReport, periodType);
        } else {
            displayComparativeSummary(finalReport);
            await saveKPIDataToMongoDB(finalReport, periodType);
        }
        exportToJson(finalReport);
        const endTime = new Date();
        const duration = endTime - startTime;
        log.magenta(`\nScript finished at ${endTime.toLocaleString()} (Duration: ${(duration / 1000).toFixed(2)} seconds)`);
        log.cyan("=========================================================");
    } catch (error) {
        log.error("An unexpected error occurred during the script execution:");
        log.error(error);
    }
}

async function runCustomDateRangeReport(startDateStr, endDateStr, testMode = false) {
    log.header("🍷 MILEA ESTATE VINEYARD - CUSTOM DATE RANGE KPI DASHBOARD (OPTIMIZED + MongoDB)");
    log.cyan("=========================================================");
    const startTime = new Date();
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (startDate > endDate) {
        log.error("Start date must be before end date.");
        return;
    }

    log.info(`Custom Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    log.step("STEP 1: FETCHING DATA FROM COMMERCE7 API");
    const { allOrders, clubMemberships } = await fetchAllDataParallel({
        current: { start: startDate, end: endDate, label: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}` },
        previous: { start: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), end: new Date(startDate.getTime() - 1), label: `${startDate.toLocaleDateString()} (Same period)` }
    });

    if (allOrders.length === 0) {
        log.error("❌ CRITICAL ERROR: The API returned 0 orders for the specified date range. Cannot continue.");
        return;
    }

    log.step("STEP 2: CALCULATING KPIS FOR BOTH PERIODS");
    const [currentKPIs, previousKPIs] = await Promise.all([
        calculateKPIsForPeriod(allOrders, clubMemberships, startDate, endDate, `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`),
        calculateKPIsForPeriod(allOrders, clubMemberships, new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())), new Date(startDate.getTime() - 1), `${startDate.toLocaleDateString()} (Same period)`)
    ]);

    const yoyComparison = calculateYoYChanges(currentKPIs, previousKPIs);
    const finalReport = {
        generatedAt: startTime.toISOString(),
        periodType: 'custom',
        definitions: getDefinitions(),
        current: currentKPIs,
        previous: previousKPIs,
        yearOverYear: yoyComparison
    };

    log.step("STEP 3: DISPLAYING SUMMARY & EXPORTING TO JSON" + (testMode ? "" : " & MONGODB"));
    if (testMode) {
        displayTestResults(finalReport, 'custom');
    } else {
        displayComparativeSummary(finalReport);
        await saveKPIDataToMongoDB(finalReport, 'custom', startDateStr, endDateStr);
    }
    exportToJson(finalReport);
    const endTime = new Date();
    const duration = endTime - startTime;
    log.magenta(`\nScript finished at ${endTime.toLocaleString()} (Duration: ${(duration / 1000).toFixed(2)} seconds)`);
    log.cyan("=========================================================");
}

// Add this test function to verify output structure
function verifyDataStructure(data) {
    const required = [
        'current.overallMetrics.totalRevenue',
        'current.overallMetrics.totalGuests',
        'current.overallMetrics.totalBottlesSold',
        'current.overallMetrics.wineBottleConversionRate',
        'current.overallMetrics.clubConversionRate',
        'current.overallMetrics.wineBottleConversionGoalVariance',
        'current.overallMetrics.clubConversionGoalVariance',
        'current.guestBreakdown',
        'current.clubSignupBreakdown',
        'current.associatePerformance',
        'current.serviceTypeAnalysis',
        'current.conversionFunnel',
        'yearOverYear.revenue',
        'yearOverYear.guests',
        'yearOverYear.orders',
        'yearOverYear.bottlesSold',
        'yearOverYear.avgOrderValue',
        'yearOverYear.wineConversionRate',
        'yearOverYear.clubConversionRate'
    ];
    
    const missing = [];
    required.forEach(path => {
        const keys = path.split('.');
        let obj = data;
        for (const key of keys) {
            if (!obj || !(key in obj)) {
                missing.push(path);
                break;
            }
            obj = obj[key];
        }
    });
    
    if (missing.length > 0) {
        log.error('❌ Missing required fields in output:');
        missing.forEach(field => log.error(`   - ${field}`));
    } else {
        log.success('✅ All required fields present in output structure');
    }
}

// --- RUN THE SCRIPT ---
// Parse command line arguments
const args = process.argv.slice(2);
const periodType = args[0] || 'mtd';
const testMode = args.includes('--test') || args.includes('-t');

// Handle custom date range
if (periodType === 'custom') {
    const startDate = args[1];
    const endDate = args[2];
    
    if (!startDate || !endDate) {
        log.error('Custom date range requires start and end dates');
        log.info('Usage: node script.js custom "2024-01-01" "2024-01-31"');
        process.exit(1);
    }
    
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        log.error('Invalid date format. Use YYYY-MM-DD format');
        process.exit(1);
    }
    
    if (startDateObj > endDateObj) {
        log.error('Start date must be before end date');
        process.exit(1);
    }
    
    // Run custom date range report
    runCustomDateRangeReport(startDate, endDate, testMode).then(() => {
        if (!testMode) {
            mongoose.connection.close();
        }
    }).catch(error => {
        log.error("Script failed:", error);
        process.exit(1);
    });
} else {
    // Validate period type for standard reports
    const basicPeriods = ['mtd', 'ytd', 'qtd', 'month', 'quarter', 'year', 'fullyear', 'all-quarters'];
    const isSpecificPeriod = periodType.includes(':');

    if (!isSpecificPeriod && !basicPeriods.includes(periodType)) {
        log.error(`Invalid period type: ${periodType}`);
        log.info(`Valid options are:`);
        log.info(`  Basic: ${basicPeriods.join(', ')}`);
        log.info(`  Specific months: month:1 through month:12`);
        log.info(`  Specific quarters: quarter:1 through quarter:4`);
        log.info(`  Specific years: year:2024, year:2025, etc.`);
        log.info(`  Custom: custom "start-date" "end-date"`);
        log.info(`\nOptions:`);
        log.info(`  --test, -t    Run in test mode (no MongoDB save)`);
        process.exit(1);
    }

    // Run the standard report
    runReport(periodType, testMode).then(() => {
        if (!testMode) {
            mongoose.connection.close();
        }
    }).catch(error => {
        log.error("Script failed:", error);
        process.exit(1);
    });
}
