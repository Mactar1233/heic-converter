# HEIC → PNG Converter

A tiny web app that converts Apple HEIC/HEIF images to PNG **entirely in the browser**. No files are uploaded to any server — conversion runs locally via WebAssembly ([`heic2any`](https://github.com/alexcorvi/heic2any)), so it's private and free to host.

## Features

- Drag & drop or click to select `.heic` / `.heif` files
- Batch convert many files at once
- Live PNG previews + individual and "download all" buttons
- 100% client-side — no backend, no cost, no privacy concerns

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

**Option A — from the dashboard**

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. Framework preset auto-detects **Next.js**. Leave defaults and click **Deploy**.

**Option B — Vercel CLI**

```bash
npm i -g vercel
vercel        # follow prompts, accept defaults
vercel --prod # promote to production
```

That's it — Vercel builds and hosts it with a free HTTPS URL.

## How it works

`heic2any` decodes HEIC (which uses the HEVC codec) using a WebAssembly build of libheif and re-encodes to PNG on a canvas. Because everything runs in the browser, your photos never leave your device.
