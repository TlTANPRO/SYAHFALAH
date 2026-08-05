#!/usr/bin/env python3
"""Syahfalah Dashboard — Old Token → Brand Token refactor (v2)"""
import os, re, sys, argparse
from pathlib import Path

BASE = Path(r"C:/Users/Syahfalah/SYAHFALAH")
SRC = BASE / "src"

# Negative lookahead `(?![-\w])` skips text-primary-foreground, bg-muted-2, etc.
# Negative lookbehind `(?<![-\w])` skips embedded matches.
# We also skip replacements when the class is followed by "/\d+" (opacity
# modifier) because Tailwind v4 supports it natively only if the base class
# is defined; we replace both halves consistently below.

OPACITY = r'(?:/\d+)?'  # optional opacity modifier

MAP = [
    # (regex, simple replacement, also-replace-with-opacity)
    (r'(?<![-\w])text-muted-foreground(?![-\w])',  'text-[var(--color-text-secondary)]'),
    (r'(?<![-\w])bg-muted(?![-\w])',               'bg-[var(--color-surface-2)]'),
    (r'(?<![-\w])border-border(?![-\w])',          'border-[var(--color-border-default)]'),
    (r'(?<![-\w])bg-primary(?![-\w])',             'bg-[var(--color-brand-500)]'),
    (r'(?<![-\w])bg-destructive(?![-\w])',         'bg-[var(--color-danger)]'),
    (r'(?<![-\w])text-destructive(?![-\w])',       'text-[var(--color-danger)]'),
    (r'(?<![-\w])text-success(?![-\w])',           'text-[var(--color-success)]'),
    (r'(?<![-\w])bg-success(?![-\w])',             'bg-[var(--color-success)]'),
    (r'(?<![-\w])text-warning(?![-\w])',           'text-[var(--color-warning)]'),
    (r'(?<![-\w])bg-warning(?![-\w])',             'bg-[var(--color-warning)]'),
    (r'(?<![-\w])text-info(?![-\w])',              'text-[var(--color-info)]'),
    (r'(?<![-\w])bg-info(?![-\w])',                'bg-[var(--color-info)]'),
    (r'(?<![-\w])text-foreground(?![-\w])',        'text-[var(--color-text-primary)]'),
    (r'(?<![-\w])bg-background(?![-\w])',          'bg-[var(--color-surface-0)]'),
    (r'(?<![-\w])bg-card(?![-\w])',                'bg-[var(--color-surface-1)]'),
    (r'(?<![-\w])bg-popover(?![-\w])',             'bg-[var(--color-surface-3)]'),
    (r'(?<![-\w])bg-secondary(?![-\w])',           'bg-[var(--color-surface-2)]'),
    (r'(?<![-\w])border-success(?![-\w])',         'border-[var(--color-success)]'),
    (r'(?<![-\w])border-warning(?![-\w])',         'border-[var(--color-warning)]'),
    (r'(?<![-\w])border-destructive(?![-\w])',     'border-[var(--color-danger)]'),
    (r'(?<![-\w])border-info(?![-\w])',            'border-[var(--color-info)]'),
    (r'(?<![-\w])ease-out-expo(?![-\w])',          'ease-[var(--ease-out-expo)]'),
    (r'(?<![-\w])letter-spacing-wide(?![-\w])',    'tracking-wide'),
]  # noqa: E501

# CAREFUL: text-primary & bg-primary-foreground must NOT be touched:
# text-primary-foreground is a distinct token (white on primary bg),
# different from text-primary (brand color).
# Our `(?![-\w])` lookahead above already handles this — if text is followed
# by `-foreground`, it won't match \btext-primary\b. Verified by regex test.

def collect_files(target=None):
    files = []
    for root, dirs, fs in os.walk(SRC):
        if any(x in root for x in ['node_modules','.next']): dirs[:] = []
        for f in fs:
            if not f.endswith(('.tsx','.ts')): continue
            if f.endswith('.test.ts'): continue
            if 'globals.css' in (root+f): continue
            p = Path(root) / f
            if target and str(p.resolve()) != str(Path(target).resolve()): continue
            files.append(p)
    return files

def transform(content):
    n = 0
    for pat, repl in MAP:
        content, k = re.subn(pat, repl, content)
        n += k
    return content, n

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--file', default=None)
    args = ap.parse_args()

    files = collect_files(args.file)
    if not files:
        print(f"No files matched: {args.file or 'src/**/*.{tsx,ts}'}")
        sys.exit(0)

    total_changes = 0
    files_changed = 0
    per_file = []
    by_class = {}

    for p in files:
        try: c = p.read_text(encoding='utf-8')
        except: continue
        orig = c
        new, n = transform(c)
        if n == 0: continue

        for pat, _ in MAP:
            cnt = len(re.findall(pat, orig))
            if cnt:
                cls = pat.replace('(?<![-\\w])','').replace('(?![-\\w])','')\
                        .replace('\\b','').replace('\\','')
                by_class[cls] = by_class.get(cls, 0) + cnt

        if args.apply and new != orig:
            p.write_text(new, encoding='utf-8')
            files_changed += 1
            total_changes += n
        elif new != orig:
            files_changed += 1
            total_changes += n
        per_file.append((str(p.relative_to(BASE)), n))

    mode = "APPLIED" if args.apply else "DRY RUN"
    print(f"=== {mode} ===")
    print(f"  files scanned: {len(files)}")
    print(f"  files with hits: {files_changed}")
    print(f"  total substitutions: {total_changes}")
    print(f"\n  per class:")
    for cls, n in sorted(by_class.items(), key=lambda x: -x[1]):
        print(f"    {cls:25s} {n}")
    print(f"\n  per file:")
    for f, n in sorted(per_file, key=lambda x: -x[1]):
        print(f"    {n:3d}  {f}")

if __name__ == '__main__':
    main()
