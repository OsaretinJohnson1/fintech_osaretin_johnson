# Open Banking Adoption & Cashless Future Simulator

A comprehensive fintech dashboard that visualizes Open Banking adoption metrics and simulates cashless future scenarios using real World Bank data.

## 🌍 Project Overview

This project combines Open Banking adoption metrics with a cashless future simulator to show how digital finance and open banking–enabling factors drive financial inclusion across countries. Using public World Bank data, the site visualizes current adoption trends and projects how close countries are to a cashless, open-banking-ready future.

## 🎯 Key Features

- **5 Interactive Visualizations**: Line charts, bar charts, doughnut charts, and projection simulations
- **Real-World Data**: Uses World Bank Open Data API for credible, transparent data
- **Future Projections**: Interactive simulator that projects digital payment adoption trends
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop devices
- **Open Banking Focus**: Demonstrates how countries with higher digital adoption are better positioned for open banking ecosystems

## 📊 Data Source

**API**: [World Bank Open Data API](https://data.worldbank.org/)

All indicators are publicly available and widely used in fintech, open banking, and financial inclusion research.

### Data Indicators Used (Open Banking Enablers)

- **Bank Account Ownership** (`GFDD.OI.02`): % of adults with a bank account
- **Mobile Money Account Ownership** (`FM.LBL.BMNY.ZG`): Mobile money account ownership
- **Digital Payments Usage**: Account at financial institution or mobile money service
- **Internet Access** (`IT.NET.USER.ZS`): % of population with internet access

These indicators represent the foundations of open banking ecosystems.

## 📈 Visualizations

### 1️⃣ Line Chart – Financial Inclusion Growth

**What it shows**: Growth of bank account ownership over time (per country)

**Why it matters**: Open banking cannot exist without broad access to bank accounts.

### 2️⃣ Bar Chart – Digital Payments Adoption

**What it shows**: Digital payment usage by country

**Why it matters**: Digital payments are a key driver of API-based financial services and fintech innovation.

### 3️⃣ Doughnut Chart – Cash vs Digital Banking

**What it shows**: Mobile money vs traditional banking usage

**Why it matters**: Highlights how countries are shifting toward cashless, API-driven financial systems.

### 4️⃣ Projection Line Chart – Cashless Future Simulator 🔮

**What it shows**: Projected growth of digital payments based on historical trends

**User interaction**:
- Select a country
- Select a future year (2025–2035)

**Why it's cool**: Transforms static data into a future-facing fintech simulation.

### 5️⃣ Data Table – Transparency Layer

**What it shows**: Raw indicator values by country and year

**Why it matters**: Shows credibility, transparency, and good data ethics.

## 🧠 Open Banking Narrative

Open banking relies on secure data sharing, digital infrastructure, and widespread access to financial services. This dashboard demonstrates how countries with higher digital adoption and financial inclusion are better positioned to transition toward cashless, open banking–enabled financial ecosystems.

## 🛠️ Technical Stack

- **HTML5**: Semantic markup
- **CSS3**: Responsive design with Flexbox and CSS Grid
- **Vanilla JavaScript**: No frameworks, pure ES6+
- **Chart.js**: Professional data visualization library
- **World Bank API**: Real-time financial data

## 📱 Responsive Design

- **Mobile** (< 768px): Stacked charts, dropdown selectors, single column layout
- **Tablet** (768px - 1024px): 2-column grid layout
- **Desktop** (> 1024px): Full dashboard grid (3-4 columns)

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for API calls)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fintech_osaretin_johnson.git
```

2. Navigate to the project directory:
```bash
cd fintech_osaretin_johnson
```

3. Open `index.html` in your web browser:
   - Simply double-click the file, or
   - Use a local server (recommended):
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx http-server
     ```

4. Access the dashboard:
   - If using a server: `http://localhost:8000`
   - If opening directly: File path in browser

## 📝 Project Structure

```
fintech_osaretin_johnson/
├── index.html          # Main HTML structure
├── styles.css          # Responsive CSS styling
├── script.js           # JavaScript logic and API integration
└── README.md           # Project documentation
```

## 🔧 Technical Requirements (All Covered ✅)

- ✅ Vanilla HTML, CSS, JavaScript (no frameworks)
- ✅ `fetch()` with async/await
- ✅ Chart.js (5 charts minimum)
- ✅ Loading state ("Loading data...")
- ✅ Error handling ("Unable to fetch data")
- ✅ Responsive design (Flexbox/Grid)
- ✅ GitHub Pages ready (static files)

## 🌐 Deployment

### GitHub Pages

1. Push your code to a GitHub repository
2. Go to repository Settings → Pages
3. Select the main branch as source
4. Your site will be available at `https://yourusername.github.io/fintech_osaretin_johnson`

## 🎨 Features

- **Real-time Data**: Fetches latest data from World Bank API
- **Interactive Controls**: Country and year selectors for projections
- **Search & Sort**: Data table with search and sorting capabilities
- **Error Handling**: Graceful error messages with retry functionality
- **Loading States**: Visual feedback during data loading
- **Responsive Charts**: Charts automatically resize for different screen sizes

## 🔍 Why This Project Stands Out

- Feels like a real fintech product
- Clearly aligned with Open Banking
- Uses real, credible data
- Includes interactive forecasting
- Easy to explain and defend

## 📚 API Documentation

The project uses the World Bank Open Data API v2:
- Base URL: `https://api.worldbank.org/v2`
- Format: JSON
- CORS: Supported

Example endpoint:
```
https://api.worldbank.org/v2/country/USA/indicator/GFDD.OI.02?format=json&date=2010:2023
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👤 Author

**Osaretin Johnson**

## 🔗 Links

- [World Bank Open Data](https://data.worldbank.org/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Project Repository](https://github.com/yourusername/fintech_osaretin_johnson)

---

## What is Fintech?

Fintech, short for financial technology, refers to the innovative use of technology to improve and automate financial services. It encompasses a wide range of applications including digital payments, mobile banking, cryptocurrency, investment platforms, peer-to-peer lending, and insurance technology. Fintech companies leverage software, algorithms, and digital platforms to make financial services more accessible, efficient, and user-friendly, often disrupting traditional banking and financial institutions by offering faster, cheaper, and more convenient alternatives.
