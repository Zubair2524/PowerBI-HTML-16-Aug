// Supabase Configuration
const SUPABASE_URL = 'https://nfwuztbyvbasaqbpyojr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md3V6dGJ5dmJhc2FxYnB5b2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNjQ4NzcsImV4cCI6MjA3MDY0MDg3N30.DhEvb6H9kczxdD1N9_d6DmDkk6_9sUGZfKSFk7hYLdQ';

// Global Variables
let currentUser = null;
let dashboardData = {
    brands: ['Brand A', 'Brand B', 'Brand C', 'Brand D', 'Brand E'],
    teams: ['Dermocare 1', 'Dermocare 2', 'Dermocare 3', 'Femicare 1', 'Femicare 2', 'Khyber 1', 'Khyber 2', 'Khyber 3', 'Medix', 'Optix', 'Elantis'],
    zones: ['Punjab', 'Sindh', 'KPK', 'Balochistan'],
    currentFilters: {}
};

let charts = {};

// Utility Functions
function formatCurrency(amount) {
    return `Rs. ${amount.toLocaleString()}`;
}

function formatPercentage(value) {
    return `${value.toFixed(1)}%`;
}

function getCurrentDate() {
    return new Date();
}

function getDaysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

function getDaysPassed() {
    const today = new Date();
    return today.getDate();
}

function getDaysRemaining() {
    const today = new Date();
    const daysInMonth = getDaysInMonth(today.getMonth() + 1, today.getFullYear());
    return daysInMonth - today.getDate();
}

// Supabase Functions
async function supabaseRequest(endpoint, method = 'GET', data = null) {
    const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };

    const config = {
        method,
        headers
    };

    if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, config);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Supabase request error:', error);
        throw error;
    }
}

async function saveUserToDatabase(userData) {
    // First save to localStorage immediately
    const userWithTimestamp = {
        ...userData,
        lastLogin: new Date().toISOString(),
        visitCount: 1
    };
    
    // Check if user exists in localStorage
    const existingLocalUser = localStorage.getItem('powerBiUser');
    if (existingLocalUser) {
        const parsedUser = JSON.parse(existingLocalUser);
        userWithTimestamp.visitCount = (parsedUser.visitCount || 0) + 1;
    }
    
    localStorage.setItem('powerBiUser', JSON.stringify(userWithTimestamp));
    
    // Then try to save to Supabase (non-blocking)
    try {
        const existingUsers = await supabaseRequest(`PowerBi?FullName=eq.${encodeURIComponent(userData.fullName)}`);
        
        if (existingUsers.length > 0) {
            const userId = existingUsers[0].id;
            const updatedData = {
                last_login: new Date().toISOString(),
                visit_count: userWithTimestamp.visitCount,
                Designation: userData.designation,
                Team: userData.team
            };
            
            await supabaseRequest(`PowerBi?id=eq.${userId}`, 'PATCH', updatedData);
            
            // Update localStorage with Supabase data
            const finalUserData = { ...existingUsers[0], ...updatedData };
            localStorage.setItem('powerBiUser', JSON.stringify(finalUserData));
            return finalUserData;
        } else {
            const newUserData = {
                FullName: userData.fullName,
                Designation: userData.designation,
                Team: userData.team,
                visit_count: userWithTimestamp.visitCount
            };
            
            const result = await supabaseRequest('PowerBi', 'POST', newUserData);
            
            // Update localStorage with Supabase data
            if (result && result.length > 0) {
                localStorage.setItem('powerBiUser', JSON.stringify(result[0]));
                return result[0];
            }
            return userWithTimestamp;
        }
    } catch (error) {
        console.error('Error saving user to database:', error);
        // Don't throw error, just return the locally saved data
        console.log('Continuing with locally saved data');
        return userWithTimestamp;
    }
}

// Landing Page Functions
function initializeLandingPage() {
    const userForm = document.getElementById('userForm');
    const loadingSpinner = document.getElementById('loadingSpinner');
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('powerBiUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        redirectToDashboard();
        return;
    }
    
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                fullName: document.getElementById('fullName').value.trim(),
                designation: document.getElementById('designation').value.trim(),
                team: document.getElementById('team').value.trim()
            };
            
            if (!formData.fullName) {
                alert('Please enter your full name');
                return;
            }
            
            try {
                userForm.style.display = 'none';
                loadingSpinner.style.display = 'block';
                
                const userData = await saveUserToDatabase(formData);
                currentUser = userData;
                
                setTimeout(() => {
                    redirectToDashboard();
                }, 1500);
                
            } catch (error) {
                console.error('Error in form submission:', error);
                // Even if there's an error, continue with locally saved data
                setTimeout(() => {
                    redirectToDashboard();
                }, 1500);
            }
        });
    }
}

function redirectToDashboard() {
    window.location.href = 'dashboard.html';
}

// Dashboard Functions
function initializeDashboard() {
    // Check if user is logged in
    const savedUser = localStorage.getItem('powerBiUser');
    if (!savedUser) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(savedUser);
    
    // Set user name in header
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = currentUser.FullName;
    }
    
    // Initialize logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Initialize filters
    initializeFilters();
    
    // Initialize KPI cards
    initializeKPICards();
    
    // Initialize charts
    initializeCharts();
    
    // Initialize table
    initializeTable();
    
    // Update dashboard with initial data
    updateDashboard();
}

function logout() {
    localStorage.removeItem('powerBiUser');
    window.location.href = 'index.html';
}

function initializeFilters() {
    const teamFilter = document.getElementById('teamFilter');
    const monthFilter = document.getElementById('monthFilter');
    const dayFilter = document.getElementById('dayFilter');
    const productFilter = document.getElementById('productFilter');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    // Populate team filter
    if (teamFilter) {
        dashboardData.teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            teamFilter.appendChild(option);
        });
    }
    
    // Populate day filter
    if (dayFilter) {
        for (let i = 1; i <= 31; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            dayFilter.appendChild(option);
        }
    }
    
    // Add event listeners
    [teamFilter, monthFilter, dayFilter, productFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', applyFilters);
        }
    });
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
}

function applyFilters() {
    dashboardData.currentFilters = {
        team: document.getElementById('teamFilter').value,
        month: document.getElementById('monthFilter').value,
        day: document.getElementById('dayFilter').value,
        product: document.getElementById('productFilter').value
    };
    
    updateDashboard();
}

function clearAllFilters() {
    document.getElementById('teamFilter').value = '';
    document.getElementById('monthFilter').value = '';
    document.getElementById('dayFilter').value = '';
    document.getElementById('productFilter').value = '';
    
    dashboardData.currentFilters = {};
    updateDashboard();
}

function initializeKPICards() {
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach(card => {
        card.addEventListener('click', () => {
            const kpiType = card.getAttribute('data-kpi');
            handleKPICardClick(kpiType);
        });
    });
}

function handleKPICardClick(kpiType) {
    // Add visual feedback
    const card = document.querySelector(`[data-kpi="${kpiType}"]`);
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
        card.style.transform = '';
    }, 150);
    
    // Update dashboard based on KPI selection
    console.log(`KPI clicked: ${kpiType}`);
    updateDashboard();
}

function updateKPIValues() {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const selectedMonth = dashboardData.currentFilters.month;
    
    let daysPassed, daysRemaining;
    
    if (selectedMonth && selectedMonth == currentMonth) {
        // MTD data
        daysPassed = getDaysPassed();
        daysRemaining = getDaysRemaining();
    } else if (selectedMonth) {
        // Selected month data
        const daysInSelectedMonth = getDaysInMonth(selectedMonth, today.getFullYear());
        daysPassed = daysInSelectedMonth;
        daysRemaining = 0;
    } else {
        // YTD data
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        daysPassed = Math.ceil((today - startOfYear) / (1000 * 60 * 60 * 24));
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        daysRemaining = Math.ceil((endOfYear - today) / (1000 * 60 * 60 * 24));
    }
    
    // Generate dynamic data based on filters
    const baseData = generateKPIData();
    
    document.getElementById('chemistCount').textContent = baseData.chemistCount.toLocaleString();
    document.getElementById('daysPassed').textContent = daysPassed;
    document.getElementById('daysRemaining').textContent = daysRemaining;
    document.getElementById('runRate').textContent = formatCurrency(baseData.runRate);
    document.getElementById('valueSales').textContent = formatCurrency(baseData.valueSales);
    document.getElementById('valueTarget').textContent = formatCurrency(baseData.valueTarget);
    document.getElementById('valuePercentage').textContent = formatPercentage(baseData.valuePercentage);
    document.getElementById('valueGrowth').textContent = `+${formatPercentage(baseData.valueGrowth)}`;
    document.getElementById('unitSales').textContent = baseData.unitSales.toLocaleString();
    document.getElementById('unitTarget').textContent = baseData.unitTarget.toLocaleString();
    document.getElementById('unitPercentage').textContent = formatPercentage(baseData.unitPercentage);
    document.getElementById('unitGrowth').textContent = `+${formatPercentage(baseData.unitGrowth)}`;
}

function generateKPIData() {
    // Generate realistic data based on current filters
    const baseMultiplier = Object.keys(dashboardData.currentFilters).length > 0 ? 0.3 : 1;
    
    return {
        chemistCount: Math.floor(1245 * baseMultiplier + Math.random() * 200),
        runRate: Math.floor(125450 * baseMultiplier + Math.random() * 50000),
        valueSales: Math.floor(2007200 * baseMultiplier + Math.random() * 500000),
        valueTarget: Math.floor(2500000 * baseMultiplier),
        valuePercentage: 80.3 + Math.random() * 10 - 5,
        valueGrowth: 15.2 + Math.random() * 10 - 5,
        unitSales: Math.floor(45230 * baseMultiplier + Math.random() * 10000),
        unitTarget: Math.floor(55000 * baseMultiplier),
        unitPercentage: 82.2 + Math.random() * 10 - 5,
        unitGrowth: 12.8 + Math.random() * 8 - 4
    };
}

function initializeCharts() {
    initializeTopBrandsValueChart();
    initializeTopBrandsUnitChart();
    initializeDailyTrendChart();
    initializeMonthlyTrendChart();
    initializeZonalShareChart();
    initializeTerritoryChart();
}

function initializeTopBrandsValueChart() {
    const ctx = document.getElementById('topBrandsValueChart');
    if (!ctx) return;
    
    charts.topBrandsValue = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dashboardData.brands,
            datasets: [{
                label: 'Value Sales (Rs.)',
                data: [450000, 380000, 320000, 280000, 250000],
                backgroundColor: [
                    'rgba(255, 215, 0, 0.8)',
                    'rgba(255, 165, 0, 0.8)',
                    'rgba(255, 140, 0, 0.8)',
                    'rgba(255, 69, 0, 0.8)',
                    'rgba(255, 99, 71, 0.8)'
                ],
                borderColor: [
                    '#FFD700',
                    '#FFA500',
                    '#FF8C00',
                    '#FF4500',
                    '#FF6347'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#FFD700'
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const brand = dashboardData.brands[index];
                    handleChartClick('brand', brand);
                }
            }
        }
    });
}

function initializeTopBrandsUnitChart() {
    const ctx = document.getElementById('topBrandsUnitChart');
    if (!ctx) return;
    
    charts.topBrandsUnit = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: dashboardData.brands,
            datasets: [{
                label: 'Unit Sales',
                data: [12500, 10800, 9200, 8100, 7500],
                backgroundColor: 'rgba(255, 215, 0, 0.6)',
                borderColor: '#FFD700',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#FFD700'
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const brand = dashboardData.brands[index];
                    handleChartClick('brand', brand);
                }
            }
        }
    });
}

function initializeDailyTrendChart() {
    const ctx = document.getElementById('dailyTrendChart');
    if (!ctx) return;
    
    const dailyData = generateDailyTrendData();
    
    charts.dailyTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyData.labels,
            datasets: [{
                label: 'Daily Sales (Rs.)',
                data: dailyData.values,
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#FFD700'
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function initializeMonthlyTrendChart() {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;
    
    const monthlyData = generateMonthlyTrendData();
    
    charts.monthlyTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Monthly Sales (Rs.)',
                data: monthlyData.values,
                borderColor: '#FFA500',
                backgroundColor: 'rgba(255, 165, 0, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#FFD700'
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ffffff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

function initializeZonalShareChart() {
    const ctx = document.getElementById('zonalShareChart');
    if (!ctx) return;
    
    charts.zonalShare = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dashboardData.zones,
            datasets: [{
                data: [35, 28, 22, 15],
                backgroundColor: [
                    'rgba(255, 215, 0, 0.8)',
                    'rgba(255, 165, 0, 0.8)',
                    'rgba(255, 140, 0, 0.8)',
                    'rgba(255, 69, 0, 0.8)'
                ],
                borderColor: [
                    '#FFD700',
                    '#FFA500',
                    '#FF8C00',
                    '#FF4500'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#FFD700'
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const zone = dashboardData.zones[index];
                    handleChartClick('zone', zone);
                }
            }
        }
    });
}

function initializeTerritoryChart() {
    const ctx = document.getElementById('territoryChart');
    if (!ctx) return;
    
    charts.territory = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Performance', 'Growth', 'Targets', 'Coverage', 'Quality'],
            datasets: [{
                label: 'Territory Metrics',
                data: [85, 78, 92, 88, 76],
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#FFD700',
                pointBorderColor: '#FFA500',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#FFD700'
                    }
                }
            },
            scales: {
                r: {
                    ticks: {
                        color: '#ffffff',
                        backdropColor: 'transparent'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.2)'
                    },
                    angleLines: {
                        color: 'rgba(255, 255, 255, 0.2)'
                    }
                }
            }
        }
    });
}

function generateDailyTrendData() {
    const labels = [];
    const values = [];
    const today = new Date();
    
    for (let i = 59; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        labels.push(date.getDate() + '/' + (date.getMonth() + 1));
        values.push(Math.floor(50000 + Math.random() * 100000));
    }
    
    return { labels, values };
}

function generateMonthlyTrendData() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [];
    const values = [];
    const today = new Date();
    
    for (let i = 12; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(today.getMonth() - i);
        labels.push(months[date.getMonth()] + ' ' + date.getFullYear().toString().substr(2));
        values.push(Math.floor(1500000 + Math.random() * 1000000));
    }
    
    return { labels, values };
}

function handleChartClick(type, value) {
    console.log(`Chart clicked: ${type} = ${value}`);
    
    // Update filters based on chart selection
    if (type === 'brand') {
        document.getElementById('productFilter').value = value;
        dashboardData.currentFilters.product = value;
    }
    
    // Visual feedback
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        container.style.transform = 'scale(0.98)';
        setTimeout(() => {
            container.style.transform = '';
        }, 150);
    });
    
    updateDashboard();
}

function initializeTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    // Add click event listener to table rows
    tableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row) {
            handleTableRowClick(row);
        }
    });
    
    updateTable();
}

function updateTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    const tableData = generateTableData();
    tableBody.innerHTML = '';
    
    tableData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.team}</td>
            <td>${row.chemist}</td>
            <td>${row.manager}</td>
            <td>${formatCurrency(row.valueSales)}</td>
            <td>${formatCurrency(row.valueTarget)}</td>
            <td>${formatPercentage(row.valuePercent)}</td>
            <td>+${formatPercentage(row.valueGrowth)}</td>
            <td>${row.unitSales.toLocaleString()}</td>
            <td>${row.unitTarget.toLocaleString()}</td>
            <td>${formatPercentage(row.unitPercent)}</td>
            <td>+${formatPercentage(row.unitGrowth)}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function generateTableData() {
    const teams = dashboardData.teams;
    const data = [];
    
    teams.forEach((team, index) => {
        for (let i = 0; i < 3; i++) {
            data.push({
                team: team,
                chemist: `Dr. ${['Ahmed', 'Ali', 'Hassan', 'Fatima', 'Ayesha', 'Omar'][Math.floor(Math.random() * 6)]} ${['Khan', 'Shah', 'Malik', 'Sheikh', 'Qureshi'][Math.floor(Math.random() * 5)]}`,
                manager: `${['TM', 'ASM', 'SM'][Math.floor(Math.random() * 3)]} ${['Rashid', 'Imran', 'Saleem', 'Nadia', 'Sara'][Math.floor(Math.random() * 5)]}`,
                valueSales: Math.floor(150000 + Math.random() * 200000),
                valueTarget: Math.floor(200000 + Math.random() * 150000),
                valuePercent: 70 + Math.random() * 30,
                valueGrowth: Math.random() * 20,
                unitSales: Math.floor(3000 + Math.random() * 4000),
                unitTarget: Math.floor(4000 + Math.random() * 3000),
                unitPercent: 65 + Math.random() * 35,
                unitGrowth: Math.random() * 25
            });
        }
    });
    
    // Apply filters
    let filteredData = data;
    if (dashboardData.currentFilters.team) {
        filteredData = filteredData.filter(row => row.team === dashboardData.currentFilters.team);
    }
    
    return filteredData.slice(0, 20); // Limit to 20 rows for performance
}

function handleTableRowClick(row) {
    // Add visual feedback
    row.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
    setTimeout(() => {
        row.style.backgroundColor = '';
    }, 300);
    
    console.log('Table row clicked');
    updateDashboard();
}

function updateDashboard() {
    // Update KPI values
    updateKPIValues();
    
    // Update charts with new data
    updateChartData();
    
    // Update table
    updateTable();
    
    // Add animation classes
    const elements = document.querySelectorAll('.kpi-card, .chart-container');
    elements.forEach(element => {
        element.classList.add('fade-in');
        setTimeout(() => {
            element.classList.remove('fade-in');
        }, 500);
    });
}

function updateChartData() {
    // Update chart data based on current filters
    Object.keys(charts).forEach(chartKey => {
        const chart = charts[chartKey];
        if (chart && chart.data && chart.data.datasets) {
            // Simulate data changes based on filters
            chart.data.datasets.forEach(dataset => {
                if (dataset.data) {
                    dataset.data = dataset.data.map(value => {
                        const variation = 0.8 + Math.random() * 0.4; // ±20% variation
                        return Math.floor(value * variation);
                    });
                }
            });
            chart.update('active');
        }
    });
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const currentFile = currentPath.split('/').pop() || 'index.html';
    
    if (currentFile === 'dashboard.html') {
        initializeDashboard();
    } else {
        initializeLandingPage();
    }
});

// Add global error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

// Add responsiveness handler
window.addEventListener('resize', () => {
    Object.keys(charts).forEach(chartKey => {
        if (charts[chartKey]) {
            charts[chartKey].resize();
        }
    });
});