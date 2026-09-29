# Bharat Insights

Build a production-ready AI-powered Data Analysis and Data Visualization web application designed specifically for Indian companies.

PROJECT NAME:
Bharat Analytics AI

MAIN GOAL:
Create an intelligent business analytics platform where an Indian company can upload CSV, Excel, JSON, or connect database data, and the AI automatically analyzes the data, identifies trends and anomalies, generates business insights, and creates professional interactive visualizations.

TARGET USERS:
- Indian startups
- Small and medium businesses (SMEs)
- Large Indian companies
- Finance teams
- Sales teams
- Marketing teams
- HR teams
- Operations teams
- Business analysts
- Management and founders

CORE FEATURES:

1. DATA UPLOAD
Support:
- CSV
- XLSX / Excel
- XLS
- JSON
- TXT
- SQL database connections

After upload:
- Detect columns automatically
- Detect data types
- Detect missing values
- Detect duplicate records
- Detect outliers
- Detect incorrect formats
- Detect date columns
- Detect numerical and categorical columns
- Generate an automatic data-quality report

2. AI DATA ANALYSIS

Add an AI Analyst that can understand uploaded business data.

Users should be able to ask questions in natural language such as:

"Show me monthly sales."
"Which state generated the highest revenue?"
"Which product has the highest profit?"
"Compare sales between Maharashtra and Madhya Pradesh."
"Why did revenue decrease in August?"
"Show my top 10 customers."
"Calculate month-over-month growth."
"Find unusual transactions."
"Which products are losing money?"
"Predict next month's sales."
"Give me a management summary."

The AI should:
- Analyze the actual dataset
- Generate SQL/Pandas-style analytical operations internally
- Explain calculations
- Never invent numbers
- Clearly state when data is insufficient
- Show the source columns used for calculations
- Allow users to inspect the underlying data/query/calculation

3. AUTOMATIC VISUALIZATION

Automatically select the most appropriate chart based on the question and data.

Support:

- Bar chart
- Horizontal bar chart
- Grouped bar chart
- Stacked bar chart
- Line chart
- Area chart
- Pie chart
- Donut chart
- Histogram
- Scatter plot
- Bubble chart
- Heatmap
- Box plot
- Funnel chart
- KPI cards
- Gauge chart
- Waterfall chart
- Treemap
- Pareto chart
- Combo chart
- Geographic/state map of India

Examples:

Sales by state → India map / bar chart
Monthly revenue → line chart
Product contribution → bar chart
Market share → donut chart
Profit distribution → histogram
Sales vs profit → scatter plot
Department performance → grouped bar chart

Charts must be:
- Interactive
- Zoomable
- Filterable
- Responsive
- Exportable as PNG/PDF
- Downloadable as CSV where applicable
- Suitable for business presentations

4. INDIAN BUSINESS SUPPORT

Design the platform around Indian business requirements.

Support:
- INR (₹)
- Lakhs
- Crores
- Thousands
- Indian number formatting

Examples:
₹1,25,000
₹12.5 Lakh
₹4.2 Crore

Support Indian geography:
- States
- Union Territories
- Major cities
- Regions
- PIN codes where available

Support common Indian business fields:
- GSTIN
- PAN
- Invoice number
- HSN/SAC
- Customer ID
- Vendor ID
- Product ID
- UPI/payment method
- Bank/payment data
- Sales
- Purchases
- Expenses
- Revenue
- Profit
- Inventory
- Employees
- Attendance
- Payroll
- Leads
- Customers

Do NOT expose sensitive personal information unnecessarily.

5. BUSINESS DASHBOARD

Create an executive dashboard containing:

- Total Revenue
- Total Sales
- Gross Profit
- Net Profit
- Profit Margin
- Total Orders
- Average Order Value
- Customer Count
- New Customers
- Returning Customers
- Expenses
- Inventory Value

Use KPI cards with:
- Current value
- Previous period
- Percentage change
- Trend indicator

Example:

Revenue
₹4.82 Crore
↑ 12.4% vs previous month

6. AI INSIGHTS

Automatically generate insights after every dataset upload.

Example:

"Revenue increased by 14.2% in Q2 compared with Q1."

"Maharashtra generated the highest revenue at ₹1.24 Crore."

"Product A contributed 32% of total revenue."

"August revenue declined by 8.4%, primarily due to lower sales in the West region."

"Three products have negative profit margins."

Separate insights into:

- Positive trends
- Negative trends
- Anomalies
- Opportunities
- Risks
- Recommendations

Recommendations must be based only on the available data.

7. FORECASTING

Add optional AI forecasting.

Support:
- Revenue forecasting
- Sales forecasting
- Demand forecasting
- Expense forecasting
- Inventory forecasting

Allow:
- 7-day forecast
- 30-day forecast
- 3-month forecast
- 6-month forecast
- 12-month forecast

Display:
Actual vs Forecast

Clearly label forecasts as estimates and show uncertainty where appropriate.

8. NATURAL LANGUAGE DATA QUERY

Create an AI chat interface.

Example:

USER:
"Show revenue by state."

AI:
Analyzes dataset → creates visualization → explains result.

USER:
"Now only show Madhya Pradesh, Maharashtra and Rajasthan."

AI:
Automatically filters the visualization.

USER:
"Compare this with last year."

AI:
Creates year-over-year comparison.

USER:
"Export this report."

AI:
Creates downloadable report.

9. SMART FILTERS

Add global filters:

- Date
- State
- City
- Product
- Category
- Customer
- Salesperson
- Region
- Department
- Payment method

All dashboard charts should update dynamically when filters change.

10. DATA QUALITY

Before analysis, automatically detect:

- Missing values
- Duplicate rows
- Invalid dates
- Invalid numbers
- Empty columns
- Outliers
- Inconsistent categories
- Incorrect currency formats

Give the user an option to clean the data automatically.

Example:

Data Quality Score: 94/100

Issues found:
- 124 missing values
- 18 duplicate rows
- 7 invalid dates

Provide:
[Fix Automatically]

11. REPORT GENERATION

Generate professional business reports.

Report sections:

Executive Summary
Key KPIs
Revenue Analysis
Sales Analysis
Profit Analysis
Customer Analysis
Product Analysis
Regional Analysis
Trend Analysis
Anomalies
Forecast
AI Insights
Recommendations

Allow export to:
- PDF
- Excel
- CSV
- PNG
- PowerPoint

12. COMPANY-SPECIFIC DASHBOARDS

Allow users to select business type:

- Retail
- E-commerce
- Manufacturing
- IT/Software
- Banking/Finance
- Healthcare
- Education
- Logistics
- Real Estate
- Hospitality
- FMCG
- Agriculture
- Automobile
- Consulting

The application should automatically customize dashboard KPIs and visualizations according to the selected industry.

13. ROLE-BASED ACCESS

Support:

Admin
Manager
Analyst
Employee
Viewer

Permissions:
- Upload data
- Analyze data
- Create dashboards
- Export reports
- Delete data
- Manage users

14. SECURITY

Build with enterprise security principles.

Include:
- Authentication
- Role-based authorization
- Secure file uploads
- Data encryption
- Session management
- Audit logs
- Input validation
- API security
- Rate limiting

Never expose API keys in frontend code.

Sensitive company data must not be sent to third-party AI services unless explicitly configured by the company.

15. UI/UX

Create a modern professional SaaS interface.

Design style:
- Clean
- Corporate
- Minimal
- Responsive
- Fast
- Indian enterprise friendly

Main navigation:

Dashboard
Data
AI Analyst
Visualizations
Reports
Forecasts
Data Quality
Saved Analyses
Settings

Dashboard layout:

Top:
Company name + date filter + profile

Second:
KPI cards

Third:
Revenue chart + Sales chart

Fourth:
Profit chart + Regional chart

Fifth:
AI Insights

Sixth:
Anomaly detection

Seventh:
Forecast

16. VISUALIZATION BUILDER

Create a drag-and-drop visualization builder.

User can select:

X-axis
Y-axis
Color
Group
Filter
Aggregation

Aggregations:
- SUM
- AVG
- COUNT
- MIN
- MAX
- MEDIAN
- DISTINCT COUNT

Allow users to change chart type instantly.

17. DATA EXPLORER

Create a spreadsheet-style data explorer.

Features:
- Search
- Sort
- Filter
- Pagination
- Column visibility
- Data type indicators
- Freeze columns
- Export selected rows

18. AI EXPLANATION

Every visualization should have:

"Explain this chart"

AI should explain:
- What the chart shows
- Important trends
- Highest/lowest values
- Percentage changes
- Possible anomalies
- Business implications

Do not make unsupported causal claims.

19. COMPARISON MODE

Allow users to compare:

- Current month vs previous month
- Current year vs previous year
- Product A vs Product B
- State A vs State B
- Region A vs Region B
- Actual vs Target
- Actual vs Forecast

20. TARGET VS ACTUAL

Allow companies to upload targets.

Display:

Target
Actual
Achievement %
Variance

Example:

Sales Target: ₹5 Crore
Actual Sales: ₹4.62 Crore
Achievement: 92.4%

21. LOOPING / CONTINUOUS AI WORKFLOW

Create a continuous analysis workflow:

UPLOAD DATA
↓
PROFILE DATA
↓
CHECK DATA QUALITY
↓
CLEAN DATA
↓
ANALYZE DATA
↓
GENERATE KPIs
↓
SELECT VISUALIZATIONS
↓
GENERATE AI INSIGHTS
↓
DETECT ANOMALIES
↓
GENERATE FORECAST
↓
CREATE DASHBOARD
↓
GENERATE REPORT
↓
WAIT FOR USER QUESTION
↓
ANALYZE QUESTION
↓
UPDATE CHART/DASHBOARD
↓
GENERATE NEW INSIGHT
↓
REPEAT

The system should maintain conversation context for the current dataset.

22. PERFORMANCE

Optimize for large datasets.

Use:
- Server-side processing
- Pagination
- Lazy loading
- Caching
- Background processing
- Efficient database queries
- Streaming where appropriate

The UI should remain responsive while large files are being analyzed.

23. TECHNOLOGY

Use a modern scalable architecture.

Frontend:
React + TypeScript
Tailwind CSS
Modern charting library

Backend:
Python FastAPI

Data analysis:
Pandas
NumPy
Scikit-learn where appropriate

Database:
PostgreSQL

For large analytical datasets:
DuckDB where appropriate

Authentication:
Secure JWT/session-based authentication

Charts:
Use a reliable interactive visualization library such as Plotly, Apache ECharts, or Recharts.

AI:
Create an abstraction layer so the AI provider can be changed easily.

24. SAMPLE DATA

Include realistic demo datasets for:

Retail sales
E-commerce
Employee HR
Bank transactions
Hospital operations
IT company sales
Manufacturing
Inventory

The demo data should use Indian states, cities, INR values, Indian dates and realistic business scenarios.

25. ERROR HANDLING

Never crash when:
- File is corrupted
- Column names are unusual
- Data contains missing values
- Dataset has mixed data types
- AI cannot answer a question
- Dataset is too large

Show clear user-friendly error messages.

26. IMPORTANT AI RULES

The AI must:

- Never fabricate data
- Never invent statistics
- Never claim causation without evidence
- Show calculation methodology when requested
- Clearly distinguish actual data from forecasts
- Clearly state assumptions
- Use the uploaded dataset as the source of truth
- Ask for clarification when a question is genuinely ambiguous
- Protect confidential company information

27. DEMO EXPERIENCE

When the application starts for the first time:

Show:

"Welcome to Bharat Analytics AI"

Subtitle:
"Turn your business data into decisions."

Buttons:

[Upload Your Data]
[Try Demo Dataset]

Then automatically demonstrate:

Upload → Analysis → Dashboard → AI Insights → Visualization → Forecast → Report.

28. FINAL QUALITY REQUIREMENT

Do not create a simple chart generator.

Create a complete AI-powered business intelligence platform designed for real Indian companies.

The final application should feel like a professional combination of:

AI Analyst
+ Business Intelligence Dashboard
+ Data Cleaning
+ Data Visualization
+ Forecasting
+ Automated Reporting

Build the application modularly so additional industries, AI models, databases, visualization types and business metrics can be added later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9f85bd5a-7256-4f71-a124-f175f9f3af5e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
