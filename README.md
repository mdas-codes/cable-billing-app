<div align="center">
  <h1>🔌 Cable Billing App 📡</h1>
  <p>A high-performance, mobile-first query and subscription payment management system optimized for field collection operations.</p>

  <p>
    <a href="https://cable-billing-app.vercel.app">Live Demo</a> ·
    <a href="https://github.com/mdas-codes/cable-billing-app/issues">Report Bug</a> ·
    <a href="https://github.com/mdas-codes/cable-billing-app">Repository</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-14+-black?logo=next.js&logoColor=white" alt="Next.js">
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React">
    <img src="https://img.shields.io/badge/Tailwind_CSS-utility--first-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
    <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" alt="Prisma">
    <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase">
    <img src="https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel&logoColor=white" alt="Vercel">
  </p>
</div>

---

## ✨ Features

### 📱 Collection Agent Desk
* **⚡ Zero-Lag Instant Filtering:** Real-time lookup bar dynamically filters remaining route houses by **Subscriber Name** or **Customer ID** on the client side instantly.
* **🎯 Smart Tap Form Hydration:** Tapping an entry on the route auto-populates the primary billing drawer, locks in currency counters, clears prior errors, and smoothly scrolls to top viewports.
* **🎨 High-Contrast Field UX:** Features deep slate elements, bright indicators, and large tap-targets optimized for outdoors and high sunlight visibility.
* **📊 Dynamic Walk-List Synchronization:** Active customer targets immediately drop from the field agent's screen the second a collection transaction goes through.

### ⚙️ Admin Control Panel
* **📊 Dashboard Statistics:** Shows real-time monitoring cards capturing remaining route workloads, active collections counts, and gross balances settled.
* **📋 Records Logs:** Full history log tracking each recorded payment entry with contextual collector notes and time stamps.
* **🛠️ Tools & Utilities:** Administrative settings modules for modifying custom backdated entries, missed payments routing setups, and system synchronization hooks.

---

## 🛠️ Tech Stack & Layers

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, Next.js 14+ (App Router) | Client UI states & performance lifecycle rendering. |
| **Styling Engine** | Tailwind CSS | Utility-first mobile-responsive viewport styling. |
| **Backend API Layer** | Next.js Internal API Routes (Monorepo) | Serverless micro-endpoints handling records data. |
| **Database & ORM** | Supabase (PostgreSQL) + Prisma ORM | Schema migrations, data state engine, and database ledger. |
| **Deployment Platform** | Vercel (All-in-One Architecture) | Scaled serverless global routing. |

---

## 🔐 Demo Access Configuration

* **Public Link:** [cable-billing-app.vercel.app](https://cable-billing-app.vercel.app)
* **Collector Route:** Access the root `/` path directly to test field route lookups and payment entries.
* **Protected Admin Panel:** Access to the specialized `/admin` dashboard requires verification tokens saved into local sessions.
* **🔑 Password Access:** To get the administrative testing security passcode, please contact **Saikat** directly through his GitHub profile at [saikat-codes](https://github.com/saikat-codes).

---

## 📡 API Reference Framework

**Base Production URL:** `https://cable-billing-app.vercel.app`

### 👥 Customer Accounts & Routing Paths
| Method | Endpoint | Description | Payload Data Queries |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/customers?mode=walklist` | Fetches active uncollected route listings | *None* |
| **GET** | `/api/customers?customerId=X` | Searches singular customer master record | `customerId` (String) |

### 💳 Collection Transactions
| Method | Endpoint | Description | Security Requirements |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/payments` | Submits client settlement details | JSON Payload Request Body |
| **GET** | `/api/admin/summary?mode=today` | Returns historical lists already paid today | `x-admin-password` Header |

#### Example Request Structure (POST `/api/payments`)
```json
{
  "customerId": "S-06",
  "amountPaid": 350.00,
  "recordedBy": "COLLECTOR",
  "note": "Paid cash at main desk"
}
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites

* Node.js Environment (v18.0 or newer recommended)
* An active [Supabase Workspace Engine](https://supabase.com) database instance

### 1. Clone the Repository

```bash
git clone https://github.com/mdas-codes/cable-billing-app.git
cd cable-billing-app
```

### 2. Dependency Infrastructure Provisioning

```bash
npm install
```

### 3. Setup Environment Secret Enclaves

Create a standard configurations file named `.env` inside the project root folder:

```env
# Connection string for your Supabase PostgreSQL database instances
DATABASE_URL="postgresql://postgres:your_password@db.your_supabase_id.supabase.co:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:your_password@db.your_supabase_id.supabase.co:5432/postgres?schema=public"

# Admin UI access passkey
ADMIN_PASSWORD="your_admin_panel_password"
```

### 4. Push Database Schema & Models

Sync your local Prisma schema definition layout to the live Supabase instance:

```bash
npx prisma db push
```

### 5. Boot Up Local Development Instance

```bash
npm run dev
```

Open up your local host link at [http://localhost:3000](http://localhost:3000) to work on your dashboard views.

---

## 📐 Project Structure Matrix

```text
cable-billing-app/
├── app/
│   ├── admin/
│   │   └── page.jsx                  # Admin Dashboard, Records View & Utilities
│   ├── api/
│   │   ├── admin/summary/route.js    # Synchronizes active logs and balance tallies
│   │   ├── customers/                # Handles individual subscriber validations
│   │   ├── packages/                 # Pipeline infrastructure for cable plans
│   │   └── payments/
│   │       └── route.js              # Accepts collection updates & registers dues
│   ├── favicon.ico
│   ├── globals.css                   # Core Tailwind Base Utilities
│   ├── layout.js                     # Global Application Layout Contexts
│   └── page.js                       # Primary Field Collector Operations Interface
├── lib/
│   ├── auth.js                       # Session verification utilities
│   └── prisma.js                     # Cached Prisma Client Singleton initialization
├── prisma/
│   └── schema.prisma                 # Database Relation Models for Customers & Payments
├── public/                           # Brand Assets & Interface Graphics
├── .env                              # Managed environment file configurations
├── .gitignore
├── eslint.config.mjs
├── jsconfig.json
├── next.config.mjs                   # System Framework Options Configuration
├── package.json                      # Build Commands & Project Dependencies
└── postcss.config.mjs
```

---

## 👥 Contributors

| Role | Name | GitHub |
| :--- | :--- | :--- |
| Contributor & Maintainer | Saikat | [@saikat-codes](https://github.com/saikat-codes) |

Interested in contributing? Feel free to fork the repo, open a pull request, or file an issue with your suggestions.

---

## 📬 Contact

For demo access, admin passcodes, bug reports, or general questions about this project, reach out to **Saikat** through his GitHub profile: [github.com/saikat-codes](https://github.com/saikat-codes).
