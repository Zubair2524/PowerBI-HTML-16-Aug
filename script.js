const supabase = createClient('https://nfwuztbyvbasaqbpyojr.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5md3V6dGJ5dmJhc2FxYnB5b2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNjQ4NzcsImV4cCI6MjA3MDY0MDg3N30.DhEvb6H9kczxdD1N9_d6DmDkk6_9sUGZfKSFk7hYLdQ');

let allData = [];
let filteredData = [];
let charts = {};

const dummyData = [
    { team: 'Dermocare 1', bu: 'BU1', zone: 'Lahore', brick: 'Brick1', chemist_name: 'ChemistA', tm: 'TM1', asm: 'ASM1', sm: 'SM1', value_sales: 10000, value_target: 15000, unit_sales: 100, unit_target: 150, value_ly_sales: 9000, unit_ly_sales: 90, date: new Date('2025-08-01'), month: 'August', day: 1, product: 'Product1', brand: 'BrandA' },
    // Add more dummy rows (e.g., 50+ for testing various brands, months, zones like Karachi, Peshawar, etc.)
    { team: 'Khyber 1', bu: 'BU2', zone: 'Peshawar', brick: 'Brick2', chemist_name: 'ChemistB', tm: 'TM2', asm: 'ASM2', sm: 'SM2', value_sales: 12000, value_target: 18000, unit_sales: 120, unit_target: 180, value_ly_sales: 11000, unit_ly_sales: 110, date: new Date('2025-08-16'), month: 'August', day: 16, product: 'Product2', brand: 'BrandB' },
    // ... (enrich with data for all teams: Dermocare 1-3, Femicare 1-2, Khyber 1-3, Medix, Optix, Elantis; months Jan-Aug 2025; brands A-E; etc.)
];

async function loadData() {
    const { data, error } = await supabase.from('sales_data').select('*');
    allData = data && data.length ? data : dummyData;
    filteredData = [...allData];
    // Populate filters with unique values
    const teams = [...new Set(allData.map(d => d.team))]; // e.g., Dermocare 1, etc.
    document.getElementById('teamFilter').innerHTML += teams.map(t => `<option>${t}</option>`).join('');
    // Similar for other filters: months, days, products, tms, asms, sms, bus, chemists, bricks
}

function updateDashboard() {
    // Apply filters
    filteredData = allData.filter(d => {
        // Filter logic based on select values, e.g., if monthFilter.value, filter d.month === value
        // If month selected and it's current (August), use MTD (days <=16); else YTD
        const currentDate = new Date('2025-08-16');
        const monthSelected = document.getElementById('monthFilter').value;
        if (monthSelected) {
            if (monthSelected === 'August') return d.date <= currentDate; // MTD
            return d.month === monthSelected;
        }
        return true; // YTD
    });
    // Calculate KPIs
    const chemistCount = new Set(filteredData.map(d => d.chemist_name)).size;
    document.getElementById('chemistCount').textContent = chemistCount;
    // Similar calcs: sum value_sales, etc.; % = (sales/target)*100; growth = ((sales - ly)/ly)*100
    // Run rate = total sales / days passed
    const daysPassed = 16; // Or dynamic new Date().getDate()
    document.getElementById('daysPassed').textContent = daysPassed;
    document.getElementById('daysRemaining').textContent = 31 - daysPassed; // August

    // Update table
    const tbody = document.getElementById('dataTable').querySelector('tbody');
    tbody.innerHTML = filteredData.map(d => `<tr onclick="filterByRow('${d.brand}')"><td>${d.team}</td><td>${d.bu}</td><td>${d.zone}</td><td>${d.brick}</td><td>${d.chemist_name}</td><td>${d.tm}</td><td>${d.asm}</td><td>${d.sm}</td><td>${d.value_sales} Rs.</td><td>${d.value_target}</td><td>${((d.value_sales/d.value_target)*100).toFixed(2)}%</td><td>${(((d.value_sales - d.value_ly_sales)/d.value_ly_sales)*100).toFixed(2)}%</td><td>${d.unit_sales}</td><td>${d.unit_target}</td><td>${((d.unit_sales/d.unit_target)*100).toFixed(2)}%</td><td>${(((d.unit_sales - d.unit_ly_sales)/d.unit_ly_sales)*100).toFixed(2)}%</td></tr>`).join('');

    // Update charts (destroy old, create new)
    Object.values(charts).forEach(c => c.destroy());
    // For daily dashboard:
    if (window.location.href.includes('daily')) {
        charts.dailyTrendLine = new Chart(document.getElementById('dailyTrendLine'), { type: 'line', data: { labels: ['Day1', 'Day2' /* from data */], datasets: [{ label: 'Daily Sales', data: [/* sums */] }] }, options: { animation: { duration: 2000 } } });
        charts.topBrandsBar = new Chart(document.getElementById('topBrandsBar'), { type: 'bar', data: { /* top 5 brands value */ }, options: { onClick: (e) => { const brand = e.chart.data.labels[e.chart.getElementsAtEventForMode(e, 'index', { intersect: true })[0].index]; filterByBrand(brand); } } });
        // Similar for other charts: topUnitsBar (bar), zonalPie (pie), brandDonut (doughnut), dailyScatter (scatter), zonalArea (line with fill: 'origin' for area)
    } else {
        // National: monthlyTrendLine (line), zonalTrendArea (line fill), topBrandsBar (bar), topUnitsPolar (polarArea), brandShareDonut (doughnut), zonePie (pie), nationalScatter (scatter)
        charts.monthlyTrendLine = new Chart(document.getElementById('monthlyTrendLine'), { type: 'line', data: { labels: ['Jan', 'Feb' /* 13 months */], datasets: [{ label: 'Monthly Sales', data: [/* sums */] }] }, options: { animation: { duration: 2000 } } });
        // etc.
    }
}

function filterByBrand(brand) {
    // Set filters or directly filterData where d.brand === brand, then updateDashboard()
}

function loadDashboard(type) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) window.location.href = 'index.html';
    document.getElementById('userName').textContent = user.fullName;
    loadData().then(() => {
        updateDashboard();
        // Add event listeners to filters: onchange = updateDashboard
        document.querySelectorAll('select').forEach(s => s.addEventListener('change', updateDashboard));
        document.getElementById('clearFilters').addEventListener('click', () => {
            document.querySelectorAll('select').forEach(s => s.value = '');
            updateDashboard();
        });
    });

}

