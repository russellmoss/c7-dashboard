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

const getOrderRevenue = (order) => (order?.subTotal ?? 0) + (order?.taxTotal ?? 0);
const getOrderDate = (order) => new Date(order?.createdAt ?? order?.orderPaidDate ?? order?.orderDate);
const round = (value, decimals = 2) => {
    if (isNaN(value) || !isFinite(value)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
};

function calculateKPIsForPeriod(orders, clubMemberships, startDate, endDate, periodLabel) {
    const currentPeriodOrders = orders.filter(order => getOrderDate(order) >= startDate && getOrderDate(order) <= endDate);
    const currentPeriodClubMemberships = clubMemberships.filter(membership => getOrderDate(membership) >= startDate && getOrderDate(membership) <= endDate);

    const totalRevenue = currentPeriodOrders.reduce(getOrderRevenue, 0);
    const totalOrders = currentPeriodOrders.length;
    const totalClubMemberships = currentPeriodClubMemberships.length;

    const wineBottleConversionRate = totalOrders > 0 ? (totalClubMemberships / totalOrders) * 100 : 0;
    const clubConversionRate = totalClubMemberships > 0 ? (totalClubMemberships / totalOrders) * 100 : 0;

    const currentKPIs = {
        periodLabel,
        overallMetrics: {
            totalRevenue: round(totalRevenue),
            totalOrders: totalOrders,
            totalClubMemberships: totalClubMemberships,
            wineBottleConversionRate: round(wineBottleConversionRate),
            clubConversionRate: round(clubConversionRate)
        }
        // add other fields as needed
    };

    const previousPeriodOrders = orders.filter(order => getOrderDate(order) >= startDate.setDate(startDate.getDate() - 365) && getOrderDate(order) <= endDate.setDate(endDate.getDate() - 365));
    const previousPeriodClubMemberships = clubMemberships.filter(membership => getOrderDate(membership) >= startDate.setDate(startDate.getDate() - 365) && getOrderDate(membership) <= endDate.setDate(endDate.getDate() - 365));

    const previousTotalRevenue = previousPeriodOrders.reduce(getOrderRevenue, 0);
    const previousTotalOrders = previousPeriodOrders.length;
    const previousTotalClubMemberships = previousPeriodClubMemberships.length;

    const previousWineBottleConversionRate = previousTotalOrders > 0 ? (previousTotalClubMemberships / previousTotalOrders) * 100 : 0;
    const previousClubConversionRate = previousTotalClubMemberships > 0 ? (previousTotalClubMemberships / previousTotalOrders) * 100 : 0;

    const previousKPIs = {
        periodLabel,
        overallMetrics: {
            totalRevenue: round(previousTotalRevenue),
            totalOrders: previousTotalOrders,
            totalClubMemberships: previousTotalClubMemberships,
            wineBottleConversionRate: round(previousWineBottleConversionRate),
            clubConversionRate: round(previousClubConversionRate)
        }
        // add other fields as needed
    };

    return [currentKPIs, previousKPIs];
}

function calculateYoYChanges(current, previous) {
    // Use the same calculation logic as the gold standard, but output the nested structure the frontend expects
    return {
        revenue: {
            current: current.overallMetrics.totalRevenue,
            previous: previous.overallMetrics.totalRevenue,
            change: previous.overallMetrics.totalRevenue === 0 ? null :
                round(((current.overallMetrics.totalRevenue - previous.overallMetrics.totalRevenue) / previous.overallMetrics.totalRevenue) * 100, 2)
        },
        guests: {
            current: current.overallMetrics.totalOrders,
            previous: previous.overallMetrics.totalOrders,
            change: previous.overallMetrics.totalOrders === 0 ? null :
                round(((current.overallMetrics.totalOrders - previous.overallMetrics.totalOrders) / previous.overallMetrics.totalOrders) * 100, 2)
        },
        wineConversionRate: {
            current: current.overallMetrics.wineBottleConversionRate,
            previous: previous.overallMetrics.wineBottleConversionRate,
            change: previous.overallMetrics.wineBottleConversionRate === 0 ? null :
                round(((current.overallMetrics.wineBottleConversionRate - previous.overallMetrics.wineBottleConversionRate) / previous.overallMetrics.wineBottleConversionRate) * 100, 2),
            goal: PERFORMANCE_GOALS.wineBottleConversionRate,
            goalVariance: round(current.overallMetrics.wineBottleConversionRate - PERFORMANCE_GOALS.wineBottleConversionRate, 2)
        },
        clubConversionRate: {
            current: current.overallMetrics.clubConversionRate,
            previous: previous.overallMetrics.clubConversionRate,
            change: previous.overallMetrics.clubConversionRate === 0 ? null :
                round(((current.overallMetrics.clubConversionRate - previous.overallMetrics.clubConversionRate) / previous.overallMetrics.clubConversionRate) * 100, 2),
            goal: PERFORMANCE_GOALS.clubConversionRate,
            goalVariance: round(current.overallMetrics.clubConversionRate - PERFORMANCE_GOALS.clubConversionRate, 2)
        }
        // Add more metrics as needed
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
async function saveToMongoDB(data, periodType, executionTime) {
    try {
        log.step("SAVING DATA TO MONGODB...");
        await connectToDatabase();
        const year = new Date().getFullYear();
        const kpiData = await KPIDataModel.findOneAndUpdate(
            { periodType: periodType, year: year },
            {
                periodType: periodType,
                year: year,
                data: { ...data },
                status: 'completed',
                executionTime: executionTime
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        log.success(`✅ Successfully saved ${periodType.toUpperCase()} data to MongoDB`);
        log.info(`   Document ID: ${kpiData._id}`);
    } catch (error) {
        log.error(`❌ Failed to save to MongoDB: ${error.message}`);
        await KPIDataModel.findOneAndUpdate(
            { periodType: periodType, year: new Date().getFullYear() },
            { status: 'failed' }
        );
        throw error;
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
    // Display logic from your implementation guide or summary functions
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
            await saveToMongoDB(allQuartersReport, 'all-quarters', duration);
            exportToJson(allQuartersReport);
        }
        log.magenta(`\nScript finished in ${(duration / 1000).toFixed(2)} seconds`);
    } catch (error) {
        log.error("An error occurred during the all-quarters analysis:", error && (error.stack || error.message || error));
        throw error;
    }
}

async function runReport(periodType = 'mtd') {
    if (periodType === 'all-quarters') {
        return await runAllQuartersReport();
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
        const currentPeriodKPIs = await calculateKPIsForPeriod(
            allOrders, 
            clubMemberships, 
            dateRanges.current.start, 
            dateRanges.current.end,
            dateRanges.current.label
        );
        const previousPeriodKPIs = await calculateKPIsForPeriod(
            allOrders, 
            clubMemberships, 
            dateRanges.previous.start, 
            dateRanges.previous.end,
            dateRanges.previous.label
        );
        if (!currentPeriodKPIs || !currentPeriodKPIs.overallMetrics) {
            throw new Error("Current period KPIs missing or malformed");
        }
        if (!previousPeriodKPIs || !previousPeriodKPIs.overallMetrics) {
            throw new Error("Previous period KPIs missing or malformed");
        }
        const yoyComparison = calculateYoYChanges(currentPeriodKPIs, previousPeriodKPIs);
        const finalReport = {
            generatedAt: startTime.toISOString(),
            periodType,
            definitions: getDefinitions(),
            current: currentPeriodKPIs,
            previous: previousPeriodKPIs,
            yearOverYear: yoyComparison
        };
        log.step("STEP 3: DISPLAYING SUMMARY & EXPORTING TO JSON & MONGODB");
        displayComparativeSummary(finalReport);
        exportToJson(finalReport);
        const endTime = new Date();
        const duration = endTime - startTime;
        await saveToMongoDB(finalReport, periodType, duration);
        log.magenta(`\nScript finished at ${endTime.toLocaleString()} (Duration: ${(duration / 1000).toFixed(2)} seconds)`);
        log.cyan("=========================================================");
    } catch (error) {
        log.error("An unexpected error occurred during the script execution:");
        log.error(error);
    }
}

// --- RUN THE SCRIPT ---
const args = process.argv.slice(2);
const periodType = args[0] || 'mtd';
runReport(periodType);
