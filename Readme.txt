How to Customize the Dashboard
Introduction
This guide shows step-by-step how to change elements in the code. Open files in a text editor like VS Code.
Step 1: Change Theme Color 🎨

Open styles.css.
Find .golden { color: #FFD700; }
Change #FFD700 to your color (e.g., #FF0000 for red).
Save and refresh browser.

Step 2: Add a New Chart 📊

Open daily_sales_dashboard.html (or national).
Add <canvas id="newChart"></canvas> in .charts div.
In script.js, in updateDashboard, add: charts.newChart = new Chart(document.getElementById('newChart'), { type: 'bar', data: { labels: [...], datasets: [...] } });
Save and refresh.

Step 3: Modify KPI Card 🔢

Open daily_sales_dashboard.html.
Find a card div, e.g., Chemist Count: 
Change text or icon (e.g., fa-user to fa-star).
In script.js, update calculation if needed.
Save.

Step 4: Update Dummy Data 🗃️

Open script.js.
Find dummyData array.
Add/edit objects with new data (e.g., new zone: 'Karachi').
Save.

Step 5: Change Filter Options ⚙️

Open script.js.
In loadData, modify population, e.g., add custom teams.
Save.

Step 6: Adjust Animation ✨

Open styles.css.
Find @keyframes glow.
Change box-shadow values or duration.
Save.

Step 7: Add Validation to Upload ❌

Open upload.html script.
In reader.onload, add more if (isNaN(obj.UnitSales)) errors.push(...);
Save.

Follow these for any changes. If errors, check console (F12 in browser).