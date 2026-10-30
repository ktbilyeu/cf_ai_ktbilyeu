# AI Assistant

Modern conversational AI powered by Llama 3.3, built with TypeScript and Cloudflare Workers.

> **Note:** This project uses [pnpm](https://pnpm.io/) as the package manager.

## Features

- TypeScript implementation
- dark UI with sidebar
- Persistent conversation memory
- Enhanced AI capabilities
- Responsive design
- Real-time chat experience

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Login to Cloudflare:
   ```bash
   pnpm wrangler login
   ```

3. Check types (optional):
   ```bash
   pnpm type-check
   ```

4. Run locally:
   ```bash
   pnpm dev
   ```

5. Open http://localhost:8787

## Deployment

Keep the existing Cloudflare Worker name in the ignored project-root file
`.worker-deploy.local.json`, or provide `CF_WORKER_NAME` in the deployment
environment. The file has one field:

```json
{"workerName": "your-existing-worker-name"}
```

Use the exact deployed name. Changing it creates a different Worker and does
not migrate the existing Durable Object storage. Back up the private file;
the repository intentionally has no default deployment name.

```bash
pnpm test:deploy
pnpm run deploy --dry-run
pnpm run deploy
```

`npm run deploy -- --dry-run` and `npm run deploy` work as well. The wrapper
passes the private name explicitly to the installed Wrangler version and
refuses missing, invalid or conflicting names before starting Wrangler.
Only `--dry-run` and `--outdir <directory>` are accepted; overrides for the
name, environment or configuration file are rejected. Use this deploy command
instead of invoking Wrangler directly. Deployment still requires Cloudflare
authentication and the real static assets in `public/`.
