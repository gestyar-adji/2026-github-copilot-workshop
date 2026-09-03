# Procurement MVP — GitHub Copilot Workshop

A hands-on, full-stack web application workshop for building a procurement management system (PR → PO → GR) with **GitHub Copilot** across the entire software development lifecycle.

## Project Overview

**Procurement MVP** demonstrates a realistic but scoped purchasing workflow:

1. **Purchase Requisition (PR):** Employees request items/services; managers review and approve.
2. **Purchase Order (PO):** Approved requisitions are converted into purchase orders sent to suppliers.
3. **Goods Receipt (GR):** When items arrive, a goods receipt confirms delivery and triggers payment.

This workshop teaches full-stack development patterns using **Copilot** to scaffold, validate, and test at each layer—from database design to end-to-end testing.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vue 3 + Vite | Modern reactive UI with hot module reloading |
| **Backend** | Fastify (Node.js) | Lightweight REST API framework |
| **Database** | PostgreSQL (Docker) | Persistent data store with Docker for consistency |
| **Unit Testing** | Jest | Fast, focused business logic validation |
| **E2E Testing** | Playwright | Cross-browser workflow testing |

---

## Workshop Scope

### Included (Baseline)
- ✅ Database schema and sample seed data (`db/migrations/`, `db/seeds/`)
- ✅ Dashboard and home page
- ✅ PR module: list, create, submit, approve, detail views
- ✅ PR REST APIs with validation
- ✅ Vue component foundations and styling patterns

### Participant Implementation (Backlog)
- 🔨 **PO module:** list, create, submit, detail views
- 🔨 **PO REST APIs:** allocation logic, status transitions
- 🔨 **PO validations:** ensure allocation qty ≤ PR line remaining qty
- 🔨 **Unit tests** (Jest) for PO business rules
- 🔨 **E2E tests** (Playwright) for PO user flows

### Not in Scope
- ❌ **GR module** (further exploration after workshop)
- ❌ Authentication, SSO, role-based access control
- ❌ Notifications, reporting, advanced compliance
- ❌ Production deployment and scaling

*Optional post-backlog exercise:* Bookmark feature for PR/PO/GR via GitHub Issue-driven development.

---

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js (v16+)
- npm

### 1. Start the Database

```bash
docker compose down -v   # Clean start (first time)
docker compose up -d db  # Start PostgreSQL
```

The database initializes automatically with:
- Schema migration: `db/migrations/001_init_procurement_mvp.sql`
- Sample data: `db/seeds/002_seed_procurement_mvp.sql`

Verify initialization:
```bash
docker compose exec -T db psql -U workshop -d procurement_mvp \
  -c "SELECT pr_number, status FROM purchase_requisitions ORDER BY pr_number;"
```

### 2. Start the Backend

```bash
cd backend
npm install
npm run dev
```

The API server runs at `http://localhost:3000`. Access API docs at:
```
http://localhost:3000/api-docs
```

### 3. Start the Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Project Structure

```
.
├── backend/                      # Fastify REST API
│   ├── src/
│   │   ├── app.js               # Fastify server initialization
│   │   ├── config.js            # Configuration (port, DB URL, etc.)
│   │   ├── server.js            # Server entry point
│   │   ├── plugins/
│   │   │   └── db.js            # PostgreSQL connection pool
│   │   ├── routes/              # HTTP route handlers
│   │   │   ├── requisition-routes.js
│   │   │   └── purchase-order-routes.js
│   │   └── services/            # Business logic layer
│   │       ├── requisition-service.js
│   │       └── purchase-order-service.js
│   └── tests/                   # Jest unit tests
│       └── services/
│
├── frontend/                     # Vue 3 + Vite frontend
│   ├── src/
│   │   ├── App.vue              # Root component
│   │   ├── main.js              # Vue application entry
│   │   ├── api.js               # API client helper
│   │   ├── styles.css           # Global styles
│   │   ├── components/          # Reusable UI components
│   │   │   ├── LineAllocationTable.vue
│   │   │   └── PurchaseOrderHeaderForm.vue
│   │   ├── pages/               # Page-level components (routed)
│   │   │   ├── DashboardPage.vue
│   │   │   ├── PurchaseOrderListPage.vue
│   │   │   ├── PurchaseOrderCreatePage.vue
│   │   │   ├── PurchaseOrderDetailPage.vue
│   │   │   ├── RequisitionListPage.vue
│   │   │   ├── RequisitionCreatePage.vue
│   │   │   ├── RequisitionDetailPage.vue
│   │   │   └── RequisitionCreatePage.vue
│   │   ├── router/
│   │   │   └── index.js         # Vue Router configuration
│   │   └── assets/              # Static images/icons
│   ├── vite.config.js
│   └── package.json
│
├── db/                          # Database definition
│   ├── migrations/              # Schema creation
│   │   └── 001_init_procurement_mvp.sql
│   └── seeds/                   # Sample data
│       └── 002_seed_procurement_mvp.sql
│
├── docker/                      # Container configuration
│   └── postgres/
│       └── init/
│           └── 00-init-mvp-db.sh  # Database bootstrap script
│
├── docs/                        # Project documentation
│   ├── plan.md                  # Detailed workshop plan
│   ├── application-guide.md     # User guide and flows
│   ├── progress.md              # Implementation status
│   └── runbook.md               # Operations guide
│
├── tests/                       # E2E test suite
│   └── e2e/
│       └── po-module.spec.js    # Playwright PO tests
│
├── graphify-out/                # AST knowledge graph (generated)
│   └── graph.json               # Codebase structure reference
│
├── docker-compose.yml           # Container orchestration
├── playwright.config.js         # E2E test configuration
└── AGENTS.md                    # Copilot agent setup
```

---

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Requisition Endpoints (Baseline)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/requisitions` | Create a new PR |
| `POST` | `/requisitions/:id/submit` | Submit PR for approval |
| `POST` | `/requisitions/:id/approve` | Approve submitted PR |
| `GET` | `/requisitions/:id` | Fetch PR details |
| `GET` | `/requisitions/:id/open-lines` | Fetch unallocated PR lines |

### Purchase Order Endpoints (Participant Backlog)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/purchase-orders` | Create a new PO (allocate PR lines) |
| `POST` | `/purchase-orders/:id/submit` | Submit PO to supplier |
| `GET` | `/purchase-orders/:id` | Fetch PO details |
| `GET` | `/purchase-orders/:id/open-lines` | Fetch undelivered PO lines |

### Validation Rules

1. **PO Allocation:** Allocated quantity must not exceed PR line remaining quantity.
2. **PO Status:** Transitions must follow: `DRAFT` → `SUBMITTED`.
3. **GR Status** (future): Transitions must follow: `DRAFT` → `POSTED`.

---

## Key Workflows

### 1. Create and Approve a Purchase Requisition

```
1. Navigate to /requisitions
2. Click "New Requisition"
3. Fill in header (vendor, items, quantities)
4. Add line items (description, qty, unit price)
5. Click "Submit"
6. (As approver) Navigate to requisition detail
7. Click "Approve"
```

### 2. Create a Purchase Order from Approved PR Lines

```
1. Navigate to /purchase-orders
2. Click "New Purchase Order"
3. Select approved PR lines and allocate quantities
4. Click "Create Order"
5. Review PO detail page
6. Click "Submit" to send to supplier
```

---

## Development Workflow

### Run Tests

**Backend unit tests:**
```bash
cd backend
npm run test
```

**Frontend component tests:**
```bash
cd frontend
npm run test
```

**E2E tests (requires running backend + frontend):**
```bash
npm run test:e2e
```

### Linting and Formatting

```bash
npm run lint
npm run format
```

---

## Troubleshooting

### Database Issues

**Problem:** `relation "purchase_requisitions" does not exist`

**Solution:**
```bash
chmod +x docker/postgres/init/00-init-mvp-db.sh
docker compose down -v
docker compose up -d db
docker compose logs --no-color db | tail -20
```

**Expected log messages:**
```
[initdb] Running baseline migration...
[initdb] Seeding sample data...
[initdb] Database initialization complete.
```

### Backend Won't Connect to DB

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:** Ensure the database container is running:
```bash
docker compose ps
```

If not running, start it:
```bash
docker compose up -d db
```

### Frontend Won't Load

**Problem:** Blank page or module errors

**Solution:** Clear cache and reinstall:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## Repository Hygiene

Generated artifacts are **intentionally ignored** and should not be committed:
- `playwright-report/` — E2E test reports
- `test-results/` — Test result logs
- `backend/coverage/` — Unit test coverage reports
- `frontend/coverage/` — Frontend coverage reports

If you need to share test evidence in the workshop, export screenshots or logs outside the repository.

---

## Documentation

- [Workshop Plan](docs/plan.md) — Detailed scope, architecture, and API requirements
- [Application Guide](docs/application-guide.md) — User workflows and feature overview
- [Progress Summary](docs/progress.md) — Implementation status and completed modules
- [Operations Runbook](docs/runbook.md) — Deployment and maintenance procedures
- [Copilot Agent Setup](AGENTS.md) — Custom agent configuration for this workshop

---

## Contributing

This workshop project follows these guidelines:

1. **Branch Naming:** Use `feature/` prefix for new features (e.g., `feature/po-module`)
2. **Commit Messages:** Keep them concise and descriptive; no emojis
3. **Code Style:** Follow existing patterns in the codebase; let Copilot suggest improvements
4. **Tests:** Add Jest tests for services and Playwright tests for user flows
5. **Scope:** Focus on the PR/PO/GR business domain; avoid unrelated enterprise features

---

## Learning Goals

By completing this workshop, you will:

- ✓ Scaffold a full-stack web application with **Copilot**
- ✓ Build a REST API with validation and business logic
- ✓ Create data-driven Vue components and forms
- ✓ Write focused unit tests (Jest) and end-to-end tests (Playwright)
- ✓ Integrate frontend and backend with the database
- ✓ Use **Copilot** to speed up testing, debugging, and refactoring

---

## Support

For workshop-related questions or issues, refer to:
- [docs/plan.md](docs/plan.md) for scope and architecture details
- [docs/application-guide.md](docs/application-guide.md) for user flows
- [AGENTS.md](AGENTS.md) for Copilot agent troubleshooting

---

**Happy coding! 🚀**

## Suggested Workshop Output
- Running baseline PR module + participant-completed PO module on Docker PostgreSQL
- PO happy path demo: create PO from approved PR open lines, submit, and view detail
- Focused Jest tests for PO business validations (over-allocation + status transition)
- Playwright coverage focused on PO flow integrated with baseline PR data
