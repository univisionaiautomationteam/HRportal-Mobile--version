from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from ..config import settings


class JsonStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write({"sessions": {}})

    def _read(self) -> dict[str, Any]:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def _write(self, payload: dict[str, Any]) -> None:
        self.path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=True),
            encoding="utf-8",
        )

    def save_session(self, session: dict[str, Any]) -> None:
        payload = self._read()
        payload["sessions"][session["session_id"]] = session
        self._write(payload)

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        payload = self._read()
        return payload["sessions"].get(session_id)

    def list_sessions(self) -> list[dict[str, Any]]:
        payload = self._read()
        return list(payload["sessions"].values())

    def update_session(self, session_id: str, updater) -> dict[str, Any] | None:
        payload = self._read()
        session = payload["sessions"].get(session_id)
        if not session:
            return None

        updated = updater(session)
        updated["updated_at"] = datetime.utcnow().isoformat()
        payload["sessions"][session_id] = updated
        self._write(payload)
        return updated


store = JsonStore(settings.store_path)
