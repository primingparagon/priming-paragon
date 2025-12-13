#!/usr/bin/env python3
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # repo root
MAX_DEPTH = 100

def walk(dir_path, depth=0):
    prefix = "  " * depth
    try:
        for entry in os.listdir(dir_path):
            path = os.path.join(dir_path, entry)
            if os.path.isdir(path):
                print(f"{prefix}{entry}/")
                walk(path, depth + 1)
            else:
                print(f"{prefix}{entry}")
    except PermissionError:
        print(f"{prefix}[PERMISSION DENIED] {dir_path}")
    except FileNotFoundError:
        print(f"{prefix}[NOT FOUND] {dir_path}")

if __name__ == "__main__":
    print(f"Monorepo root: {ROOT}")
    walk(ROOT)
