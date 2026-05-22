# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build the frontend first (required before docker compose)
cd web && npm run build && cd ..

# Start all services (db, server, web)
docker compose up --build

# Stop all services
docker compose down

# Build images individually
docker build -t splitbill-server ./server
docker build -t splitbill-web ./web

# Local dev (run server separately, then start frontend dev server)
cd web && npm run dev     # starts on http://localhost:5173, proxies /api → localhost:5000
```

The server connects to MySQL using hardcoded credentials (`splitbill`/`splitbill`) against the `splitbill` database.

## Architecture

Three Docker services defined in `docker-compose.yaml`:
- **db** — MySQL 9.4, persists data to `./database/`
- **server** — Flask REST API on port 5000
- **web** — Nginx on port 80: serves the React build, reverse-proxies `/api/*` → `http://server:5000/*`

### Server (`server/`)

Layered Flask app with no ORM:

```
main.py (routes)
  └── controllers/bill.py, item.py
        └── database/tables/bill.py, item.py, person.py  (SQL queries)
              └── database/entities/bill.py, item.py, person.py  (data classes)
              └── database/database.py  (singleton MySQL connection)
```

`Database` is a singleton — one MySQL connection shared across all table objects.

**Bill calculation logic** (`controllers/bill.py:calculate_single_bill`): splits each item's price evenly among its participants, then scales everyone's share by `bill.total / sum(item_prices)`. This scaling handles tax and service charges that inflate the bill total beyond the sum of item prices.

`calculate_all_unsettled_bills` returns a raw `{debtor: {creditor: amount}}` dict (not a list) — flatten it when rendering.

**Data model:**
- `bills` — id, name, total, payer_id, settled
- `items` — id, bill_id, name, price
- `persons` — id, name (always stored lowercase), bank_account
- `item_person` — join table (item_id, person_id)

### Web frontend (`web/`)

React + Vite 5 + Tailwind CSS v3 + React Router v6. Pinned to Vite 5.4.11 (requires Node ≥18; **do not upgrade to Vite 6+** — it requires Node 20.19+).

```
src/api.js          — fetch wrappers for every server endpoint (base path /api)
src/pages/
  Dashboard.jsx     — home: unsettled bill list + net debt table
  NewBill.jsx       — form to create a bill with items/participants
  BillDetail.jsx    — view bill, calculate shares, settle, add/remove participants
```

**API path convention:** all calls go to `/api/...` (relative). Vite's dev server proxies this to `localhost:5000`; Nginx proxies it in production. No CORS config needed.

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.
