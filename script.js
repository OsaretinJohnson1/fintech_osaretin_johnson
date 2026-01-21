// World Bank API Configuration
const WORLD_BANK_API_BASE = 'https://api.worldbank.org/v2';
const INDICATORS = {
    bankAccount: 'GFDD.OI.02', // Account ownership at a financial institution
    mobileMoney: 'FM.LBL.BMNY.ZG', // Mobile money account ownership
    digitalPayments: 'GFDD.OI.02', // Using account ownership as proxy for digital payments
    internetAccess: 'IT.NET.USER.ZS' // Individuals using the Internet (% of population)
};

// Alternative indicators to try if primary ones don't have data
const ALTERNATIVE_INDICATORS = {
    bankAccount: ['FB.CBK.BRCH.P5', 'GFDD.OI.02'], // Try multiple indicators
    mobileMoney: ['FM.LBL.BMNY.ZG'], // Mobile money (may not be available for all countries)
    digitalPayments: ['GFDD.OI.02', 'FB.CBK.BRCH.P5'], // Account ownership proxies
    internetAccess: ['IT.NET.USER.ZS'] // Internet access is widely available
};

// Data storage
let allData = {};
let countries = [];
let charts = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});

// Load data from World Bank API
async function loadData() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const dashboardEl = document.getElementById('dashboard');

    try {
        loadingEl.style.display = 'flex';
        errorEl.style.display = 'none';
        dashboardEl.style.display = 'none';

        // Get list of countries (using common country codes)
        // Mix of developed and developing countries for better data coverage
        const countryCodes = [
            'USA', 'GBR', 'CAN', 'AUS', 'DEU', 'FRA', 'JPN', // Developed
            'NGA', 'KEN', 'GHA', 'ZAF', 'EGY', 'TZA', 'UGA', // African
            'IND', 'CHN', 'IDN', 'PHL', 'BGD', 'PAK', 'THA', // Asian
            'BRA', 'MEX', 'ARG', 'COL', 'CHL', 'PER' // Latin American
        ];

        // Fetch data for all indicators and countries
        const promises = [];

        for (const countryCode of countryCodes) {
            for (const [key, indicator] of Object.entries(INDICATORS)) {
                promises.push(fetchIndicatorData(countryCode, indicator, key));
            }
        }

        const results = await Promise.allSettled(promises);

        // Process results
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                const { countryCode, indicatorType, data } = result.value;
                if (!allData[countryCode]) {
                    allData[countryCode] = {};
                }
                allData[countryCode][indicatorType] = data;
            }
        });

        // Extract unique countries
        countries = Object.keys(allData).filter(code => {
            const countryData = allData[code];
            return countryData.bankAccount || countryData.mobileMoney || countryData.digitalPayments;
        });

        if (countries.length === 0) {
            throw new Error('No data available');
        }

        // Get country names
        await enrichCountryNames();

        // Populate selectors
        populateSelectors();

        // Render all charts
        renderAllCharts();

        loadingEl.style.display = 'none';
        dashboardEl.style.display = 'grid';
    } catch (error) {
        console.error('Error loading data:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

// Fetch indicator data from World Bank API
async function fetchIndicatorData(countryCode, indicator, indicatorType) {
    // Try primary indicator first, then alternatives
    const indicatorsToTry = [indicator, ...(ALTERNATIVE_INDICATORS[indicatorType] || [])];

    for (const ind of indicatorsToTry) {
        try {
            const url = `${WORLD_BANK_API_BASE}/country/${countryCode}/indicator/${ind}?format=json&date=2010:2023&per_page=1000`;
            const response = await fetch(url);

            if (!response.ok) {
                continue; // Try next indicator
            }

            const data = await response.json();

            if (data && data[1] && Array.isArray(data[1]) && data[1].length > 0) {
                const processedData = data[1]
                    .filter(item => item.value !== null && item.date)
                    .map(item => ({
                        year: parseInt(item.date),
                        value: item.value,
                        country: item.country?.value || countryCode
                    }))
                    .sort((a, b) => a.year - b.year);

                if (processedData.length > 0) {
                    return { countryCode, indicatorType, data: processedData };
                }
            }
        } catch (error) {
            // Continue to next indicator
            continue;
        }
    }

    // If all indicators failed, return null
    console.warn(`No data available for ${indicatorType} in ${countryCode}`);
    return null;
}

// Enrich country data with names
async function enrichCountryNames() {
    // Manual mapping for full country names
    const manualNames = {
        'USA': 'United States',
        'GBR': 'United Kingdom',
        'CAN': 'Canada',
        'AUS': 'Australia',
        'DEU': 'Germany',
        'FRA': 'France',
        'JPN': 'Japan',
        'NGA': 'Nigeria',
        'KEN': 'Kenya',
        'GHA': 'Ghana',
        'ZAF': 'South Africa',
        'EGY': 'Egypt',
        'TZA': 'Tanzania',
        'UGA': 'Uganda',
        'IND': 'India',
        'CHN': 'China',
        'IDN': 'Indonesia',
        'PHL': 'Philippines',
        'BGD': 'Bangladesh',
        'PAK': 'Pakistan',
        'THA': 'Thailand',
        'BRA': 'Brazil',
        'MEX': 'Mexico',
        'ARG': 'Argentina',
        'COL': 'Colombia',
        'CHL': 'Chile',
        'PER': 'Peru'
    };

    try {
        const url = `${WORLD_BANK_API_BASE}/country?format=json&per_page=300`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data[1]) {
            const countryMap = {};
            data[1].forEach(country => {
                // Map both ISO2 and ISO3 codes
                if (country.iso2Code) {
                    countryMap[country.iso2Code] = country.name;
                }
                if (country.id) {
                    countryMap[country.id] = country.name;
                }
            });

            // Add country names to our data
            countries.forEach(code => {
                if (countryMap[code]) {
                    allData[code].name = countryMap[code];
                } else if (manualNames[code]) {
                    allData[code].name = manualNames[code];
                } else {
                    allData[code].name = code;
                }
            });
        }
    } catch (error) {
        console.warn('Failed to fetch country names:', error);
        // Use manual mapping as fallback
        countries.forEach(code => {
            if (!allData[code].name) {
                allData[code].name = manualNames[code] || code;
            }
        });
    }
}

// Populate dropdown selectors
function populateSelectors() {
    const doughnutSelect = document.getElementById('doughnut-country-select');
    const projectionSelect = document.getElementById('projection-country-select');

    // Sort countries by name
    const sortedCountries = [...countries].sort((a, b) => {
        const nameA = allData[a].name || a;
        const nameB = allData[b].name || b;
        return nameA.localeCompare(nameB);
    });

    sortedCountries.forEach(code => {
        const name = allData[code].name || code;
        const option1 = document.createElement('option');
        option1.value = code;
        option1.textContent = name;
        doughnutSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = code;
        option2.textContent = name;
        projectionSelect.appendChild(option2);
    });

    // Set default selections
    if (sortedCountries.length > 0) {
        doughnutSelect.value = sortedCountries[0];
        projectionSelect.value = sortedCountries[0];
    }

    // Add event listeners
    doughnutSelect.addEventListener('change', () => updateDoughnutChart());
    projectionSelect.addEventListener('change', () => updateProjectionChart());
    document.getElementById('projection-year-select').addEventListener('change', () => updateProjectionChart());
}

// Render all charts
function renderAllCharts() {
    renderLineChart();
    renderBarChart();
    updateDoughnutChart();
    updateProjectionChart();
    renderDataTable();
}

// Glowing neon color palette for dark theme
const NEON_COLORS = [
    { border: '#22d3ee', bg: 'rgba(34, 211, 238, 0.15)', shadow: 'rgba(34, 211, 238, 0.6)' },   // Cyan
    { border: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)', shadow: 'rgba(167, 139, 250, 0.6)' }, // Purple
    { border: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', shadow: 'rgba(52, 211, 153, 0.6)' },   // Emerald
    { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', shadow: 'rgba(251, 191, 36, 0.6)' },   // Amber
    { border: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)', shadow: 'rgba(244, 114, 182, 0.6)' }, // Pink
    { border: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', shadow: 'rgba(96, 165, 250, 0.6)' }    // Blue
];

// Dark theme chart defaults
const CHART_DEFAULTS = {
    color: '#a1a1aa',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'transparent'
};

// Apply dark theme to Chart.js globally
Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.borderColor = CHART_DEFAULTS.borderColor;
Chart.defaults.backgroundColor = CHART_DEFAULTS.backgroundColor;

// Chart 1: Line Chart - Financial Inclusion Growth
function renderLineChart() {
    const ctx = document.getElementById('lineChart').getContext('2d');

    // Prepare data for top countries
    const topCountries = countries.slice(0, 6); // Show top 6 countries
    const datasets = topCountries.map((code, index) => {
        const countryData = allData[code];
        const bankAccountData = countryData.bankAccount || [];

        // Get all unique years
        const years = [...new Set(bankAccountData.map(d => d.year))].sort();

        // Map data to years
        const values = years.map(year => {
            const dataPoint = bankAccountData.find(d => d.year === year);
            return dataPoint ? dataPoint.value : null;
        });

        const color = NEON_COLORS[index % NEON_COLORS.length];

        // Create elegant gradient for each line
        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0, color.bg);
        gradient.addColorStop(1, 'rgba(10, 10, 11, 0)');

        return {
            label: countryData.name || code,
            data: values,
            borderColor: color.border,
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.45, // Smoother curves
            pointRadius: 0, // Hide points by default for cleaner look
            pointHoverRadius: 6,
            pointBackgroundColor: color.border,
            pointBorderColor: '#0a0a0b',
            pointBorderWidth: 2,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: color.border,
            pointHoverBorderWidth: 2,
            segment: {
                borderColor: ctx => {
                    // Subtle opacity variation for depth
                    return color.border;
                }
            }
        };
    });

    // Get common years
    const allYears = new Set();
    topCountries.forEach(code => {
        const bankAccountData = allData[code].bankAccount || [];
        bankAccountData.forEach(d => allYears.add(d.year));
    });
    const years = [...allYears].sort();

    if (charts.lineChart) {
        charts.lineChart.destroy();
    }

    charts.lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            animations: {
                tension: {
                    duration: 1000,
                    easing: 'easeInOutCubic',
                    from: 0.3,
                    to: 0.45
                },
                y: {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                        color: '#fafafa',
                        boxWidth: 8,
                        boxHeight: 8
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 10, 11, 0.98)',
                    titleColor: '#fafafa',
                    bodyColor: '#e4e4e7',
                    borderColor: 'rgba(34, 211, 238, 0.2)',
                    borderWidth: 1,
                    padding: 16,
                    cornerRadius: 12,
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 12, weight: '500' },
                    displayColors: true,
                    boxPadding: 8,
                    boxWidth: 10,
                    boxHeight: 10,
                    usePointStyle: true,
                    callbacks: {
                        label: function (context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return ` ${label}: ${value.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false,
                        lineWidth: 1
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        font: { family: "'JetBrains Mono', monospace", size: 11 },
                        color: '#71717a',
                        padding: 12,
                        callback: function (value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Account Ownership (%)',
                        font: { family: "'Inter', sans-serif", size: 12, weight: '600' },
                        color: '#a1a1aa',
                        padding: { bottom: 12 }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.02)',
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        font: { family: "'JetBrains Mono', monospace", size: 11 },
                        color: '#71717a',
                        padding: 12
                    },
                    title: {
                        display: true,
                        text: 'Year',
                        font: { family: "'Inter', sans-serif", size: 12, weight: '600' },
                        color: '#a1a1aa',
                        padding: { top: 12 }
                    }
                }
            }
        }
    });
}

// Chart 2: Bar Chart - Digital Payments Adoption
function renderBarChart() {
    const ctx = document.getElementById('barChart').getContext('2d');

    // Get latest year data for each country
    const countryData = countries.map(code => {
        const data = allData[code];
        const digitalPayments = data.digitalPayments || data.bankAccount || [];

        // Get most recent value
        let latestValue = null;
        if (digitalPayments.length > 0) {
            const sorted = [...digitalPayments].sort((a, b) => b.year - a.year);
            latestValue = sorted[0].value;
        }

        return {
            country: data.name || code,
            value: latestValue
        };
    }).filter(item => item.value !== null)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 countries

    if (charts.barChart) {
        charts.barChart.destroy();
    }

    // Create gradient for bars
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(34, 211, 238, 0.9)');
    gradient.addColorStop(1, 'rgba(167, 139, 250, 0.6)');

    const hoverGradient = ctx.createLinearGradient(0, 0, 0, 400);
    hoverGradient.addColorStop(0, 'rgba(34, 211, 238, 1)');
    hoverGradient.addColorStop(1, 'rgba(167, 139, 250, 0.9)');

    charts.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: countryData.map(d => d.country),
            datasets: [{
                label: 'Digital Payments Usage (%)',
                data: countryData.map(d => d.value),
                backgroundColor: gradient,
                hoverBackgroundColor: hoverGradient,
                borderColor: 'rgba(34, 211, 238, 0.5)',
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 17, 19, 0.95)',
                    titleColor: '#fafafa',
                    bodyColor: '#22d3ee',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 10,
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 14, weight: '500' },
                    displayColors: false,
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        font: { family: "'JetBrains Mono', monospace", size: 11 },
                        color: '#71717a',
                        padding: 10
                    },
                    title: {
                        display: true,
                        text: 'Percentage (%)',
                        font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                        color: '#a1a1aa',
                        padding: { bottom: 10 }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: { family: "'Inter', sans-serif", size: 10 },
                        color: '#71717a',
                        padding: 10,
                        maxRotation: 45,
                        minRotation: 45
                    },
                    title: {
                        display: true,
                        text: 'Country',
                        font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                        color: '#a1a1aa',
                        padding: { top: 10 }
                    }
                }
            }
        }
    });
}

// Chart 3: Doughnut Chart - Cash vs Digital Banking
function updateDoughnutChart() {
    const countryCode = document.getElementById('doughnut-country-select').value;
    const ctx = document.getElementById('doughnutChart').getContext('2d');
    const data = allData[countryCode];

    // Get latest values
    const mobileMoney = data.mobileMoney || [];
    const bankAccount = data.bankAccount || [];

    let mobileMoneyValue = 0;
    let bankAccountValue = 0;

    if (mobileMoney.length > 0) {
        const sorted = [...mobileMoney].sort((a, b) => b.year - a.year);
        mobileMoneyValue = sorted[0].value || 0;
    }

    if (bankAccount.length > 0) {
        const sorted = [...bankAccount].sort((a, b) => b.year - a.year);
        bankAccountValue = sorted[0].value || 0;
    }

    // Calculate traditional banking (bank account - mobile money overlap)
    const traditionalBanking = Math.max(0, bankAccountValue - mobileMoneyValue);

    if (charts.doughnutChart) {
        charts.doughnutChart.destroy();
    }

    charts.doughnutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Mobile Money', 'Traditional Banking'],
            datasets: [{
                data: [mobileMoneyValue, traditionalBanking],
                backgroundColor: [
                    'rgba(34, 211, 238, 0.85)',
                    'rgba(167, 139, 250, 0.85)'
                ],
                hoverBackgroundColor: [
                    'rgba(34, 211, 238, 1)',
                    'rgba(167, 139, 250, 1)'
                ],
                borderColor: 'transparent',
                borderWidth: 0,
                hoverBorderColor: 'transparent',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 24,
                        font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                        color: '#fafafa'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 17, 19, 0.95)',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 10,
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 14, weight: '500' },
                    displayColors: true,
                    boxPadding: 6,
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return ` ${label}: ${value.toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
}

// Chart 4: Projection Line Chart - Cashless Future Simulator
function updateProjectionChart() {
    const countryCode = document.getElementById('projection-country-select').value;
    const targetYear = parseInt(document.getElementById('projection-year-select').value);
    const ctx = document.getElementById('projectionChart').getContext('2d');
    const data = allData[countryCode];

    // Use digital payments or bank account data
    const sourceData = data.digitalPayments || data.bankAccount || [];

    if (sourceData.length < 2) {
        // Not enough data for projection
        if (charts.projectionChart) {
            charts.projectionChart.destroy();
        }
        return;
    }

    // Sort by year
    const sortedData = [...sourceData].sort((a, b) => a.year - b.year);
    const years = sortedData.map(d => d.year);
    const values = sortedData.map(d => d.value);

    // Calculate linear regression for projection
    const projection = calculateLinearRegression(years, values, targetYear);

    // Combine historical and projected data
    const allYears = [...years, targetYear];
    const allValues = [...values, projection.projectedValue];

    // Create datasets
    const historicalYears = years;
    const historicalValues = values;
    const projectedYears = [years[years.length - 1], targetYear];
    const projectedValues = [values[values.length - 1], projection.projectedValue];

    if (charts.projectionChart) {
        charts.projectionChart.destroy();
    }

    // Prepare data for chart
    const historicalData = historicalYears.map((year, idx) => ({
        x: year,
        y: historicalValues[idx]
    }));

    const projectedData = projectedYears.map((year, idx) => ({
        x: year,
        y: projectedValues[idx]
    }));

    // Create gradient fill for historical data
    const histGradient = ctx.createLinearGradient(0, 0, 0, 400);
    histGradient.addColorStop(0, 'rgba(34, 211, 238, 0.25)');
    histGradient.addColorStop(1, 'rgba(34, 211, 238, 0)');

    // Create gradient fill for projected data
    const projGradient = ctx.createLinearGradient(0, 0, 0, 400);
    projGradient.addColorStop(0, 'rgba(52, 211, 153, 0.25)');
    projGradient.addColorStop(1, 'rgba(52, 211, 153, 0)');

    charts.projectionChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Historical Data',
                    data: historicalData,
                    borderColor: '#22d3ee',
                    backgroundColor: histGradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#22d3ee',
                    pointBorderColor: '#0a0a0b',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#22d3ee',
                    pointHoverBorderWidth: 3
                },
                {
                    label: 'Projected Trend',
                    data: projectedData,
                    borderColor: '#34d399',
                    backgroundColor: projGradient,
                    borderWidth: 3,
                    borderDash: [8, 4],
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 10,
                    pointBackgroundColor: '#34d399',
                    pointBorderColor: '#0a0a0b',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#34d399',
                    pointHoverBorderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                        color: '#fafafa'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 17, 19, 0.95)',
                    titleColor: '#fafafa',
                    bodyColor: '#a1a1aa',
                    borderColor: 'rgba(52, 211, 153, 0.3)',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 10,
                    titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
                    bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                    displayColors: true,
                    boxPadding: 6,
                    callbacks: {
                        label: function (context) {
                            return ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.03)',
                        drawBorder: false
                    },
                    ticks: {
                        stepSize: 1,
                        font: { family: "'JetBrains Mono', monospace", size: 11 },
                        color: '#71717a',
                        padding: 10
                    },
                    title: {
                        display: true,
                        text: 'Year',
                        font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                        color: '#a1a1aa',
                        padding: { top: 10 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        font: { family: "'JetBrains Mono', monospace", size: 11 },
                        color: '#71717a',
                        padding: 10
                    },
                    title: {
                        display: true,
                        text: 'Percentage (%)',
                        font: { family: "'Inter', sans-serif", size: 12, weight: '500' },
                        color: '#a1a1aa',
                        padding: { bottom: 10 }
                    }
                }
            }
        }
    });
}

// Calculate linear regression for projection
function calculateLinearRegression(years, values, targetYear) {
    const n = years.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += years[i];
        sumY += values[i];
        sumXY += years[i] * values[i];
        sumX2 += years[i] * years[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const projectedValue = slope * targetYear + intercept;

    return {
        slope,
        intercept,
        projectedValue: Math.max(0, Math.min(100, projectedValue)) // Clamp between 0 and 100
    };
}

// Chart 5: Data Table - Transparency Layer
function renderDataTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    // Collect all data points
    const tableData = [];

    countries.forEach(code => {
        const data = allData[code];
        const countryName = data.name || code;

        // Get all years from available data
        const allYears = new Set();
        [data.bankAccount, data.mobileMoney, data.digitalPayments, data.internetAccess].forEach(dataset => {
            if (dataset) {
                dataset.forEach(d => allYears.add(d.year));
            }
        });

        [...allYears].sort().forEach(year => {
            const bankAccount = (data.bankAccount || []).find(d => d.year === year);
            const mobileMoney = (data.mobileMoney || []).find(d => d.year === year);
            const digitalPayments = (data.digitalPayments || []).find(d => d.year === year);
            const internetAccess = (data.internetAccess || []).find(d => d.year === year);

            tableData.push({
                country: countryName,
                code: code,
                year: year,
                bankAccount: bankAccount ? bankAccount.value : null,
                mobileMoney: mobileMoney ? mobileMoney.value : null,
                digitalPayments: digitalPayments ? digitalPayments.value : null,
                internetAccess: internetAccess ? internetAccess.value : null
            });
        });
    });

    // Sort by country and year
    tableData.sort((a, b) => {
        if (a.country !== b.country) {
            return a.country.localeCompare(b.country);
        }
        return b.year - a.year;
    });

    // Render rows
    tableData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.country}</td>
            <td>${row.year}</td>
            <td>${row.bankAccount !== null ? row.bankAccount.toFixed(2) + '%' : 'N/A'}</td>
            <td>${row.mobileMoney !== null ? row.mobileMoney.toFixed(2) + '%' : 'N/A'}</td>
            <td>${row.digitalPayments !== null ? row.digitalPayments.toFixed(2) + '%' : 'N/A'}</td>
            <td>${row.internetAccess !== null ? row.internetAccess.toFixed(2) + '%' : 'N/A'}</td>
        `;
        tableBody.appendChild(tr);
    });

    // Add search functionality
    const searchInput = document.getElementById('table-search');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = tableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    // Add sort functionality
    let sortAscending = true;
    document.getElementById('sort-btn').addEventListener('click', () => {
        const rows = Array.from(tableBody.querySelectorAll('tr'));
        rows.sort((a, b) => {
            const countryA = a.cells[0].textContent;
            const countryB = b.cells[0].textContent;
            return sortAscending
                ? countryA.localeCompare(countryB)
                : countryB.localeCompare(countryA);
        });

        rows.forEach(row => tableBody.appendChild(row));
        sortAscending = !sortAscending;
    });
}

// Retry button handler
document.getElementById('retry-btn').addEventListener('click', () => {
    loadData();
});

// ===========================
// Country Race Simulator
// ===========================

const raceState = {
    selectedCountries: [],
    policies: {},
    target: 80,
    targetYear: 2030,
    raceData: {},
    results: []
};

const RACE_COLORS = [
    { primary: '#22d3ee', bg: 'rgba(34, 211, 238, 0.15)' },
    { primary: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
    { primary: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' },
    { primary: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' }
];

// Modal controls
document.getElementById('launch-race').addEventListener('click', () => {
    document.getElementById('race-modal').style.display = 'flex';
    initializeRaceSetup();
});

document.getElementById('close-race').addEventListener('click', closeRaceModal);

// Help panel controls
document.getElementById('race-help').addEventListener('click', () => {
    document.getElementById('race-help-panel').classList.remove('hidden');
});

document.getElementById('close-help').addEventListener('click', () => {
    document.getElementById('race-help-panel').classList.add('hidden');
});

document.getElementById('race-explanation-toggle').addEventListener('click', () => {
    const panel = document.getElementById('race-explanation');
    panel.classList.toggle('hidden');
});

document.getElementById('start-policies').addEventListener('click', () => {
    if (raceState.selectedCountries.length < 2) {
        alert('Please select at least 2 countries to race!');
        return;
    }
    showPolicyPhase();
});

document.getElementById('back-to-setup').addEventListener('click', showSetupPhase);

document.getElementById('start-race').addEventListener('click', startRaceAnimation);

document.getElementById('skip-race').addEventListener('click', skipToResults);

// Attach reality check button listener
function attachRealityCheckListener() {
    const realityCheckBtn = document.getElementById('show-reality-check');
    if (realityCheckBtn) {
        // Remove any existing listeners by cloning
        const newBtn = realityCheckBtn.cloneNode(true);
        realityCheckBtn.parentNode.replaceChild(newBtn, realityCheckBtn);
        // Attach fresh listener
        newBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Reality check button clicked');
            showRealityCheck();
        });
        return true;
    }
    return false;
}

// Try to attach on page load
if (!attachRealityCheckListener()) {
    console.warn('Reality check button not found on page load - will attach when results show');
}

document.getElementById('new-race').addEventListener('click', resetRace);

document.getElementById('share-race').addEventListener('click', shareRaceResults);

function closeRaceModal() {
    document.getElementById('race-modal').style.display = 'none';
}

function initializeRaceSetup() {
    raceState.selectedCountries = [];
    raceState.policies = {};
    raceState.target = parseInt(document.getElementById('race-target').value);
    raceState.targetYear = parseInt(document.getElementById('race-year').value);

    // Populate country selector
    const container = document.getElementById('country-selector');
    container.innerHTML = '';

    countries.slice(0, 12).forEach((code, index) => {
        const countryCard = document.createElement('div');
        countryCard.className = 'country-card';
        countryCard.dataset.code = code;

        const countryName = allData[code].name || code;
        const latestData = getLatestValue(code);

        countryCard.innerHTML = `
            <div class="country-flag">${getCountryFlag(code)}</div>
            <div class="country-info">
                <div class="country-name">${countryName}</div>
                <div class="country-stat">Current: ${latestData.toFixed(1)}%</div>
            </div>
            <div class="country-check">✓</div>
        `;

        countryCard.addEventListener('click', () => toggleCountrySelection(code, countryCard));
        container.appendChild(countryCard);
    });

    showSetupPhase();
}

function getCountryFlag(code) {
    // Return empty string instead of flag emojis
    return '';
}

function getLatestValue(code) {
    const data = allData[code].digitalPayments || allData[code].bankAccount || [];
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => b.year - a.year);
    return sorted[0].value || 0;
}

function toggleCountrySelection(code, card) {
    const index = raceState.selectedCountries.indexOf(code);

    if (index > -1) {
        raceState.selectedCountries.splice(index, 1);
        card.classList.remove('selected');
    } else {
        if (raceState.selectedCountries.length >= 4) {
            alert('Maximum 4 countries allowed!');
            return;
        }
        raceState.selectedCountries.push(code);
        card.classList.add('selected');
    }
}

function showSetupPhase() {
    document.getElementById('race-setup').classList.remove('hidden');
    document.getElementById('race-policies').classList.add('hidden');
    document.getElementById('race-animation').classList.add('hidden');
    document.getElementById('race-results').classList.add('hidden');
}

function showPolicyPhase() {
    document.getElementById('race-setup').classList.add('hidden');
    document.getElementById('race-policies').classList.remove('hidden');

    const container = document.getElementById('policy-countries');
    container.innerHTML = '';

    raceState.selectedCountries.forEach((code, index) => {
        const policyCard = createPolicyCard(code, index);
        container.appendChild(policyCard);

        // Initialize default policies
        if (!raceState.policies[code]) {
            raceState.policies[code] = {
                fintech: 25,
                infrastructure: 25,
                education: 25,
                policy: 25
            };
        }
    });
}

function createPolicyCard(code, index) {
    const card = document.createElement('div');
    card.className = 'policy-card';
    card.style.borderColor = RACE_COLORS[index].primary;

    const countryName = allData[code].name || code;

    card.innerHTML = `
        <div class="policy-card-header" style="background: ${RACE_COLORS[index].bg}">
            <span class="policy-flag">${getCountryFlag(code)}</span>
            <h4>${countryName}</h4>
        </div>
        
        <div class="policy-sliders">
            <div class="slider-group-mini">
                <label>Fintech Investment
                    <span class="info-tooltip" data-tooltip="Mobile apps, payment platforms, and startup funding. Boosts adoption by ~1.5% annually">Info</span>
                </label>
                <input type="range" class="policy-slider" data-country="${code}" data-type="fintech"
                       min="0" max="50" value="25" step="5">
                <span class="slider-value">$<span id="fintech-${code}">25</span>M</span>
                <p class="slider-effect">Boosts growth by <span id="fintech-effect">0.4</span>% per year</p>
            </div>

            <div class="slider-group-mini">
                <label>Digital Infrastructure
                    <span class="info-tooltip" data-tooltip="Internet and mobile networks enable adoption. Critical foundation for digital finance">Info</span>
                </label>
                <input type="range" class="policy-slider" data-country="${code}" data-type="infrastructure"
                       min="0" max="50" value="25" step="5">
                <span class="slider-value">$<span id="infrastructure-${code}">25</span>M</span>
                <p class="slider-effect">Boosts growth by <span id="infrastructure-effect">0.4</span>% per year</p>
            </div>

            <div class="slider-group-mini">
                <label>Financial Education
                    <span class="info-tooltip" data-tooltip="Builds trust and skills for digital payments. Takes longer but compounds over time">Info</span>
                </label>
                <input type="range" class="policy-slider" data-country="${code}" data-type="education"
                       min="0" max="50" value="25" step="5">
                <span class="slider-value">$<span id="education-${code}">25</span>M</span>
                <p class="slider-effect">Boosts growth by <span id="education-effect">0.3</span>% per year</p>
            </div>

            <div class="slider-group-mini">
                <label>Policy & Regulation
                    <span class="info-tooltip" data-tooltip="Creates enabling environment with clear rules. Reduces friction for innovation">Info</span>
                </label>
                <input type="range" class="policy-slider" data-country="${code}" data-type="policy"
                       min="0" max="50" value="25" step="5">
                <span class="slider-value">$<span id="policy-${code}">25</span>M</span>
                <p class="slider-effect">Boosts growth by <span id="policy-effect">0.4</span>% per year</p>
            </div>
        </div>

        <div class="policy-budget">
            <div class="budget-display">
                Budget: $<span id="budget-${code}">100</span>M / $100M
                <div class="budget-context">
                    <small>
                        <span id="annual-budget-${code}">$10M/year over 10 years</span> •
                        <span class="policy-efficiency" id="efficiency-${code}">Balanced Approach</span>
                    </small>
                </div>
            </div>
            <div class="budget-bar">
                <div class="budget-used" id="budget-bar-${code}" style="width: 100%"></div>
            </div>
        </div>
    `;

    // Add event listeners to sliders
    setTimeout(() => {
        card.querySelectorAll('.policy-slider').forEach(slider => {
            slider.addEventListener('input', handlePolicySlider);
        });
    }, 0);

    return card;
}

function handlePolicySlider(e) {
    const country = e.target.dataset.country;
    const type = e.target.dataset.type;
    const value = parseInt(e.target.value);

    raceState.policies[country][type] = value;

    // Update display
    document.getElementById(`${type}-${country}`).textContent = value;

    // Calculate policy effect (based on research multipliers)
    const policyMultipliers = {
        fintech: 0.015,
        infrastructure: 0.012,
        education: 0.008,
        policy: 0.010
    };
    const effect = (value * policyMultipliers[type]).toFixed(1);
    document.getElementById(`${type}-effect`).textContent = effect;

    // Calculate total budget
    const total = Object.values(raceState.policies[country]).reduce((a, b) => a + b, 0);
    const budgetEl = document.getElementById(`budget-${country}`);
    budgetEl.textContent = total;
    budgetEl.style.color = total > 100 ? '#f87171' : '#34d399';

    // Update annual budget display
    const annualBudget = (total / 10).toFixed(0);
    document.getElementById(`annual-budget-${country}`).textContent = `$${annualBudget}M/year over 10 years`;

    // Update budget bar
    const budgetBar = document.getElementById(`budget-bar-${country}`);
    budgetBar.style.width = `${Math.min(100, total)}%`;
    budgetBar.style.backgroundColor = total > 100 ? '#f87171' : total > 80 ? '#fbbf24' : '#34d399';

    // Update efficiency rating
    const efficiencyEl = document.getElementById(`efficiency-${country}`);
    let efficiencyText = 'Over Budget';
    if (total <= 100) {
        const maxAllocation = Math.max(...Object.values(raceState.policies[country]));
        const balance = maxAllocation / total;
        if (balance > 0.6) efficiencyText = 'Specialized Focus';
        else if (balance > 0.4) efficiencyText = 'Balanced Approach';
        else efficiencyText = 'Well Distributed';
    }
    efficiencyEl.textContent = efficiencyText;
    efficiencyEl.style.color = total > 100 ? '#f87171' : total > 80 ? '#fbbf24' : '#34d399';
}

function startRaceAnimation() {
    // Validate budgets
    for (const country of raceState.selectedCountries) {
        const total = Object.values(raceState.policies[country]).reduce((a, b) => a + b, 0);
        if (total > 100) {
            alert(`${allData[country].name} is over budget! Please adjust policies.`);
            return;
        }
    }

    document.getElementById('race-policies').classList.add('hidden');
    document.getElementById('race-animation').classList.remove('hidden');

    // Calculate race data for each country
    raceState.raceData = {};
    raceState.selectedCountries.forEach(code => {
        raceState.raceData[code] = calculateRaceProjection(code);
    });

    // Setup race tracks
    setupRaceTracks();

    // Start animation
    animateRace();
}

function calculateRaceProjection(code) {
    const sourceData = allData[code].digitalPayments || allData[code].bankAccount || [];
    if (sourceData.length < 2) return null;

    const sortedData = [...sourceData].sort((a, b) => a.year - b.year);
    const latestValue = sortedData[sortedData.length - 1].value;
    const latestYear = sortedData[sortedData.length - 1].year;

    // Calculate baseline growth
    const years = sortedData.map(d => d.year);
    const values = sortedData.map(d => d.value);
    const regression = calculateLinearRegression(years, values, raceState.targetYear);
    const baselineGrowthRate = regression.slope;

    // Calculate policy boost
    const policies = raceState.policies[code];
    const policyBoost = (
        policies.fintech * 0.03 +
        policies.infrastructure * 0.025 +
        policies.education * 0.02 +
        policies.policy * 0.022
    ) / 100; // Convert to percentage points per year

    const totalGrowthRate = baselineGrowthRate + policyBoost;

    // Project year by year - always project to target year for smooth animation
    const projection = [];
    let currentValue = latestValue;
    let currentYear = latestYear;

    // Always project all the way to target year for animation
    while (currentYear <= raceState.targetYear) {
        projection.push({
            year: currentYear,
            value: Math.min(100, currentValue)
        });

        currentYear++;
        currentValue += totalGrowthRate;
    }

    // Get final value (either last projection or capped at 100)
    const finalValue = projection[projection.length - 1].value;

    return {
        baseline: regression.projectedValue,
        boosted: Math.min(100, finalValue),
        projection: projection,
        growthRate: totalGrowthRate
    };
}

function setupRaceTracks() {
    const container = document.getElementById('race-tracks');
    container.innerHTML = '';

    console.log('Setting up race tracks for countries:', raceState.selectedCountries);

    raceState.selectedCountries.forEach((code, index) => {
        const track = document.createElement('div');
        track.className = 'race-track';

        const countryName = allData[code].name || code;
        const data = raceState.raceData[code];

        if (!data || !data.projection || data.projection.length === 0) {
            console.warn(`No projection data for ${code}`);
            return;
        }

        const startValue = data.projection[0].value;
        const startProgress = (startValue / raceState.target) * 100;

        console.log(`${countryName}: Start at ${startValue.toFixed(1)}%, ${data.projection.length} years of data`);

        const policies = raceState.policies[code];

        track.innerHTML = `
            <div class="track-header">
                <span class="track-flag">${getCountryFlag(code)}</span>
                <span class="track-name">${countryName}</span>
                <div class="track-metrics">
                    <div class="metric">
                        <span class="metric-label">Current:</span>
                        <span class="metric-value" id="track-percent-${code}">
                            ${startValue.toFixed(1)}%
                        </span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Growth:</span>
                        <span class="metric-value growth" id="track-growth-${code}">+0.0%/yr</span>
                    </div>
                </div>
            </div>

            <div class="track-policies">
                <small id="track-policies-${code}">
                    Fintech: $${policies.fintech}M • Infrastructure: $${policies.infrastructure}M • Education: $${policies.education}M • Policy: $${policies.policy}M
                </small>
            </div>

            <div class="track-bar">
                <!-- Progress milestones -->
                <div class="track-milestone" style="left: 25%">25%</div>
                <div class="track-milestone" style="left: 50%">50%</div>
                <div class="track-milestone" style="left: 75%">75%</div>

                <div class="track-progress" id="track-progress-${code}"
                     style="width: ${Math.min(100, startProgress)}%;
                            background: ${RACE_COLORS[index].primary};
                            transition: width 0.5s ease-out;">
                </div>
                <div class="track-target-line" style="left: ${raceState.target}%"></div>
                <div class="track-finish-line">Finish: ${raceState.target}%</div>
            </div>

            <div class="track-context">
                <small id="track-context-${code}">Race starting...</small>
            </div>
        `;

        container.appendChild(track);
    });

    document.getElementById('race-target-display').textContent = raceState.target;
    console.log('Race tracks setup complete!');
}

function animateRace() {
    const startYear = Math.max(...raceState.selectedCountries.map(code => {
        const data = allData[code].digitalPayments || allData[code].bankAccount || [];
        const sorted = [...data].sort((a, b) => b.year - a.year);
        return sorted[0]?.year || 2024;
    }));

    let currentYearIndex = 0;
    const animationSpeed = 1200; // ms per year - slower for better understanding
    let totalInvested = 0;

    // Calculate total investment across all countries
    raceState.selectedCountries.forEach(code => {
        const policies = raceState.policies[code];
        totalInvested += Object.values(policies).reduce((a, b) => a + b, 0);
    });

    const interval = setInterval(() => {
        raceState.selectedCountries.forEach(code => {
            const data = raceState.raceData[code];
            if (!data || !data.projection[currentYearIndex]) return;

            const point = data.projection[currentYearIndex];
            const progress = Math.min(100, (point.value / raceState.target) * 100);

            const progressEl = document.getElementById(`track-progress-${code}`);
            const percentEl = document.getElementById(`track-percent-${code}`);
            const growthEl = document.getElementById(`track-growth-${code}`);
            const contextEl = document.getElementById(`track-context-${code}`);

            if (progressEl && percentEl && growthEl && contextEl) {
                progressEl.style.width = `${progress}%`;
                percentEl.textContent = `${point.value.toFixed(1)}%`;
                growthEl.textContent = `+${data.growthRate.toFixed(1)}%/yr`;

                // Update context information with more educational content
                const yearsRemaining = Math.max(0, (raceState.target - point.value) / data.growthRate);
                const investedPerCountry = (totalInvested / raceState.selectedCountries.length).toFixed(0);
                const progressPercent = (point.value / raceState.target) * 100;

                let contextText;
                if (progressPercent >= 90) {
                    contextText = `Sprinting to finish! ${yearsRemaining.toFixed(1)} years left`;
                } else if (progressPercent >= 75) {
                    contextText = `Strong momentum! ${yearsRemaining.toFixed(1)} years to go`;
                } else if (progressPercent >= 50) {
                    contextText = `Steady progress: ${yearsRemaining.toFixed(1)} years remaining`;
                } else if (progressPercent >= 25) {
                    contextText = `Building momentum... ${yearsRemaining.toFixed(1)} years ahead`;
                } else {
                    contextText = `Starting strong! Long journey ahead`;
                }

                // Add educational insights
                if (currentYearIndex > 0 && currentYearIndex % 3 === 0) {
                    const earlyProgress = data.projection[Math.min(2, data.projection.length - 1)].value;
                    if (point.value > earlyProgress * 1.5) {
                        contextText += ` Policies accelerating growth!`;
                    }
                }

                contextText += ` • $${investedPerCountry}M invested`;
                contextEl.textContent = contextText;

                // Add visual effects at different progress levels
                if (progress >= 95) {
                    progressEl.style.boxShadow = `0 0 30px ${RACE_COLORS[raceState.selectedCountries.indexOf(code)].primary}`;
                    progressEl.style.transform = 'scaleY(1.2)';
                } else if (progress >= 75) {
                    progressEl.style.boxShadow = `0 0 15px ${RACE_COLORS[raceState.selectedCountries.indexOf(code)].primary}`;
                } else if (progress >= 50) {
                    progressEl.style.opacity = '0.9';
                } else {
                    progressEl.style.opacity = '0.7';
                }

                // Milestone celebrations
                if (Math.floor(point.value) % 10 === 0 && point.value > 0 && point.value < raceState.target) {
                    // Brief celebration for reaching 10% increments
                    setTimeout(() => {
                        progressEl.style.animation = 'celebrate 0.5s ease-out';
                        setTimeout(() => {
                            progressEl.style.animation = '';
                        }, 500);
                    }, 100);
                }
            }
        });

        const displayYear = startYear + currentYearIndex;
        const yearEl = document.getElementById('current-race-year');
        const investedEl = document.getElementById('total-invested');

        if (yearEl) {
            yearEl.textContent = displayYear;
        }
        if (investedEl) {
            investedEl.textContent = `$${totalInvested}M`;
        }

        // Update race progress summary
        updateRaceProgress(currentYearIndex, displayYear);

        currentYearIndex++;

        // Continue until we reach target year or max iterations
        // Increased from 15 to 20 years for longer races
        const maxIndex = Math.min(20, raceState.targetYear - startYear + 2);
        if (currentYearIndex >= maxIndex) {
            clearInterval(interval);
            setTimeout(() => showResults(), 1500); // Slightly longer delay
        }
    }, animationSpeed);
}

function updateRaceProgress(yearIndex, currentYear) {
    // Find which countries are closest to the target
    const countryProgress = raceState.selectedCountries.map(code => {
        const data = raceState.raceData[code];
        if (!data || !data.projection[yearIndex]) return null;

        const point = data.projection[yearIndex];
        return {
            code,
            name: allData[code].name || code,
            progress: (point.value / raceState.target) * 100,
            yearsToTarget: Math.max(0, (raceState.target - point.value) / data.growthRate)
        };
    }).filter(Boolean).sort((a, b) => a.yearsToTarget - b.yearsToTarget);

    if (countryProgress.length > 0) {
        const leader = countryProgress[0];
        const lastPlace = countryProgress[countryProgress.length - 1];

        // Update the info panel with race insights
        const infoPanel = document.querySelector('.race-info-panel');
        if (infoPanel && yearIndex > 2) {
            // Add a race status message every few years
            if (yearIndex % 4 === 0) {
                const statusMessages = [
                    `${leader.name} leading with ${leader.progress.toFixed(1)}% adoption`,
                    `Big gap: ${leader.name} vs ${lastPlace.name} (${(lastPlace.yearsToTarget - leader.yearsToTarget).toFixed(1)} years)`,
                    `Race heating up! ${countryProgress.filter(c => c.progress >= 75).length} countries over 75%`,
                    `${currentYear}: ${(leader.progress / (yearIndex + 1) * 100).toFixed(0)}% average annual progress`
                ];

                // Add temporary status message
                const statusEl = document.createElement('div');
                statusEl.className = 'race-status-message';
                statusEl.textContent = statusMessages[Math.floor(Math.random() * statusMessages.length)];
                statusEl.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(34, 211, 238, 0.9);
                    color: #0a0a0b;
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    z-index: 100;
                    pointer-events: none;
                    animation: fadeInOut 3s ease-in-out;
                `;

                infoPanel.style.position = 'relative';
                infoPanel.appendChild(statusEl);

                setTimeout(() => {
                    if (statusEl.parentNode) {
                        statusEl.parentNode.removeChild(statusEl);
                    }
                }, 3000);
            }
        }
    }
}

function skipToResults() {
    showResults();
}

function showResults() {
    document.getElementById('race-animation').classList.add('hidden');
    document.getElementById('race-results').classList.remove('hidden');

    // Calculate final results
    raceState.results = raceState.selectedCountries.map(code => {
        const data = raceState.raceData[code];
        const finalValue = data.boosted;
        const baseline = data.baseline;
        const improvement = finalValue - baseline;

        return {
            code,
            name: allData[code].name || code,
            value: finalValue,
            baseline: baseline,
            improvement: improvement,
            winner: finalValue >= raceState.target
        };
    }).sort((a, b) => b.value - a.value);

    // Display winner
    const winner = raceState.results[0];
    document.getElementById('winner-name').textContent = winner.name;
    document.getElementById('winner-percent').textContent = winner.value.toFixed(1);

    // Display leaderboard
    const leaderboard = document.getElementById('results-leaderboard');
    leaderboard.innerHTML = '';

    raceState.results.forEach((result, index) => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.borderColor = RACE_COLORS[index].primary;

        const medal = index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `#${index + 1}`;

        card.innerHTML = `
            <div class="result-rank">${medal}</div>
            <div class="result-info">
                <div class="result-country">
                    ${getCountryFlag(result.code)} ${result.name}
                </div>
                <div class="result-stats">
                    <div class="result-stat">
                        <span class="stat-label">Final:</span>
                        <span class="stat-value">${result.value.toFixed(1)}%</span>
                    </div>
                    <div class="result-stat">
                        <span class="stat-label">vs Baseline:</span>
                        <span class="stat-value gain">+${result.improvement.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;

        leaderboard.appendChild(card);
    });

    // Ensure reality check button has event listener attached
    attachRealityCheckListener();
}

function showRealityCheck() {
    const panel = document.getElementById('reality-check-panel');
    if (!panel) {
        console.error('Reality check panel not found');
        return;
    }

    if (!raceState.results || raceState.results.length === 0) {
        console.error('Race results not available');
        alert('Please complete a race first to see the reality check.');
        return;
    }

    panel.classList.toggle('hidden');

    if (!panel.classList.contains('hidden')) {
        populateRealityCheck();
    }
}

function populateRealityCheck() {
    const container = document.getElementById('reality-comparisons');
    if (!container) {
        console.error('Reality comparisons container not found');
        return;
    }

    if (!raceState.results || raceState.results.length === 0) {
        console.error('No results available for reality check');
        container.innerHTML = '<p>No race results available. Please complete a race first.</p>';
        return;
    }

    container.innerHTML = '';

    const insights = [];

    raceState.results.forEach((result, index) => {
        const card = document.createElement('div');
        card.className = 'reality-card';

        const confidenceLevel = calculateConfidence(result.improvement);
        const realisticNote = getRealisticNote(result.improvement);

        card.innerHTML = `
            <div class="reality-header">
                <span>${result.name}</span>
            </div>
            <div class="reality-comparison">
                <div class="reality-bar-group">
                    <div class="reality-label">Baseline (Real Data Trend)</div>
                    <div class="reality-bar">
                        <div class="reality-fill baseline" style="width: ${Math.min(100, result.baseline)}%">
                            ${result.baseline.toFixed(1)}%
                        </div>
                    </div>
                </div>
                <div class="reality-bar-group">
                    <div class="reality-label">Your Policies Result</div>
                    <div class="reality-bar">
                        <div class="reality-fill boosted" style="width: ${Math.min(100, result.value)}%; background: ${RACE_COLORS[index % RACE_COLORS.length].primary}">
                            ${result.value.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>
            <div class="reality-assessment">
                <div class="confidence-badge ${confidenceLevel.class}">
                    ${confidenceLevel.icon} ${confidenceLevel.label}
                </div>
                <p>${realisticNote}</p>
            </div>
        `;

        container.appendChild(card);

        // Add insight
        if (result.improvement > 15) {
            insights.push(`${result.name}'s +${result.improvement.toFixed(1)}% improvement is ambitious - would require major structural reforms.`);
        } else if (result.improvement > 8) {
            insights.push(`${result.name}'s result is achievable with strong policy execution and favorable conditions.`);
        } else {
            insights.push(`${result.name}'s modest gains align well with historical precedents.`);
        }
    });

    // Populate insights
    const insightsList = document.getElementById('reality-insights-list');
    insightsList.innerHTML = insights.map(insight => `<li>${insight}</li>`).join('');
}

function calculateConfidence(improvement) {
    if (improvement < 5) {
        return { label: 'Highly Realistic', class: 'high', icon: '' };
    } else if (improvement < 10) {
        return { label: 'Realistic', class: 'medium', icon: '' };
    } else if (improvement < 15) {
        return { label: 'Optimistic', class: 'low', icon: '' };
    } else {
        return { label: 'Very Ambitious', class: 'very-low', icon: '' };
    }
}

function getRealisticNote(improvement) {
    if (improvement < 5) {
        return 'This level of improvement is very realistic and aligns with successful fintech adoption stories.';
    } else if (improvement < 10) {
        return 'Achievable with strong government support and private sector investment. Similar to Kenya\'s M-Pesa success.';
    } else if (improvement < 15) {
        return 'This would require exceptional circumstances - major infrastructure investment, regulatory breakthroughs, and sustained economic growth.';
    } else {
        return 'While theoretically possible, improvements of this magnitude have rarely been seen without major disruptions like COVID-19 forcing digital adoption.';
    }
}

function resetRace() {
    document.getElementById('reality-check-panel').classList.add('hidden');
    initializeRaceSetup();
}

function shareRaceResults() {
    const winner = raceState.results[0];
    const text = `Country Race Results!\n\n${winner.name} wins with ${winner.value.toFixed(1)}% digital adoption!\n\nI just simulated the future of cashless economies. Try it yourself!`;

    if (navigator.share) {
        navigator.share({
            title: 'Country Race Simulator Results',
            text: text
        }).catch(() => {
            copyToClipboard(text);
        });
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Results copied to clipboard!');
    }).catch(() => {
        alert('Share: ' + text);
    });
}
