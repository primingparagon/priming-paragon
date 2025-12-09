#!/usr/bin/env python3
"""
rebuild-dockerfiles.py

Safe helper to validate and (optionally) create/standardize Dockerfiles for services.

Usage:
  python3 rebuild-dockerfiles.py        # dry-run, report only
  python3 rebuild-dockerfiles.py --apply  # actually write Dockerfiles (will back up existing)

This script:
 - Detects service directories under ./services
 - Determines language (Node if package.json; Python if pyproject.toml or requirements.txt)
 - Validates existing Dockerfile health (basic checks)
 - Suggests a canonical Dockerfile per service
 - When --apply is used, backs up existing Dockerfile to ./_dockerfile_backups/<service>/Dockerfile.bak and writes new Dockerfile

WARNING: use --apply only after reviewing the dry-run output.
"""
import argparse, json, os, shutil
from pathlib import Path

ROOT = Path.cwd()
SERVICES_DIR = ROOT / "services"
BACKUP_DIR = ROOT / "_dockerfile_backups"
NODE_TEMPLATE = """# Node.js multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build || true

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
"""
PYTHON_TEMPLATE = """# Python multi-stage (slim)
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y build-essential libpq-dev --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Create venv and install requirements
FROM base AS builder
COPY pyproject.toml poetry.lock* requirements.txt* /app/
RUN pip install --upgrade pip setuptools wheel
# prefer requirements.txt if present
RUN if [ -f "requirements.txt" ]; then pip install -r requirements.txt; fi

COPY . /app
# If your app needs a build step, add it here (example: compile assets)

FROM base
COPY --from=builder /usr/local /usr/local
COPY . /app
EXPOSE 8000
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000"]
"""

def detect_services():
    services = []
    if not SERVICES_DIR.exists():
        return services
    for p in sorted(SERVICES_DIR.iterdir()):
        if p.is_dir():
            services.append(p)
    return services

def service_type(svc_path: Path):
    if (svc_path / "package.json").exists():
        return "node"
    if (svc_path / "pyproject.toml").exists() or (svc_path / "requirements.txt").exists():
        return "python"
    return "unknown"

def check_dockerfile(path: Path):
    f = path / "Dockerfile"
    if not f.exists():
        return {"exists": False}
    size = f.stat().st_size
    text = f.read_text(errors="ignore")
    # basic sanity checks
    ok = True
    reasons = []
    if "FROM" not in text:
        ok = False
        reasons.append("no FROM line")
    if "COPY" not in text:
        reasons.append("no COPY")
    return {"exists": True, "size": size, "ok": ok, "reasons": reasons}

def canonical_template(kind):
    return NODE_TEMPLATE if kind == "node" else PYTHON_TEMPLATE if kind == "python" else None

def ensure_backup(path: Path):
    target_dir = BACKUP_DIR / path.name
    target_dir.mkdir(parents=True, exist_ok=True)
    dst = target_dir / "Dockerfile.bak"
    if path.exists():
        shutil.copy2(path, dst)
    return dst

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="write files (dry-run by default)")
    args = parser.parse_args()
    services = detect_services()
    report = {}
    print(f"Found {len(services)} services.")
    for svc in services:
        kind = service_type(svc)
        df_report = check_dockerfile(svc)
        report[str(svc)] = {"type": kind, "dockerfile": df_report}
        print(f"\nService: {svc.name}  type={kind}")
        if df_report["exists"]:
            print(f"  Dockerfile exists (size={df_report['size']})")
            if not df_report["ok"]:
                print("  Problems:", df_report.get("reasons", []))
            else:
                print("  Dockerfile passes basic checks.")
        else:
            print("  No Dockerfile found.")
        tmpl = canonical_template(kind)
        if tmpl:
            # show canonical snippet
            print("  --- canonical Dockerfile preview ---")
            print("\n".join(tmpl.splitlines()[:10]))
            print("  ...")
            if args.apply:
                df_path = svc / "Dockerfile"
                # backup
                ensure_backup(df_path)
                df_path.write_text(tmpl)
                print(f"  Wrote canonical Dockerfile to {df_path} (backup in {_rel(BACKUP_DIR)})")
        else:
            print("  Unknown service type; skipping template generation.")
    # write simple report
    (ROOT / "reports").mkdir(exist_ok=True)
    report_path = ROOT / "reports" / "dockerfile-report.json"
    report_path.write_text(json.dumps(report, indent=2))
    print("\nReport written to", report_path)
    print("Dry-run mode (no changes) unless you ran with --apply.")

def _rel(p: Path):
    try:
        return str(p.relative_to(ROOT))
    except Exception:
        return str(p)

if __name__ == "__main__":
    main()

