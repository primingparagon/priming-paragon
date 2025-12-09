import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_FILES = list(ROOT.glob("**/package.json"))
PYPROJECT_FILES = list(ROOT.glob("**/pyproject.toml"))

def check_node_updates():
    print("\n=== Checking Node.js Dependencies ===")
    for pkg in PACKAGE_FILES:
        service = pkg.parent
        print(f"\nService: {service}")
        try:
            subprocess.run(["npm", "outdated"], cwd=service, check=False)
        except FileNotFoundError:
            print("npm not available on this system")

def check_python_updates():
    print("\n=== Checking Python Dependencies ===")
    for pyproj in PYPROJECT_FILES:
        service = pyproj.parent
        print(f"\nService: {service}")
        try:
            subprocess.run(["pip", "list", "--outdated"], cwd=service, check=False)
        except FileNotFoundError:
            print("pip not available on this system")

if __name__ == "__main__":
    check_node_updates()
    check_python_updates()
    print("\nSAFE MODE: No updates applied.")

