from __future__ import annotations

import os
from typing import Any


def analyze_document(
    *,
    raw_text: str,
    page_count: int,
    layout_blocks: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "model": os.getenv("CV_VL_MODEL", "qwen3-vl:4b"),
        "prompt_version": "v2",
        "page_count": page_count,
        "signals": {
            "has_avatar_candidate": any(block.get("type") == "image" for block in layout_blocks),
            "layout_block_count": len(layout_blocks),
            "raw_text_length": len(raw_text or ""),
        },
        "summary": "Fallback VL response generated without external multimodal runtime.",
    }
