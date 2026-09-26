# Architecture Decisions Log

A running record of significant technical decisions and the reasoning behind them.
Format: **Decision** - **Why** - **Date**

---

## 2026-09-26 - Monorepo structure

**Decision:** Use a single Git repository with client/, server/, shared/, and docs/ folders.

**Why:** Solo developer. One repo = one clone, one commit history, one place for shared TypeScript types. Can split later if the team grows.

---

## 2026-09-26 - TypeScript on both client and server

**Decision:** Use TypeScript everywhere.

**Why:** RentLink has multiple user roles and verification states. Types catch the "wrong role sees wrong data" class of bugs at compile time, not in production.

---

## 2026-09-26 - PostgreSQL

**Decision:** Use PostgreSQL as the primary database.

**Why:** Relational data (users, roles, properties, verification records, complaints) with complex relationships. Postgres handles this natively with foreign keys, transactions, and JSONB when needed.

---

## 2026-09-26 - Backend-first build order

**Decision:** Build backend endpoints before their frontend UI, feature by feature.

**Why:** Forces the frontend to consume real APIs instead of mocks we'd throw away. Catches data-model problems earlier, when they're cheap to fix.

---

## 2026-09-26 - Verification as a first-class concept

**Decision:** Every verification status must be traceable - who set it, when, based on what evidence.

**Why:** Trust is RentLink's core value. A generic "Verified" badge without an audit trail undermines that and creates legal exposure. Verification records are part of the data model from day one.
