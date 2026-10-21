# Goalward website

The marketing site for [goalward.dev](https://goalward.dev), for the Goalward macOS app.

## Tech stack

Vite and TypeScript. Static assets are served with Cloudflare Workers.

## Run locally

Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
npm run build
```

It deploys automatically to goalward.dev on merge to main.
