# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TAXFINIA** is a web application that digitalizes financial analysis and company valuation workflows based on the Excel file `TAXFINMHO2024.xlsx`. The goal is to replicate all financial calculations, ratios, and valuation methods from the Excel template into a modern, collaborative web platform.

**Key Objective:** The formulas and calculations in the web app MUST match exactly with those in the Excel file to ensure identical results.

**Stack:**
- **Backend:** Node.js + Express + TypeScript + Prisma ORM + PostgreSQL
- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS + Zustand

## Critical Files

### Excel Analysis

- **`TAXFINMHO2024.xlsx`** - Source Excel file with all formulas (27 sheets, 638+ formulas)
- **`FORMULAS-EXCEL.md`** - Complete documentation of Excel formulas extracted and analyzed
- **`excel-analysis.json`** - Full JSON export of all formulas from Excel
- **`ratios-formulas.json`** - Specific financial ratios formulas

### Key Documentation

- **`README.md`** - Project setup and general information
- **`FORMULAS-EXCEL.md`** ⭐ - **READ THIS FIRST** for financial formula implementation

## Architecture

### Backend (Node.js + TypeScript)

**Layered Architecture:**
```
Controllers → Services → Prisma (ORM) → PostgreSQL
```

**Directory Structure:**
```
backend/
├── prisma/
│   └── schema.prisma          # Database models
├── src/
│   ├── config/                # Configuration (env, database)
│   ├── controllers/           # HTTP request handlers
│   ├── middlewares/           # Auth, validation
│   ├── routes/                # Express routes
│   ├── services/              # Business logic
│   │   ├── auth.service.ts
│   │   ├── company.service.ts
│   │   ├── financial.service.ts
│   │   └── ratios.service.ts  # ⭐ Financial ratios calculations
│   ├── utils/                 # Utilities
│   │   ├── jwt.ts
│   │   ├── email.ts
│   │   ├── otp.ts
│   │   ├── bigint.ts
│   │   └── ratios.ts          # ⭐ Pure ratio calculation functions
│   └── index.ts               # Entry point
└── package.json
```

**Key Patterns:**
- Service layer contains business logic (auth, companies, financial data, **ratios**)
- Controller layer handles HTTP requests/responses
- Utils contain pure functions (JWT, email, OTP, **financial formulas**)
- Middleware for authentication (JWT-based)

### Frontend (React + TypeScript)

**Directory Structure:**
```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                # Reusable UI components
│   │   ├── companies/         # Company-related components
│   │   └── data/              # Data entry components
│   ├── pages/
│   │   ├── auth/              # Login, Register, OTP
│   │   ├── dashboard/         # Main dashboard
│   │   ├── companies/         # Companies list
│   │   ├── data/              # Financial data entry
│   │   └── report/            # Reports view
│   ├── services/              # API services
│   │   ├── api.ts            # Axios instance
│   │   ├── auth.service.ts
│   │   ├── company.service.ts
│   │   └── financial.service.ts
│   ├── store/                 # Zustand stores
│   │   └── authStore.ts
│   ├── utils/                 # Utilities
│   │   └── currency.ts
│   └── App.tsx
└── package.json
```

**State Management:**
- Zustand for global state (auth)
- React Hook Form + Zod for form validation
- Local state for component-specific data

## Development Commands

### Backend

```bash
cd backend

# Development (hot reload)
npm run dev

# Build production
npm run build

# Start production
npm start

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open DB GUI
```

### Frontend

```bash
cd frontend

# Development (usually http://localhost:5173)
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Lint
npm run lint
```

### Database Setup

PostgreSQL must be running:

```bash
# Docker (recommended)
docker run --name taxfinia-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=taxfinia_db \
  -p 5432:5432 -d postgres:15

# Then migrate
cd backend && npm run prisma:migrate
```

## First-Time Setup Checklist

When starting development for the first time:

1. **Database**
   - [ ] Install PostgreSQL or start Docker container
   - [ ] Verify database connection on port 5432

2. **Backend**
   - [ ] Create `backend/.env` file (see Environment Setup section)
   - [ ] Configure Gmail App Password for OTP
   - [ ] Run `npm install` in backend directory
   - [ ] Run `npm run prisma:generate`
   - [ ] Run `npm run prisma:migrate`
   - [ ] Start backend with `npm run dev` (should run on port 5000)

3. **Frontend**
   - [ ] Create `frontend/.env` file with `VITE_API_URL=http://localhost:5000/api`
   - [ ] Run `npm install` in frontend directory
   - [ ] Start frontend with `npm run dev` (should run on port 5173)

4. **Testing**
   - [ ] Open browser to http://localhost:5173
   - [ ] Try registering a new user
   - [ ] Check email for OTP code
   - [ ] Verify OTP and complete registration
   - [ ] Try creating a company and entering financial data

## Environment Setup

### Backend (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/taxfinia_db"
JWT_SECRET="your-secure-secret"
JWT_EXPIRES_IN="7d"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-gmail-app-password"  # App Password, not regular password
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_FROM="TAXFINIA <noreply@taxfinia.com>"
OTP_EXPIRATION_MINUTES="10"
FRONTEND_URL="http://localhost:5173"
PORT=5000
NODE_ENV="development"
```

**Gmail OTP Setup:**
1. Enable 2-Step Verification on your Google Account
2. Generate App Password: https://support.google.com/accounts/answer/185833
3. Use App Password (not regular password) in `EMAIL_PASSWORD`

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
```

## API Endpoints Reference

### Authentication (`/api/auth`)
```
POST   /register          - Register new user
POST   /verify-otp        - Verify email with OTP code
POST   /resend-otp        - Resend OTP code
POST   /login             - Login user
POST   /logout            - Logout user
GET    /me                - Get current user profile (protected)
```

### Companies (`/api/companies`) - All Protected
```
POST   /                  - Create new company
GET    /                  - List all companies for current user
GET    /:id               - Get company by ID
PUT    /:id               - Update company
DELETE /:id               - Delete company (soft delete)
GET    /:id/summary       - Get company financial summary
```

### Financial Data (`/api/financial`) - All Protected
```
POST   /balance           - Save balance sheet
GET    /balance/:fiscalYearId  - Get balance sheet
POST   /income            - Save income statement
GET    /income/:fiscalYearId   - Get income statement
POST   /cashflow          - Save cash flow statement
GET    /cashflow/:fiscalYearId - Get cash flow statement
POST   /additional        - Save additional data (shares, employees, etc.)
GET    /additional/:fiscalYearId - Get additional data
```

### Ratios (`/api/ratios`) - All Protected
```
GET    /:companyId/:year  - Calculate and return all financial ratios for a fiscal year
```

### Projections (`/api/projections`) - All Protected
```
POST   /scenario          - Create projection scenario
GET    /scenario/:id      - Get projection scenario
PUT    /scenario/:id      - Update projection scenario
DELETE /scenario/:id      - Delete projection scenario
GET    /scenario/:id/projections - Get all projections for scenario
```

## Financial Formulas Implementation

### ⚠️ CRITICAL: Formula Accuracy

All financial calculations MUST match the Excel file exactly. Before implementing any ratio or calculation:

1. **Check `FORMULAS-EXCEL.md`** for the exact Excel formula
2. Implement the formula in `backend/src/utils/ratios.ts`
3. Test with data from the Excel file
4. Compare results to ensure they match

### Key Excel Sheets and Their Purpose

**Input Sheets:**
- **DATOS** (Row 4-401) - Financial statement inputs (Balance, P&L, Cash Flow)

**Calculation Sheets:**
- **CalcBal** - Auxiliary balance calculations (many ratios reference this)
- **2.1** - Income Statement analysis (EBITDA, EBIT, margins)
- **2.2** - Balance Sheet analysis
- **2.3** - Cash Flow analysis
- **2.4** - Financial Ratios ⭐ (all key ratios)
- **2.5** - Risk analysis (Altman Z-Score, Springate)

**Valuation Sheets:**
- **3.1-3.3** - Static valuation methods
- **4.1-4.5** - Dynamic valuation methods (DCF, EVA)
- **RESUMEN VALOR** - Valuation summary

### Example: Implementing a Ratio

**From Excel (Sheet 2.4, Row 52):**
```
H52: CalcBal!K155
K155 in CalcBal: IF(ISERROR(K154), "n/d", K154)
K154 in CalcBal: Activo Corriente / Pasivo Corriente
```

**Implementation in `utils/ratios.ts`:**
```typescript
export function calculateCurrentRatio(
  currentAssets: number,
  currentLiabilities: number
): number | null {
  if (currentLiabilities === 0) return null;
  return currentAssets / currentLiabilities;
}
```

**Usage in `services/ratios.service.ts`:**
```typescript
const currentRatio = calculateCurrentRatio(
  balanceSheet.inventory + balanceSheet.accountsReceivable +
  balanceSheet.otherReceivables + balanceSheet.cashEquivalents,
  balanceSheet.bankDebtSp + balanceSheet.accountsPayable +
  balanceSheet.taxLiabilities + balanceSheet.otherLiabilitiesSp
);
```

### Essential Financial Calculations

**From Income Statement (Sheet 2.1):**

```typescript
// EBITDA
EBITDA = Revenue - CostOfSales - OperatingExpenses + Depreciation

// EBIT
EBIT = EBITDA - Depreciation + ExceptionalResult

// EBT (Earnings Before Tax)
EBT = EBIT + FinancialResult

// Net Income
NetIncome = EBT - IncomeTax

// Gross Margin %
GrossMargin = ((Revenue - CostOfSales) / Revenue) × 100

// EBITDA Margin %
EBITDAMargin = (EBITDA / Revenue) × 100

// Net Margin %
NetMargin = (NetIncome / Revenue) × 100
```

**From Balance Sheet (Sheet 2.2):**

```typescript
// Working Capital
WorkingCapital = CurrentAssets - CurrentLiabilities

// Total Assets
TotalAssets = NonCurrentAssets + CurrentAssets

// Total Liabilities
TotalLiabilities = NonCurrentLiabilities + CurrentLiabilities

// Equity
Equity = TotalAssets - TotalLiabilities
```

**Key Ratios (Sheet 2.4):**

```typescript
// Liquidity
CurrentRatio = CurrentAssets / CurrentLiabilities
AcidTest = (CurrentAssets - Inventory) / CurrentLiabilities
CashRatio = Cash / CurrentLiabilities

// Leverage
DebtToEquity = TotalLiabilities / Equity
DebtToAssets = TotalLiabilities / TotalAssets
DebtToEBITDA = TotalDebt / EBITDA

// Profitability
ROE = (NetIncome / Equity) × 100
ROA = (EBIT / TotalAssets) × 100
ROS = (NetIncome / Revenue) × 100

// Activity
AssetTurnover = Revenue / TotalAssets
InventoryTurnover = CostOfSales / AverageInventory
DaysSalesOutstanding = (AccountsReceivable / Revenue) × 365
DaysPayableOutstanding = (AccountsPayable / CostOfSales) × 365
```

**Risk Analysis (Sheet 2.5):**

```typescript
// Altman Z-Score (non-public companies)
Z = 0.717 × X1 + 0.847 × X2 + 3.107 × X3 + 0.420 × X4 + 0.998 × X5

// Where:
X1 = WorkingCapital / TotalAssets
X2 = RetainedEarnings / TotalAssets
X3 = EBIT / TotalAssets
X4 = Equity / TotalLiabilities
X5 = Revenue / TotalAssets

// Interpretation:
// Z > 2.9: Safe zone
// 1.23 < Z < 2.9: Gray zone
// Z < 1.23: Distress zone
```

## Database Schema (Prisma)

**Key Models:**
```prisma
User → Company → FiscalYear → {BalanceSheet, IncomeStatement, CashFlow, AdditionalData}
```

**Financial Data Tables:**
- `balance_sheets` - Balance sheet data (assets, liabilities, equity)
- `income_statements` - P&L data (revenue, costs, expenses)
- `cash_flows` - Cash flow statement
- `additional_data` - Stock data, employees, market cap
- `calculated_ratios` - Pre-calculated financial ratios (cache)

**Important Notes:**
- Use `bigIntToJSON()` utility when returning Prisma results with BigInt fields
- Decimal fields use (15,2) precision for currency values
- All financial relationships use CASCADE delete for data integrity
- FiscalYear has unique constraint on (companyId, year)

## Code Patterns

### Adding a Financial Calculation

1. **Document the Excel formula** in `FORMULAS-EXCEL.md` if not already there
2. **Create pure function** in `utils/ratios.ts`
3. **Create service method** in `services/ratios.service.ts` to:
   - Fetch required financial data from DB
   - Call ratio calculation functions
   - Handle null/undefined cases
   - Return calculated values
4. **Create controller endpoint** in `controllers/financial.controller.ts`
5. **Add route** in `routes/financial.routes.ts`
6. **Test** with Excel data and compare results

### API Service Pattern (Frontend)

```typescript
// In services/financial.service.ts
export const financialService = {
  async getCalculatedRatios(companyId: string, year: number) {
    const response = await api.get(`/financial/${companyId}/ratios/${year}`);
    return response.data;
  }
};
```

### Error Handling

```typescript
// Division by zero protection
if (denominator === 0) return null;

// Missing data
if (!balanceSheet || !incomeStatement) {
  throw new Error('Missing required financial statements');
}

// Prisma BigInt serialization
import { bigIntToJSON } from '../utils/bigint';
const result = await prisma.company.findMany(...);
return bigIntToJSON(result);
```

## Key Dependencies Explained

### Backend
- **xlsx (0.18.5)** - For parsing and analyzing the source Excel file formulas
- **express-validator (7.3.0)** - Input validation for API endpoints
- **nodemailer (7.0.10)** - Email service for OTP delivery via Gmail
- **bcryptjs (3.0.3)** - Password hashing (chosen over bcrypt for better Windows compatibility)
- **jsonwebtoken (9.0.2)** - JWT token generation and validation
- **ts-node-dev (2.0.0)** - Development server with hot reload

### Frontend
- **Recharts (3.6.0)** - Chart library for financial data visualization
- **jsPDF (3.0.4) + jspdf-autotable (5.0.2)** - PDF generation for reports
- **React Hook Form (7.66.0) + Zod (4.1.12)** - Form state management with validation
- **Zustand (5.0.8)** - Minimal global state management (auth only)
- **Sonner (2.0.7)** - Toast notifications
- **Lucide React (0.553.0)** - Icon library

## CORS Configuration

The backend is configured with permissive CORS for development, allowing multiple localhost ports:
- Port 5173 (default Vite)
- Port 5174, 5175, 5176, 5177 (alternative Vite ports)

This allows running multiple frontend instances simultaneously for testing. In production, restrict CORS to actual frontend domain.

## Testing Strategy

### Comparing with Excel Results

1. **Extract test data** from Excel (DATOS sheet)
2. **Enter data** via web app forms
3. **Calculate ratios** in backend
4. **Compare results** with Excel (Sheet 2.4)
5. **Adjust formulas** if discrepancies found
6. **Document differences** and reasons

### Test Data Locations in Excel

- **Company:** "LABORATORIO BARNAFI KRAUSE" (INDICE!G19)
- **Year:** 2024 (INDICE!H21)
- **Balance data:** DATOS sheet, columns G-K (years 2024-2020)
- **Expected ratios:** Sheet 2.4, columns H, J, L, N, P

## Common Issues

### Backend won't start
- ✅ Check PostgreSQL is running (`docker ps` or check local service)
- ✅ Verify `DATABASE_URL` in `.env` matches your database credentials
- ✅ Run `npm run prisma:generate` to regenerate Prisma client
- ✅ Check port 5000 is not in use by another process

### Ratios don't match Excel
- ✅ Check formula in `FORMULAS-EXCEL.md` for exact Excel implementation
- ✅ Verify all input data is entered correctly (check for missing decimal places)
- ✅ Check for rounding differences (use 4+ decimals in calculations)
- ✅ Ensure division by zero is handled (return null, not infinity)
- ✅ Verify averages are calculated as (Current + Previous) / 2

### CORS errors
- ✅ Ensure backend CORS config includes your frontend port
- ✅ Check `VITE_API_URL` in frontend `.env` points to correct backend URL
- ✅ Verify backend is running and accessible
- ✅ Check browser console for specific CORS error messages

### Decimal precision issues
- ✅ Use `Decimal(15,2)` in database for currency values
- ✅ Keep 4+ decimals in intermediate calculations
- ✅ Round only for display, not for calculations
- ✅ Never use floating point for financial calculations

### OTP email not received
- ✅ Verify Gmail App Password is correct (not regular password)
- ✅ Check email configuration in backend `.env`
- ✅ Ensure 2-Step Verification is enabled on Google Account
- ✅ Check spam/junk folder
- ✅ Verify EMAIL_USER and EMAIL_PASSWORD are correctly set

## Project Conventions

1. **File naming:** kebab-case (e.g., `ratio-calculator.ts`)
2. **Database columns:** snake_case (e.g., `fiscal_year_id`)
3. **TypeScript:** camelCase for variables/functions, PascalCase for types
4. **Components:** PascalCase (e.g., `DataEntryPage.tsx`)
5. **Financial values:** Always handle null/undefined, never assume data exists
6. **Formulas:** Comment with Excel sheet reference (e.g., `// Sheet 2.4, Row 52`)
7. **API responses:** Always return consistent structure with `{ data, error }` or similar
8. **Error messages:** Return user-friendly Spanish messages in API responses

## Development Workflow

### For Financial Features

1. Identify Excel sheet and formula
2. Document in `FORMULAS-EXCEL.md` if not already there
3. Implement pure calculation function in `utils/ratios.ts`
4. Create service method to fetch data and calculate in `services/ratios.service.ts`
5. Add API endpoint in controller and routes
6. Create frontend form/display components
7. Test with Excel data and compare results
8. Verify results match Excel exactly

### For New Features (Non-Financial)

1. Plan implementation and identify affected layers
2. Update Prisma schema if database changes needed
3. Create and run migration: `npm run prisma:migrate`
4. Implement service layer (business logic)
5. Add controller endpoints (HTTP handling)
6. Add routes to Express app
7. Create frontend components and pages
8. Add API service methods in frontend
9. Test end-to-end flow

## Resources

- **Prisma Docs:** https://www.prisma.io/docs
- **React Hook Form:** https://react-hook-form.com
- **Zod Validation:** https://zod.dev
- **Express.js:** https://expressjs.com
- **Excel Formulas:** See `FORMULAS-EXCEL.md`
- **React Router:** https://reactrouter.com
- **Recharts:** https://recharts.org
- **jsPDF:** https://github.com/parallax/jsPDF

## Current Implementation Status

**✅ Completed:**
- User authentication (register, login, OTP verification)
- JWT token-based session management
- User roles and permissions (ADMIN, ANALYST, VIEWER, CLIENT)
- Company CRUD operations with soft delete
- Fiscal year management
- Financial data entry (Balance Sheet, Income Statement, Cash Flow, Additional Data)
- Financial ratios calculation engine
- Protected routing and middleware
- Basic UI components and layouts
- API service layer with Axios interceptors
- Global auth state management with Zustand

**⏳ In Progress:**
- Financial analysis dashboard
- Multi-year comparison views
- Ratio visualization with charts
- Report generation (PDF export)
- Financial projection scenarios

**📋 Pending:**
- All valuation methods (DCF, Multiples, EVA, Book Value)
- Advanced report generation with templates
- Industry benchmarking and comparisons
- Multi-company portfolio analysis
- AI-powered anomaly detection
- Advanced charts and visualizations
- Excel/CSV import functionality
- Export to Excel functionality
- Email notifications for events
- User collaboration features
- Automated testing (unit, integration, E2E)
- API documentation (Swagger/OpenAPI)
- Performance optimization and caching
- Mobile responsive improvements

## Important Notes

- **Formula Accuracy is Critical:** Every calculation must match Excel exactly - this is the primary requirement
- **Document Everything:** Add Excel references in code comments for traceability
- **Test Thoroughly:** Always compare results with Excel before considering a calculation complete
- **Handle Edge Cases:** Division by zero, missing data, negative values, null checks
- **Maintain Precision:** Use proper decimal precision in all calculations (4+ decimals for intermediates)
- **Security First:** Never commit sensitive data (.env files) to repository
- **Performance:** Pre-calculate and cache complex ratios in `calculated_ratios` table
- **User Experience:** Provide clear error messages in Spanish for user-facing errors

---

**For questions or clarifications, refer to:**
- `README.md` - Setup and general info
- `FORMULAS-EXCEL.md` - Complete formula documentation
- `excel-analysis.json` - Raw formula extraction
- Excel file `TAXFINMHO2024.xlsx` - Source of truth for all calculations
