# BreathEasyAI

Small Vite + React app for a guided box-breathing session, with optional reverse geocoding through a local Mapbox token proxy so your Mapbox secret stays off the client.

## Prerequisites

- Node18+
- A [Mapbox access token](https://docs.mapbox.com/help/getting-started/access-tokens/) if you want place names from the proxy

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and set MAPBOX_TOKEN for the proxy
```

## Run

**Frontend** (port 8080):

```bash
npm run dev
```

**Geocoding proxy** (port 5000 by default):

```bash
npm run server
```

Point the app at the proxy (optional; defaults to `http://localhost:5000`):

```bash
VITE_MAP_PROXY_URL=http://localhost:5000 npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Project layout

- `src/` — React UI
- `securityApI.js` — Express proxy for `/api/mapbox` (rate-limited, validates coordinates)

The UI is not medical advice; use it as a calm breathing aid only.
