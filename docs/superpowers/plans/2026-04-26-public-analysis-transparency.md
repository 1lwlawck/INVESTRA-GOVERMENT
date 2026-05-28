# Public Analysis Transparency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let public users understand what INVESTRA is and check which investment cluster their province belongs to without admin login.

**Architecture:** Add read-only public Flask endpoints that expose the latest active-dataset analysis summary and per-province analysis. Add a frontend API client and remodel the landing page into an information-first public portal with a province search flow.

**Tech Stack:** Flask, SQLAlchemy, React, TypeScript, Vite, Tailwind CSS, lucide-react.

---

### Task 1: Backend Public Analysis API

**Files:**
- Create: `investra-gov-apps-be/app/controllers/PublicController.py`
- Create: `investra-gov-apps-be/app/api/Public.py`
- Modify: `investra-gov-apps-be/app/__init__.py`

- [ ] Verify missing endpoint returns 404 before implementation.
- [ ] Create a controller that reads `Dataset.getActive()` and `getLatestResult()`.
- [ ] Expose summary, province list, and province detail payloads without auth.
- [ ] Register the public blueprint under `/api`.
- [ ] Verify endpoint shape manually with Flask/Docker.

### Task 2: Frontend Public API Client

**Files:**
- Create: `investra-gov-apps-fe/src/core/api/public.api.ts`

- [ ] Add TypeScript types for public summary, cluster, province list item, and province detail.
- [ ] Add `getSummary`, `getProvinces`, and `getProvinceAnalysis` functions.
- [ ] Use existing `apiFetch` for consistent error handling.

### Task 3: Public Landing Page Remodel

**Files:**
- Modify: `investra-gov-apps-fe/src/pages/landing/LandingPage.tsx`

- [ ] Replace marketing-style copy with public education copy.
- [ ] Add "Cek Daerah Saya" search/select module using public API data.
- [ ] Add national summary, cluster explanation, data/methodology, and limitations sections.
- [ ] Remove dummy dashboard numbers and placeholder social/search affordances.
- [ ] Keep login as a secondary action for system managers.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run frontend build with `npm run build`.
- [ ] Rebuild/restart Docker services if needed.
- [ ] Verify public endpoints return 200.
- [ ] Verify the public page renders and can retrieve province information.
