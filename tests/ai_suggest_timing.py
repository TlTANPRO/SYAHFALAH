#!/usr/bin/env python3
"""Test /api/ai/suggest-field timing on live vercel.

Flow:
  1. POST /api/auth/pin with PIN 1607 (Pak Ardian), capture cookies
  2. POST 5 payloads to /api/ai/suggest-field, measure timing per call
  3. Print timing table
"""

import json
import time
import sys
import urllib.request
import urllib.error
import http.cookiejar

BASE = "https://syahfalah-dashboard.vercel.app"
PIN = "1607"

PAYLOADS = [
    {"label": "tasks/title/Kirim",        "body": {"entity": "tasks",     "field": "title",         "partial": "Kirim"}},
    {"label": "leads/customer_name/Pak",  "body": {"entity": "leads",     "field": "customer_name", "partial": "Pak"}},
    {"label": "projects/name/<empty>",    "body": {"entity": "projects",  "field": "name",          "partial": ""}},
    {"label": "comments/content/Mohon",   "body": {"entity": "comments",  "field": "content",       "partial": "Mohon info"}},
    {"label": "documents/title/Kontrak",  "body": {"entity": "documents", "field": "title",         "partial": "Kontrak"}},
]


class TimedResponse:
    """urllib response wrapper that exposes wall-clock duration in ms."""

    def __init__(self, response: http.client.HTTPResponse, duration_ms: float):
        self.response = response
        self.duration_ms = duration_ms
        self.status = response.status
        self.body = response.read()


def post(url: str, payload: dict, cookies: http.cookiejar.CookieJar, timeout: float = 60):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "ai-timing-test/1.0",
        },
        method="POST",
    )
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))
    t0 = time.perf_counter()
    try:
        resp = opener.open(req, timeout=timeout)
        duration_ms = (time.perf_counter() - t0) * 1000
        return TimedResponse(resp, duration_ms)
    except urllib.error.HTTPError as e:
        duration_ms = (time.perf_counter() - t0) * 1000
        # Build a fake response-like object so caller can read body uniformly
        class R:
            def __init__(self, err):
                self.status = err.code
                self.body = err.read()
                self.duration_ms = duration_ms
                self.response = err
        return R(e)
    except Exception as e:
        duration_ms = (time.perf_counter() - t0) * 1000
        class R:
            def __init__(self, err):
                self.status = 0
                self.body = b""
                self.duration_ms = duration_ms
                self.error = repr(err)
                self.response = None
        return R(e)


def login():
    jar = http.cookiejar.CookieJar()
    print(f"[login] POST {BASE}/api/auth/pin ...", flush=True)
    resp = post(f"{BASE}/api/auth/pin", {"pin": PIN}, jar, timeout=30)
    body_text = resp.body.decode("utf-8", errors="replace") if resp.body else ""
    print(f"[login] status={resp.status} time={resp.duration_ms:.0f}ms body={body_text[:200]}")
    if resp.status != 200:
        print("[login] FAILED — cannot proceed", file=sys.stderr)
        sys.exit(1)
    parsed = json.loads(body_text)
    if not parsed.get("success"):
        print(f"[login] success=false — {parsed}", file=sys.stderr)
        sys.exit(1)
    print(f"[login] OK — user={parsed.get('user', {}).get('full_name') or parsed.get('user', {}).get('email')}")
    return jar


def truncate(s, n):
    s = s.replace("\n", " ")
    return s if len(s) <= n else s[:n - 1] + "…"


def main():
    jar = login()
    results = []
    print()
    for item in PAYLOADS:
        url = f"{BASE}/api/ai/suggest-field"
        print(f"[test] {item['label']} POST {url} ...", flush=True)
        resp = post(url, item["body"], jar, timeout=35)  # < Vercel 30s but give a bit slack
        elapsed_s = resp.duration_ms / 1000
        body_text = resp.body.decode("utf-8", errors="replace") if resp.body else ""
        # Parse JSON if possible
        try:
            parsed = json.loads(body_text) if body_text else {}
        except json.JSONDecodeError:
            parsed = {}
        suggestions = parsed.get("suggestions") if isinstance(parsed, dict) else None
        source = parsed.get("source") if isinstance(parsed, dict) else None
        three_strings = (
            isinstance(suggestions, list)
            and len(suggestions) == 3
            and all(isinstance(x, str) for x in suggestions)
        )
        not_all_empty = bool(suggestions) and any(s.strip() for s in suggestions)
        results.append({
            "label": item["label"],
            "status": resp.status,
            "ms": resp.duration_ms,
            "three_strings": three_strings,
            "not_all_empty": not_all_empty,
            "source": source,
            "suggestions": suggestions,
            "error": parsed.get("error") if isinstance(parsed, dict) else None,
            "raw_preview": truncate(body_text, 200),
        })
        print(
            f"   status={resp.status} time={elapsed_s:.2f}s "
            f"three_str={three_strings} not_all_empty={not_all_empty} "
            f"source={source} suggestions={suggestions}"
        )

    # Timing table
    print()
    print("=" * 96)
    print(f"{'#':<3} {'endpoint':<32} {'status':<7} {'time':>10}  {'src':<8} {'3str':<5} {'nonempty':<8}")
    print("-" * 96)
    total_ms = 0.0
    for i, r in enumerate(results, 1):
        sec = r["ms"] / 1000
        total_ms += r["ms"]
        print(
            f"{i:<3} {r['label']:<32} {r['status']:<7} {sec:>8.2f}s  "
            f"{str(r['source'])[:8]:<8} {str(r['three_strings']):<5} {str(r['not_all_empty']):<8}"
        )
    print("-" * 96)
    print(f"    {'TOTAL':<32} {'':7} {total_ms/1000:>8.2f}s")
    print(f"    {'AVG':<32} {'':7} {total_ms/len(results)/1000:>8.2f}s")
    print("=" * 96)
    # Verdict
    ok = all(r["status"] == 200 and r["three_strings"] and r["not_all_empty"] for r in results)
    within_25s = all(r["ms"] <= 25000 for r in results)
    print(f"\nVERDICT: all_ok={ok} all_under_25s={within_25s}")
    if not ok:
        for r in results:
            if not (r["status"] == 200 and r["three_strings"] and r["not_all_empty"]):
                print(f"  FAIL: {r['label']} -> status={r['status']} error={r['error']} preview={r['raw_preview']}")
    sys.exit(0 if ok and within_25s else 1)


if __name__ == "__main__":
    main()
