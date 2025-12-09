#!/usr/bin/env python3
"""
fix-imports.py -- non destructive scanning tool
Finds likely imports referencing "Shared" and suggests replacements to shared-python or shared-ts.
Dry-run only: prints occurrences and a suggested sed command for automated replacement.
"""
import re
from pathlib import Path

ROOT = Path.cwd()
patterns = [
    # python from Shared.schemas import ...
    (r'from\s+Shared\.(\S+)\s+import', 'python'),
    (r'import\s+Shared\.(\S+)', 'python'),
    # ts import {Foo} from '../../Shared/...' or from 'Shared/...'
    (r"from\s+['\"](.*/)?Shared(/|\.)([^'\"]+)['\"]", 'ts'),
    (r"require\(['\"](.*/)?Shared(/|\.)([^'\"]+)['\"]\)", 'ts')
]

hits=[]
for p in ROOT.rglob('*.*'):
    if p.suffix not in ['.py','.ts','.tsx','.js','.jsx']:
        continue
    try:
        text = p.read_text()
    except Exception:
        continue
    for pat, kind in patterns:
        for m in re.finditer(pat, text):
            hits.append({"file": str(p), "match": m.group(0), "suggested_kind": kind})

print("Found", len(hits), "potential Shared imports (dry-run).")
for h in hits:
    print(h['file'], "->", h['match'], " (suggested:", h['suggested_kind'], ")")
print("""
Suggested automated replacements (example commands):

# For python: replace 'from Shared.' -> 'from shared_python.' (manual review required)
grep -RIl \"from Shared\\.\" | xargs -n1 sed -i 's/from Shared\\./from shared_python\\./g'

# For TS: replace '/Shared/' -> '/shared-ts/' (manual review required)
grep -RIl \"Shared/\" | xargs -n1 sed -n '1,1p'
""")

