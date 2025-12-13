#!/usr/bin/env python3
"""
Safe monorepo printer for Priming Paragon
Prerequisites: Run from the repo root
Purpose: Full directory listing, highlights unusual directories
"""

import os

# Root of the repo
ROOT = os.path.abspath(".")

# Max depth for printing
MAX_DEPTH = 100

def walk(dir_path, prefix="", depth=0):
    if depth > MAX_DEPTH:
        return
    try:
        entries = sorted(os.listdir(dir_path))
    except PermissionError:
        print(f"{prefix}[PERMISSION DENIED] {dir_path}")
        return
    except FileNotFoundError:
        print(f"{prefix}[NOT FOUND] {dir_path}")
        return

    for entry in entries:
        path = os.path.join(dir_path, entry)
        if os.path.isdir(path):
            # Flag suspicious 'package.json' directories
            if entry == "package.json":
                print(f"{prefix}[SUSPICIOUS DIR] {path}")
            else:
                print(f"{prefix}{entry}/")
            walk(path, prefix + "    ", depth + 1)
        else:
            print(f"{prefix}{entry}")

if __name__ == "__main__":
    print(f"Monorepo root: {ROOT}")
    walk(ROOT)
