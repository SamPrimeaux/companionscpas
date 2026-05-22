#!/usr/bin/env python3
"""
PRIMETECH — Quick filetree inspector
Run from companionscpas-platform repo root:
    python3 filetree.py
"""
import os, subprocess

ROOT = os.path.expanduser("~/companionscpas-platform")
SKIP = {".git", "node_modules", ".wrangler", "dist", "__pycache__"}

def tree(path, prefix="", depth=0, max_depth=4):
    if depth > max_depth:
        return
    try:
        entries = sorted(os.scandir(path), key=lambda e: (e.is_file(), e.name))
    except PermissionError:
        return
    entries = [e for e in entries if e.name not in SKIP and not e.name.startswith(".")]
    for i, entry in enumerate(entries):
        connector = "└── " if i == len(entries)-1 else "├── "
        print(f"{prefix}{connector}{entry.name}{'/' if entry.is_dir() else ''}")
        if entry.is_dir():
            extension = "    " if i == len(entries)-1 else "│   "
            tree(entry.path, prefix + extension, depth+1, max_depth)

print(f"\n{'='*50}")
print(f"  {ROOT}")
print(f"{'='*50}")
tree(ROOT)

# Key files
key_files = ["worker.js", "src/index.js", "wrangler.toml",
             "wrangler.production.toml", "wrangler.jsonc",
             "package.json", "public/index.html"]
print(f"\n{'='*50}")
print("  Key file check:")
print(f"{'='*50}")
for f in key_files:
    full = os.path.join(ROOT, f)
    if os.path.exists(full):
        lines = sum(1 for _ in open(full, errors="ignore"))
        print(f"  FOUND  {f}  ({lines} lines)")
    else:
        print(f"  -      {f}")

# Peek at worker entry point
print(f"\n{'='*50}")
print("  Worker entry — first 20 lines:")
print(f"{'='*50}")
for candidate in ["worker.js","src/index.js","src/worker.js"]:
    full = os.path.join(ROOT, candidate)
    if os.path.exists(full):
        print(f"  [{candidate}]")
        with open(full, errors="ignore") as f:
            for i, line in enumerate(f):
                if i >= 20: break
                print(f"  {i+1:>3}  {line}", end="")
        break
