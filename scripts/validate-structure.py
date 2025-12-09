import os
from pathlib import Path

REQUIRED = [
    "services/auth-service",
    "services/api-gateway",
    "services/assessment-service",
    "frontend",
    "shared/enums",
    "shared/utils",
    "infrastructure",
    ".github/workflows",
]

def main():
    missing = []
    root = Path(__file__).resolve().parents[1]

    for path in REQUIRED:
        if not (root / path).exists():
            missing.append(path)

    print("\n=== Folder Structure Validation ===")
    if missing:
        print("Missing folders:")
        for m in missing:
            print("  -", m)
    else:
        print("All required folders present.")

if __name__ == "__main__":
    main()
