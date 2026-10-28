# KC Agency — Complete System & Architecture Documentation

Complete technical reference and architecture documentation for the **KC Agency POS / Distributor Billing System**:
consisting of a **React.js Web App** (`frontend/`), a **React Native Mobile App** (`KC/`), and a **PHP REST API Backend** (`backend/`) powered by **MySQL / MariaDB**.

Everything in this document is verified against the actual codebase.

---

## 1. System Overview

```
KC Agency Platform
   │
   ├── React.js Web (frontend/)
   │       │
   │       └── PHP REST API (backend/)
   │                 │
   │                 └── MySQL / MariaDB (pos_system)
   │
   └── React Native Mobile (KC/)
           │
           └── same PHP REST API (backend/)
                     │
                     └── same MySQL / MariaDB (pos_system)
```

Both the web application and the mobile application operate as thin clients over **one shared PHP REST API backend** — there is no separate mobile API. Both clients connect to the single entry point `backend/public/index.php` and interact with the same database schema.

### Authentication & Authorization Flow

```
1. Login Request (email + password)
   ↓
2. AuthController::login()
   - Verifies password using PHP password_verify()
   - Encodes user ID, email, role_id, branch_id, and assigned permissions into a signed JWT
   ↓
3. Client Token Persistence:
   - Web App: In-memory / Axios request interceptor via localStorage
   - Mobile App (KC/): Secure storage via react-native-encrypted-storage ('kc_agency_token', 'kc_agency_user')
   ↓
4. Authenticated Request with "Authorization: Bearer <token>"
   ↓
5. JwtAuthMiddleware::authenticate()
   - Decodes JWT using firebase/php-jwt and secret key
   - Attaches authenticated user claims to the request context
   ↓
6. PermissionMiddleware::require($claims, 'permission.code')
   - Validates whether user role or individual user override grants the permission
   - Returns HTTP 403 Forbidden if not authorized
   ↓
7. Controller Business Logic
   - Executes prepared statements through raw PDO connection
   ↓
8. Database (MySQL / MariaDB)
   ↓
9. JSON Response delivered to UI with automatic TanStack React Query cache synchronization
```

---

## 2. Repository Structure

```
KC-agencyR/                                  (Git repository root)
├── backend/                                 PHP REST API Backend
│   ├── config/                              database.php, config.php (driven by .env)
│   ├── database/                            Master schema, seeds, migrations
│   │   ├── migrations/                      Timestamped incremental migration SQL files
│   │   ├── schema.sql                       Master canonical database schema (55+ tables)
│   │   └── seed.sql                         Default roles, permissions, admin user, company
│   ├── public/                              index.php (Single entry router), uploads/
│   ├── src/
│   │   ├── Controllers/                     20+ REST Controllers (Auth, POS, Inventory, VanStock, etc.)
│   │   ├── Helpers/                         Router.php, Response.php, etc.
│   │   ├── Middleware/                      CorsMiddleware, JwtAuthMiddleware, PermissionMiddleware
│   │   ├── Models/                          Data models (VanStockModel, ItemModel, InvoiceModel, etc.)
│   │   └── Services/                        StockLedgerService, etc.
│   ├── composer.json
│   └── .env.example
├── frontend/                                React Web Application
│   ├── public/                              PWA manifest, icons, static assets
│   ├── src/
│   │   ├── api/                             Axios API clients (client.js, catalog.js, invoices.js, etc.)
│   │   ├── components/                      PrintPreviewModal, BarcodeModal, UI components
│   │   ├── hooks/                           useAuth, usePermission, useNetworkStatus
│   │   ├── pages/                           POS, Inventory, OrderManagement, Catalog, Reports, etc.
│   │   ├── store/                           Zustand stores (branchStore.js, authStore.js)
│   │   ├── utils/                           reportPdf.js, formatters, calculations
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── KC/                                      React Native Mobile Application (formerly AJ)
│   ├── android/                             Native Android Project (Gradle, Kotlin, SDK 36)
│   │   └── app/
│   │       ├── build.gradle                 applicationId: com.kcagencymobile, namespace: com.kcagencymobile
│   │       └── src/main/
│   │           ├── java/com/kcagencymobile/ MainActivity.kt, MainApplication.kt
│   │           └── res/values/strings.xml   app_name: "KC Agency"
│   ├── ios/                                 Native iOS Project (Xcode, CocoaPods)
│   ├── src/
│   │   ├── api/                             Axios API clients matching web
│   │   ├── components/                      ThermalReceiptModal, BarcodeScannerModal, EntityListScreen
│   │   ├── config/env.js                    API_BASE_URL (configurable LAN IP / host)
│   │   ├── navigation/                      DrawerContent, RootNavigator, navItems
│   │   ├── screens/                         POS, Orders, Purchasing, Collections, Reports, etc.
│   │   ├── storage/secureStorage.js         Secure storage with 'kc_agency_token' and 'kc_agency_user'
│   │   └── utils/                           printerService.js (Bluetooth ESC/POS Thermal), pdfService.js
│   ├── app.json                             name: "KcAgencyMobile", displayName: "KC Agency"
│   ├── package.json                         name: "KcAgencyMobile"
│   └── babel.config.js
├── KC_AGENCY_PROJECT_DOCUMENTATION.md       (This consolidated technical reference file)
├── README.md                                (Phase history and project notes)
└── .gitignore                               (Strict rules protecting secrets, uploads, .env)
```

---

## 3. Technology Stack & Verified Versions

| Layer | Technology | Version / Configuration |
| --- | --- | --- |
| **Backend Language** | PHP | 8.2.12 CLI (Requires `>=8.1`) |
| **Backend Dependencies** | `firebase/php-jwt` `^7.1`, `vlucas/phpdotenv` `^5.6`, `phpoffice/phpspreadsheet` `^5.10` | Managed via Composer |
| **Backend Server** | Apache (XAMPP) | Serves `backend/public/` directly |
| **Database** | MySQL Server / MariaDB | MySQL 9.4 (InnoDB, UTF-8 MB4) |
| **Frontend Framework** | React.js | 18.3.1 |
| **Frontend Tooling** | Vite | 5.4.8 with `vite-plugin-pwa` 0.21.2 |
| **Frontend State & Data** | TanStack React Query 5.59.0, Zustand 4.5.5 | Cache management & Branch Context |
| **Frontend Styling** | Tailwind CSS | 3.4.13 with Lucide React Icons |
| **Mobile Framework** | React Native | 0.87.1 |
| **Mobile React** | React | 19.2.3 |
| **Mobile Architecture** | Hermes & New Architecture | `hermesEnabled=true`, `newArchEnabled=true` |
| **Mobile Android Config** | Android Gradle Plugin | Gradle 9.4.1, `compileSdk` 36, `targetSdk` 36, `minSdk` 24, Kotlin 2.2.0 |
| **Mobile App Identifier** | Application ID & Name | `com.kcagencymobile` / `KC Agency` |
| **Mobile Hardware Support** | Thermal Printer & Scanner | `react-native-bluetooth-escpos-printer`, `react-native-camera-kit` |

---

## 4. Database Architecture & Core Tables

The schema is maintained in `backend/database/schema.sql` (55+ tables) and initialized via `backend/database/seed.sql`.

### Table Grouping by Module

| Module | Primary Database Tables |
| --- | --- |
| **Authentication & RBAC** | `company`, `branches`, `roles`, `permissions`, `role_permissions`, `users`, `user_permissions`, `login_log` |
| **Catalog & Products** | `categories`, `brands`, `category_brands`, `product_lines`, `tax_codes`, `stock_units`, `items`, `item_unit_conversions`, `item_branches` |
| **Parties & Territory** | `routes`, `cities`, `customers`, `suppliers`, `supplier_routes` |
| **POS & Invoicing** | `invoices`, `invoice_items`, `invoice_payments`, `invoice_sequences`, `credit_transactions`, `stock_ledger`, `stock_movements` |
| **Van Stock & Field Ops** | `van_stock`, `stock_issue_notes`, `stock_issue_items`, `stock_return_notes`, `stock_return_items` |
| **Orders & Pre-bookings** | `customer_prebookings`, `customer_prebooking_items` |
| **Purchasing & GRN** | `purchase_requests`, `purchase_request_items`, `purchases` (GRN), `purchase_items`, `supplier_ledger_transactions`, `supplier_payments`, `supplier_payment_allocations` |
| **Stock Adjustments** | `stock_adjustments` |
| **Returns** | `sales_returns`, `sales_return_items`, `purchase_returns`, `purchase_return_items` |
| **Collections & Cash** | `customer_collections`, `collection_allocations`, `cash_handovers`, `cash_handover_items` |
| **Expenses & Income** | `expense_categories`, `expenses`, `other_income` |
| **Settings** | `branch_print_settings` |

### Critical Schema Invariants

1. **Branch-Scoped Invoice Numbering:**
   `invoices.invoice_no` is unique per branch (`uq_invoices_branch_invoice_no (branch_id, invoice_no)`). Multiple branches maintain independent continuous sequences (e.g., `INV-000001`).
2. **Item Availability (`item_branches`):**
   Items are only sellable in branches where an explicit mapping exists in `item_branches`.
3. **Atomic Stock Mutation via `StockLedgerService`:**
   Direct adjustments to stock quantity columns are prohibited. Every inventory movement writes both the running balance to `stock_ledger` and an audit row to `stock_movements` inside an ACID transaction.
4. **Prebooking & Customer Linkage in Stock Issue:**
   `stock_issue_notes` supports `customer_id` and `prebooking_id` columns, allowing warehouse staff to issue van stock specifically reserved for confirmed customer pre-orders.

---

## 5. Key Business Modules & Workflows

### 5.1 POS Billing & KC Discount Handling
* **Real-Time Frontend Calculation:**
  In `frontend/src/pages/POS.jsx` and `KC/src/screens/pos/POSScreen.jsx`, line item discounts and overall KC discount (percentage `%` or flat currency amount) are dynamically computed:
  $$\text{Grand Total} = (\text{Subtotal} - \text{Discount}) + \text{Tax}$$
* **Pricing Modes:**
  Supports Normal, Retail, and Wholesale pricing tiers per item.
* **GST & Non-GST Billing:**
  Whole-bill toggle ensuring strict tax separation. In GST mode, CGST and SGST are split evenly.
* **Payment Split:**
  Supports split settlement between Cash, Digital (UPI/Card), and Customer Credit (shortfall logged against customer ledger).
* **Thermal & A4 Printing:**
  Immediate 80mm ESC/POS thermal receipt formatting and full A4 invoice printing via `PrintPreviewModal.jsx` and WhatsApp direct share link.

### 5.2 Van Stock & Stock Issue Notes
* **Van Stock Allocation:**
  Warehouse managers issue goods to field sales staff using `POST /api/van-stock/issue`.
* **Customer & Pre-Booking Association:**
  Stock issue notes can link directly to a specific `customer_id` and `prebooking_id`, enabling field executives to deliver exact pre-ordered batches.
* **Returns to Warehouse:**
  Unsold goods in the van are reconciled and returned to warehouse inventory via `POST /api/van-stock/return`.

### 5.3 Customer Pre-Booking (Orders)
* Field agents or cashiers enter pre-bookings for customers who place advance orders.
* Pre-booking statuses: `pending`, `confirmed`, `delivered`, `cancelled`.
* Export capabilities and seamless conversion to delivery / stock issue notes.

### 5.4 Purchasing & Supplier Ledger
* **Purchase Requests (PR):** Internal indent request with approval workflow.
* **Goods Received Note (GRN):** Records physical arrival of stock, increments stock ledger, and records accounts payable in `supplier_ledger_transactions`.
* **Supplier Payments:** Direct payment entries allocated to unpaid GRNs.

### 5.5 Collections & Cash Handover
* Field executives collect cash/cheque/digital payments from credit customers.
* At day-end, executives perform a cash handover to the branch manager.
* Branch managers verify physical cash before marking handover status as `verified`.

---

## 6. Complete API Reference

All routes are dispatched from `backend/public/index.php` under the `/api` prefix and require `Bearer <JWT>` unless marked Public.

### Authentication
| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Public | Verify credentials, return signed JWT |
| `GET` | `/api/auth/me` | Authenticated | Return profile and effective permission codes |

### Catalog & Items
| Method | Endpoint | Required Permission |
| --- | --- | --- |
| `GET` / `POST` | `/api/categories` | `catalog.manage_items` (write) |
| `GET` / `POST` | `/api/brands` | `catalog.manage_items` (write) |
| `GET` / `POST` | `/api/product-lines` | `catalog.manage_items` (write) |
| `GET` / `POST` | `/api/tax-codes` | `catalog.manage_items` (write) |
| `GET` / `POST` | `/api/stock-units` | `catalog.manage_items` (write) |
| `GET` / `POST` | `/api/items` | `catalog.manage_items` (write) |
| `GET` / `PUT` | `/api/items/pricing` | `catalog.manage_items` |
| `GET` | `/api/items/export` | `catalog.manage_items` |
| `POST` | `/api/items/import/preview` | `catalog.manage_items` |
| `POST` | `/api/items/import/commit` | `catalog.manage_items` |
| `POST` | `/api/items/{id}/image` | `catalog.manage_items` |

### Parties (Customers & Suppliers)
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` / `POST` | `/api/customers` | Customer management |
| `GET` | `/api/customers/{id}/unpaid-invoices` | Outstanding credit invoices |
| `GET` / `POST` | `/api/suppliers` | Supplier management |
| `GET` | `/api/suppliers/{id}/unpaid-grns` | Unpaid GRN purchase records |
| `GET` / `POST` | `/api/routes` | Delivery route configuration |
| `GET` / `POST` | `/api/cities` | City & territory mappings |

### Invoices (POS & Sales)
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` / `POST` | `/api/invoices` | List and create invoices (POS) |
| `GET` | `/api/invoices/{id}` | Single invoice detail with line items |
| `POST` | `/api/invoices/{id}/complete` | Finalize sale, deduct stock, record payments |
| `POST` | `/api/invoices/{id}/cancel` | Void invoice, restore stock |
| `GET` | `/api/invoices/{id}/print` | Printable formatted invoice data |
| `GET` | `/api/invoices/{id}/returnable-items` | Items eligible for sales return |

### Inventory & Van Stock
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/stock-hub` | Live stock levels across warehouses |
| `GET` | `/api/stock-hub/low-stock` | Low stock threshold alerts |
| `POST` | `/api/stock-adjustments` | Manual inventory correction |
| `GET` | `/api/van-stock/{employeeId}` | Current stock held in employee van |
| `POST` | `/api/van-stock/issue` | Issue stock note (with prebooking/customer link) |
| `POST` | `/api/van-stock/return` | Return unsold van goods to main stock |

### Orders & Pre-Bookings
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` / `POST` | `/api/customer-prebookings` | List and create pre-orders |
| `GET` / `PUT` | `/api/customer-prebookings/{id}` | View and update pre-booking details |
| `PUT` | `/api/customer-prebookings/{id}/status` | Update booking status |
| `POST` | `/api/customer-prebookings/{id}/cancel` | Cancel customer pre-order |
| `GET` | `/api/customer-prebookings/export` | Export pre-bookings to Excel |

### Reports & Analytics
| Endpoint | Gated Permission | Output |
| --- | --- | --- |
| `/api/reports/branch-wise-sales` | `reports.branch_sales` | Sales breakdown by branch |
| `/api/reports/brand-wise-sales` | `reports.brand_sales` | Sales breakdown by brand |
| `/api/reports/customer-wise-sales` | `reports.customer_sales` | Customer purchasing totals |
| `/api/reports/credit-outstanding` | `reports.credit_outstanding` | Aging credit balances |
| `/api/reports/gst-register` | `reports.gst_register` | B2B / B2C tax report |
| `/api/reports/non-gst-register` | `reports.non_gst_register` | Non-taxed sale report |
| `/api/reports/purchase-register` | `reports.purchase_register` | GRN purchase totals |
| `/api/reports/profit` | `reports.profit_loss` | Gross & net profit margins |

---

## 7. Mobile Application (`KC/`) Details

The mobile app is located in the root `KC/` directory and is built using React Native 0.87.1.

### Configuration & Identifiers
* **App Display Name:** `KC Agency` (`KC/android/app/src/main/res/values/strings.xml`, `KC/app.json`)
* **Package / Namespace:** `com.kcagencymobile` (`KC/android/app/build.gradle`)
* **Android Main Component:** `KcAgencyMobile` (`KC/android/app/src/main/java/com/kcagencymobile/MainActivity.kt`)
* **Hardcoded LAN API:** `KC/src/config/env.js` provides `API_BASE_URL`. For local device testing, set this to your computer's local network IP (e.g. `http://192.168.1.X/pos/backend/public/api`).
* **Secure Storage:** Token stored under `kc_agency_token` and user profile under `kc_agency_user`.

### Mobile Commands
```bash
# In KC/ folder
cd KC

# Install packages
npm install

# Run Metro bundler
npm start

# Run on Android device / emulator
npm run android
```

---

## 8. Development & Installation Guide

### Prerequisites
* **PHP:** `>= 8.2` with `pdo_mysql`, `gd`, `zip`, `mbstring` extensions enabled.
* **Composer:** 2.x
* **Node.js:** `>= 20.x` (Recommended: 22.x)
* **MySQL:** Server 9.x or MariaDB 10.x
* **Android Studio & SDK 36:** (For mobile development)

### Quick Setup Steps

1. **Clone & Setup Backend:**
   ```bash
   cd backend
   composer install
   copy .env.example .env
   # Configure DB_DATABASE=pos_system, DB_USERNAME, DB_PASSWORD, JWT_SECRET
   ```

2. **Setup Database:**
   ```bash
   mysql -u root -p -e "CREATE DATABASE pos_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p pos_system < database/schema.sql
   mysql -u root -p pos_system < database/seed.sql
   ```

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   copy .env.example .env
   npm run dev
   # Access at http://localhost:5173
   ```

4. **Default Credentials:**
   * **Email:** `admin@example.com`
   * **Password:** `Admin@123`

---

## 9. Safety, Migrations & Deployment Policy

* **Database Migrations:** Every structural alteration must be placed in `backend/database/migrations/` using timestamp format `YYYYMMDD_HHMMSS_name.sql`, and reflected in `backend/database/schema.sql` and `seed.sql`.
* **Zero Data Loss Policy:** Deployment scripts and APIs never run `TRUNCATE`, `DROP`, or bulk destructive statements.
* **Automated Pre-Deploy Backup:** The deployment script automatically generates a full compressed MySQL backup (`.sql.gz`) before modifying code or database structures on remote servers.
* **Upload Protection:** The `uploads/`, `public/uploads/`, and `.env` files are never overwritten during deployments.
