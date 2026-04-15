# Alwahaa Technical Services - Pool Construction Management

A comprehensive Next.js application for managing swimming pool construction projects, including client management, vendor tracking, purchase orders, project expenses, invoicing, and financial reporting.

## Features

### Core Modules
- **Projects** - Track pool construction projects with phases, timelines, and budgets
- **Clients** - Manage client information and project history
- **Vendors** - Track suppliers and contractors with payment terms
- **Purchase Orders** - Order materials/equipment with automatic VAT calculation
- **Project Expenses** - Log site costs, labor, fuel, and maintenance expenses
- **Invoicing** - Generate milestone-based or progress invoices
- **Receipts** - Record client payments
- **Vendor Payments** - Track payments to suppliers
- **Reports** - Financial summaries and profitability analysis

### Role-Based Access
- **Admin** - Full access to all features
- **Manager** - Projects, purchases, expenses, invoicing (no user deletion)
- **Accountant** - Financial operations (invoices, receipts, vendor payments)
- **Site Engineer** - Update project progress, log expenses
- **Viewer** - Read-only access

## Tech Stack

- **Framework**: Next.js 16 + React 19
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Language**: TypeScript

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your Project URL and Anon Key
3. Run the database schema: Copy contents of `supabase/schema.sql` and execute in SQL Editor

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

## Database Schema

### Core Tables
- `clients` - Pool owners/clients
- `vendors` - Material suppliers and contractors
- `projects` - Pool construction projects with contract details
- `project_phases` - Construction phases per project
- `purchase_orders` + `purchase_order_items` - Vendor orders
- `project_expenses` - Site costs and miscellaneous expenses
- `invoices` + `invoice_items` - Client billing
- `receipts` - Client payments received
- `vendor_payments` - Payments to vendors
- `app_users` - Application users with roles

### Key Features
- Automatic invoice/project code generation (POOL-YYYY-NNN, INV-YYYY-NNN, PO-YYYY-NNN)
- VAT calculation (5% UAE standard)
- Project profitability calculation function
- Auto-updated timestamps

## Project Structure

```
alwahaa-pools/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Dashboard
│   ├── layout.tsx         # Root layout
│   ├── projects/          # Project management
│   ├── vendors/           # Vendor management
│   ├── purchases/         # Purchase orders
│   ├── expenses/          # Project expenses
│   ├── invoices/          # Client invoicing
│   └── reports/           # Financial reports
├── lib/                   # Business logic
│   ├── auth.ts           # Authentication
│   ├── auth-constants.ts # Roles & permissions
│   ├── projects.ts       # Project CRUD
│   ├── clients.ts        # Client CRUD
│   ├── vendors.ts        # Vendor CRUD
│   ├── purchases.ts      # PO management
│   ├── expenses.ts       # Expense tracking
│   ├── invoices.ts       # Invoice management
│   ├── receipts.ts       # Payments & receipts
│   └── supabase.ts       # Supabase client
├── supabase/
│   └── schema.sql        # Database schema
└── components/           # React components
```

## Next Steps

1. Create login page and authentication flow
2. Build CRUD forms for each module
3. Add print-friendly invoice layouts
4. Create financial dashboard with charts
5. Add file uploads (project photos, receipts)

## License

Private - Alwahaa Technical Services LLC
