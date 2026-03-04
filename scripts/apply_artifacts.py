#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(2)


def main() -> None:
    if len(sys.argv) != 5:
        die("Usage: apply_artifacts.py <repo_dir> <json_path> <allowed_paths_csv> <commit_message>")

    repo_dir = Path(sys.argv[1]).resolve()
    json_path = Path(sys.argv[2]).resolve()
    allowed = [p.strip() for p in sys.argv[3].split(",") if p.strip()]
    commit_msg = sys.argv[4]

    data = json.loads(json_path.read_text(encoding="utf-8"))
    arts = data.get("artifacts")
    if not isinstance(arts, list):
        die("JSON missing artifacts[]")

    allowed_set = set(allowed)

    for art in arts:
        if not isinstance(art, dict):
            die("artifact must be object")
        rel = art.get("path")
        content = art.get("content")
        if not isinstance(rel, str) or not isinstance(content, str):
            die("artifact requires string path+content")

        norm_rel = rel.replace("\\", "/")
        if norm_rel not in allowed_set:
            die(f"artifact path not allowed: {norm_rel} (allowed: {sorted(allowed_set)})")

        out_path = repo_dir / norm_rel
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(content, encoding="utf-8")

    # Write a small metadata file for traceability (no secrets)
    meta = {
        "commit": commit_msg,
        "applied": [a["path"] for a in arts],
        "source_json": str(json_path),
    }
    (repo_dir / ".openclaw" / "last-artifacts.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
