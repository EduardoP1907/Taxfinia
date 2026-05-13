# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TAXFINIA** (frontend brand) / **PROMETHEIA** (API brand) is a SaaS platform that digitalizes financial analysis and company valuation workflows, replicating the Excel file `TAXFINMHO2024.xlsx` (27 sheets, 638+ formulas) as a web application.

**Stack:**
- **Backend:** Node.js + Express + TypeScript + Prisma ORM + PostgreSQL
- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS + Zustand
- **AI:** Anthropic SDK (claude-sonnet-4-6 for report generation, claude-opus-4-6 for chat)
- **Storage:** AWS S3 (optional) for generated report files

## Development Commands

```bash
# Backend (port 5000)
cd backend
npm run dev              # hot reload with ts-node-dev
npm run build
npm run prisma:generate  # after schema changes
npm run prisma:migrate   # apply migrations
npm run prisma:studio    # DB GUI

# Frontend (port 5173)
cd frontend
npm run dev
npm run build
npm run lint
```

## Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/taxfinia_db"
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"
EMAIL_USER="..."
EMAIL_PASSWORD="..."   # Gmail App Password
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_FROM="PROMETHEIA <noreply@prometheia.com>"
OTP_EXPIRATION_MINUTES="10"
FRONTEND_URL="http://localhost:5173"
PORT=5000
NODE_ENV="development"
ADMIN_EMAIL="..."               # Receives notifications when a report download code is requested
SECOND_ADMIN_EMAIL="..."        # Secondary admin notification recipient
ANTHROPIC_API_KEY="..."         # Required for AI report generation and chat
AWS_ACCESS_KEY_ID="..."         # Optional: enables S3 storage for generated reports
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="..."
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_DEV_BYPASS_AUTH=true   # Skips auth entirely for local dev (logs in as dev@local.com ADMIN)
```

## Architecture

### Backend Layers
```
Controllers → Services → Prisma (ORM) → PostgreSQL
```

**Key service files:**
- `services/ai-analysis.service.ts` — Generates AI financial reports (13-section JSON) using `claude-sonnet-4-6` via tool_use, and estimates WACC via AI
- `services/chat.service.ts` — Streaming financial Q&A using `claude-opus-4-6` with full company data as context
- `services/report.service.ts` — Orchestrates: AI analysis → DOCX generation → PDF conversion → S3 upload (if configured) or local storage
- `services/ratios.service.ts` — Fetches DB data and calls pure ratio functions
- `utils/ratios.ts` — Pure ratio calculation functions (source of truth, must match Excel)
- `utils/s3.ts` — S3 upload/download/stream helpers; `isS3Enabled()` checks if AWS is configured; falls back to local files

**Key middleware:**
- `middlewares/auth.middleware.ts` — JWT validation, attaches `req.user`
- `middlewares/company-lock.middleware.ts` — Blocks write operations on locked companies. Companies are locked (`isLocked=true`) after AI report generation or chat use; accepts `:companyId` or `:fiscalYearId` in params

### Frontend Structure

**Routing** (`App.tsx`):
- `/dashboard` — Main dashboard (DashboardPage)
- `/empresas` — Company list (CompaniesPage)
- `/datos` — Multi-year financial data entry (MultiYearDataEntryPage)
- `/informe` — AI report viewer with chat (ReportPage)
- `/proyecciones` — DCF projections combined view
- `/proyecciones-41`, `/proyecciones-43` — Individual projection sheets
- `/admin` — Admin panel (ADMIN role only)

**State management:**
- `store/authStore.ts` — Auth state; supports `VITE_DEV_BYPASS_AUTH` to skip login in dev
- `store/companyStore.ts` — Selected company state
- Local state for page-level data; React Hook Form + Zod for all forms

**API services** (`services/`): Each service module wraps the Axios instance from `api.ts`. The Axios instance automatically attaches the JWT from `localStorage.accessToken`.

### Database Schema (Prisma)

**Core hierarchy:**
```
User → Company → FiscalYear → { BalanceSheet, IncomeStatement, CashFlow, AdditionalData, CalculatedRatios }
Company → ProjectionScenario → FinancialProjection[]
Company → Report (status: PENDING | GENERATING | COMPLETED | FAILED)
User → InviteToken (trial access system)
```

**Important model fields:**
- `Company.isLocked` — set to `true` after first AI report/chat; prevents financial data edits
- `Company.businessActivity` — freeform business description used in AI prompt
- `User.planType` — `"FREE"` or `"TRIAL"` etc.; `freeReportsUsed` tracks report quota
- `Report.aiAnalysis` — JSON blob with 13 AI-generated sections stored in DB
- `Report.downloadCode` — 6-digit code required to download PDF/DOCX; admin is notified by email when generated
- `AdditionalData` — includes `purchases`, `materialCost`, `averageVatPurchases`, `averageVatSales`, `loanAmortization` used in projections

**Serialization:** Always use `bigIntToJSON()` from `utils/bigint.ts` when returning Prisma results that may contain `BigInt` fields (`sharesOutstanding`).

### Report Pipeline

1. `POST /api/reports/generate-sync/:companyId` — Synchronous (blocks until done)
2. `POST /api/reports/generate/:companyId` — Async (returns immediately, report generated in background)
3. Backend calls `generateAIAnalysis()` → DOCX via `docx-generator.ts` + tables via `docx-tables-generator.ts` → PDF via `docx-to-pdf.ts` → upload to S3 or save locally
4. `POST /api/reports/:id/generate-code` — Generates 6-digit download code, emails both admins
5. `GET /api/reports/:id/download/:format` — Downloads `pdf` or `docx`; validates code if `downloadCode` is set
6. `POST /api/reports/:id/preview-token` — Issues 15-minute JWT for unauthenticated preview
7. `GET /api/reports/preview/:token` — Public endpoint (no auth); serves PDF for preview

### Chat Feature

`POST /api/chat/:companyId` — Builds a full system prompt with all company financial data (all fiscal years, ratios, projections, prior AI analysis) and calls `claude-opus-4-6`. Accepts `{ message, history: [{role, content}] }`. Locking the company is triggered by the chat route.

### AI Features (Anthropic SDK)

Both AI functions use **tool_use** to force structured JSON output:
- `generateAIAnalysis()` — Uses `generate_financial_report` tool, returns 13-key `AIAnalysisResult`
- `estimateWACC()` — Uses `estimate_wacc` tool, returns WACC + parameters in decimal form
- Model for reports: `claude-sonnet-4-6`; model for chat: `claude-opus-4-6`

## API Endpoints Reference

### Auth (`/api/auth`)
```
POST /register, /verify-otp, /resend-otp, /login, /logout
GET  /me
POST /forgot-password, /reset-password
```

### Companies (`/api/companies`) — Protected
```
GET/POST /
GET/PUT/DELETE /:id
GET /:id/summary
```

### Financial Data (`/api/financial`) — Protected
```
POST /balance, /income, /cashflow, /additional
GET  /balance/:fiscalYearId, /income/:fiscalYearId, /cashflow/:fiscalYearId, /additional/:fiscalYearId
```

### Ratios (`/api/ratios`) — Protected
```
GET /:companyId/:year
```

### Projections (`/api/projections`) — Protected
```
POST   /scenario
GET    /scenario/:id
PUT    /scenario/:id
DELETE /scenario/:id
GET    /scenario/:id/projections
```

### Reports (`/api/reports`) — Protected (except preview)
```
GET  /preview/:token              — Public, no auth, serves PDF by preview token
POST /generate-sync/:companyId
POST /generate/:companyId
GET  /company/:companyId
POST /:id/preview-token
POST /:id/generate-code
POST /:id/validate-code
GET  /:id/download/:format        — format: pdf | docx
GET  /:id
```

### Chat (`/api/chat`) — Protected
```
POST /:companyId                  — { message: string, history: ChatMessage[] }
```

## Financial Formula Implementation

**Critical rule:** All calculations must match the Excel file exactly. Source of truth: `FORMULAS-EXCEL.md`, `excel-analysis.json`, `ratios-formulas.json`.

### Income statement chain (Sheet 2.1)
```
GrossMargin        = Revenue − (costOfSales + staffCostsSales)
EBITDA             = GrossMargin − (adminExpenses + staffCostsAdmin)   ← NO depreciation here
OperatingResult    = EBITDA − depreciation                             ← = EBIT in code
EBIT (with excep.) = OperatingResult + (exceptionalIncome − exceptionalExpenses)
EBT                = EBIT + (financialIncome − financialExpenses)
NetIncome          = EBT − incomeTax
```

**Critical:** `adminExpenses` maps to Excel G53+G56 but NOT G55 (depreciation). EBITDA never includes depreciation.

**ROA uses `OperatingResult` (EBITDA − depreciation), not EBIT** (which includes exceptionals). See Sheet 4.1, G26.

### Adding a new calculation
1. Find the cell in Sheet 2.4 (or 2.5), trace through CalcBal if needed
2. Add pure function to `utils/ratios.ts` with comment `// Sheet 2.4, Row XX → CalcBal!KYY`
3. Use in `services/ratios.service.ts` converting Prisma `Decimal` via `parseFloat(value.toString())`
4. Verify against test data: company "LABORATORIO BARNAFI KRAUSE", year 2024

**Reference values (year 2024):** Liquidez General: 6.4158 | Acid Test: 6.1712 | Cash Ratio: 0.4557 | Capitalización: 0.8663

## Code Patterns

### Prisma Decimal conversion
```typescript
function toNumber(value: Decimal | null | undefined): number {
  if (!value) return 0;
  return parseFloat(value.toString());
}
```

### Division by zero (all ratio functions)
```typescript
if (denominator === 0) return null;  // return null, never Infinity
```

### Error messages
All user-facing API error messages must be in Spanish.

## CORS

Backend allows: `localhost:5173-5177` and the S3 static hosting URL for the frontend. In production, restrict to actual domain.

## Implementation Status

**Completed:** Auth (OTP email, JWT, roles), company CRUD with soft delete, multi-year financial data entry, ratios engine (liquidity, leverage, profitability, activity, Altman Z-Score), AI report generation (13 sections), AI WACC estimation, DOCX/PDF report generation, S3 storage, preview tokens, download codes with admin email notifications, company lock mechanism, AI chat per company, DCF projections (sheets 4.1 and 4.3), invite token trial system, admin panel.

**Pending:** Static valuation methods (DCF sheet 4.1 uses projections but Book Value/Multiples/EVA valuation modules not yet complete), Excel/CSV import, industry benchmarking, multi-company comparison, mobile optimization.
