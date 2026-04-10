# BreathEasyAI

## Overview

BreathEasyAI is a single-page web application that guides users through a **box-breathing** exercise (four phases, four seconds each) with clear visual timing and optional **reverse geocoding** of the user’s location. It addresses two practical problems: (1) keeping third-party API secrets off the browser by proxying Mapbox through a small backend, and (2) providing a focused, accessible UI for paced breathing without embedding tokens in client bundles. The result is a deployable frontend plus a minimal API surface suitable for local development or extension toward production hardening.

## Key Features

- Timed **4×4 box breathing** with phase labels, step indicator, and synchronized SVG ring progress
- **Breathing orb** with scaled visual feedback and easing tuned for calm, non-distracting motion
- **Browser geolocation** (optional) with graceful handling for denial or unsupported environments
- **Mapbox Geocoding API** integration behind **`GET /api/mapbox`** so the Mapbox token never ships to the client
- **Coordinate validation** (numeric parsing and latitude/longitude bounds) before upstream calls
- **Rate limiting** on the proxy (per IP, fixed window) to reduce abuse
- **OKLCH-based** design tokens, light/dark variables, and **`prefers-reduced-motion`** support for core animations
- **Production build** via Vite with TypeScript and ESLint in the toolchain

## Tech Stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | React 18, TypeScript, Vite (`@vitejs/plugin-react-swc`), React DOM |
| **Styling** | Tailwind CSS 3, PostCSS, Autoprefixer, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| **UI / DX** | shadcn-aligned project layout (`components.json`), Radix UI primitives and related libraries (project scaffold; extend as needed) |
| **Backend (proxy)** | Node.js (ES modules), Express, Axios, CORS, `express-rate-limit`, `dotenv` |
| **External API** | Mapbox Geocoding v5 (`mapbox.places` reverse lookup) |
| **Quality** | ESLint 9, `typescript-eslint`, React Hooks / Refresh plugins |

## Architecture / Approach

The **client** is a static SPA served by Vite in development and emitted as static assets after `npm run build`. It requests the user’s coordinates when permitted, then optionally calls the **proxy** at `VITE_MAP_PROXY_URL` (default `http://localhost:5000`) with `lat` and `lon` query parameters. The **Express server** (`securityApI.js`) reads `MAPBOX_TOKEN` from the environment, validates inputs, forwards a single geocoding request to Mapbox, normalizes error responses (no raw upstream leakage to the client), and returns JSON to the browser. This **BFF-style** split keeps secrets server-side and centralizes throttling at one endpoint. The breathing loop is driven by a fixed **4-second phase interval** aligned with SVG stroke animation and transform transitions; reduced-motion users get a static progress ring and no long transitions.

## Installation & Setup

**Requirements:** Node.js 18 or newer, npm.

```bash
git clone https://github.com/diaboliquepapillon/breatheTheEasyAI.git
cd breatheTheEasyAI
npm install
cp .env.example .env
```

Edit `.env` and set:

- `MAPBOX_TOKEN` — required for place names via the proxy  
- `PORT` — optional; default `5000` for the Express server  

## Usage

**1. Start the geocoding proxy** (from project root):

```bash
npm run server
```

**2. Start the frontend** (default dev server on port **8080**):

```bash
npm run dev
```

**3. Optional:** point the SPA at a non-default proxy base URL:

```bash
VITE_MAP_PROXY_URL=http://localhost:5000 npm run dev
```

Open the URL printed by Vite (typically `http://localhost:8080`). Allow location access if you want reverse geocoding; the breathing guide works without it.

**Production preview after build:**

```bash
npm run build
npm run preview
```

**Lint:**

```bash
npm run lint
```

## Results / Output

- **Browser:** A guided breathing session with visible phase text, step strip, and ring progress; optional “where you are” line populated with a **place name** or coordinates when the proxy and token are configured.
- **Proxy:** JSON body from Mapbox on success; **400** for invalid coordinates, **503** if `MAPBOX_TOKEN` is missing, **502** for upstream geocoding failures, **500** for unexpected server errors, **429** when rate limits trigger.
- **Build:** Optimized static assets under `dist/` suitable for static hosting; dev server binds to `::` on port **8080** per Vite config.

*Disclaimer: This application is a wellness aid only and does not provide medical advice.*

## Key Learnings

- **Never expose Mapbox (or similar) tokens in the client**; a thin proxy with validation and rate limits is a small upfront cost with large security payoff.
- **Input validation at the API boundary** (types, ranges) prevents malformed requests from hitting paid or quota-limited third-party APIs.
- **Motion design carries UX cost**: synchronizing timers, SVG animation, and CSS transforms requires a consistent phase clock and explicit **`prefers-reduced-motion`** handling.
- **OKLCH and tinted neutrals** simplify perceptually consistent theming and dark-mode surfaces compared with ad hoc HSL grays.
- **Separation of concerns** between “breathing UX” and “location enrichment” keeps the core experience usable when geolocation or Mapbox is unavailable.

## Future Improvements

- Add a root **`.gitignore`** for `node_modules/`, `dist/`, and local `.env` if not already present in deployment workflows.
- **Automated tests** for the proxy (validation, error mapping, rate limit behavior) and shallow component tests for phase transitions.
- **CI pipeline** (install, lint, build) on pull requests.
- **Air quality or environmental data** (separate API) with the same proxy pattern, if product scope expands beyond breathing guidance.
- **Hardening for production**: structured logging, request IDs, trusted proxy configuration behind TLS, and stricter CORS origin allowlists.
