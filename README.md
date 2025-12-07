# Priming Paragon — Monorepo (Scaffold)

Contact: primingparagons@gmail.com  
Dev domain: rosybrown-crow-726051.hostingersite.com  
Prod domain: theprimingparagon.org

## Quickstart (local dev)

1. Copy `.env.example` -> `.env` and fill secrets.
2. Build & run locally:
   ```bash
   docker compose up --build

Local dev (Codespaces recommended)

# prerequisites
- pnpm installed: npm i -g pnpm
- Docker installed (for docker-compose)
- Python 3.11 for Python services (optional if using Docker)

# local steps
1. From repo root:
   pnpm install

2. Start services locally using docker-compose:
   docker compose -f docker-compose.dev.yml up --build

3. Or run a single service:
   cd services/api-gateway
   npm install
   npm run dev

4. Create .env files from .env.example in each service
   cp services/auth-service/.env.example services/auth-service/.env
   # edit values locally

5. To deploy: push to main branch (GH Actions will sync envs & trigger Render deploys)
