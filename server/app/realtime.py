"""A tiny in-process hub so the voice path can push UI updates to the browser.

The browser keeps a WebSocket open at /ws/agent. When a *voice* turn (handled by
the ElevenLabs custom-LLM endpoint) produces map actions or an approval, we push
them over that same socket — so the 3D map moves and approval cards appear while
the associate is speaking, reusing the exact channel the text path already uses.
"""

from __future__ import annotations

import json

from starlette.websockets import WebSocket


class Hub:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()

    def join(self, ws: WebSocket) -> None:
        self._clients.add(ws)

    def leave(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def broadcast(self, message: dict) -> None:
        payload = json.dumps(message)
        for ws in list(self._clients):
            try:
                await ws.send_text(payload)
            except Exception:
                self._clients.discard(ws)


hub = Hub()
