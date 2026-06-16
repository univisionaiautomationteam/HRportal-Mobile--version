"""
Local Teams-bot orchestration harness.

This is not a real Microsoft Teams media bot yet. It is a thin control-plane
client that talks to the AI interview service so we can test the join flow,
question progression, and answer lifecycle before wiring Bot Framework.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib import error, parse, request

from backend.config import settings


@dataclass
class ApiResponse:
    status_code: int
    payload: Any


class UpstreamApiError(Exception):
    def __init__(self, status_code: int, detail: Any):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"{status_code} {detail}")


class TeamsInterviewBot:
    def __init__(self, session_api_base: str):
        self.session_api_base = session_api_base.rstrip("/")

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
    ) -> ApiResponse:
        url = f"{self.session_api_base}{path}"
        if query:
            url = f"{url}?{parse.urlencode(query)}"

        data = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = request.Request(url, data=data, headers=headers, method=method.upper())
        try:
            with request.urlopen(req) as response:
                raw = response.read().decode("utf-8")
                return ApiResponse(
                    status_code=response.status,
                    payload=json.loads(raw) if raw else None,
                )
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8")
            detail = json.loads(body) if body else {"detail": exc.reason}
            raise UpstreamApiError(exc.code, detail) from exc
        except error.URLError as exc:
            raise UpstreamApiError(
                502,
                {"detail": f"AI interview service unreachable: {exc.reason}"},
            ) from exc

    def list_ready_sessions(self, within_minutes: int = 15) -> list[dict[str, Any]]:
        response = self._request(
            "GET",
            "/api/v1/sessions-ready",
            query={"within_minutes": within_minutes},
        )
        return response.payload or []

    def prepare_join(
        self,
        session_id: str,
        meeting_id: str | None = None,
        meeting_join_url: str | None = None,
    ) -> dict[str, Any]:
        payload = {}
        if meeting_id:
            payload["meeting_id"] = meeting_id
        if meeting_join_url:
            payload["meeting_join_url"] = meeting_join_url
        return self._request(
            "POST",
            f"/api/v1/sessions/{session_id}/prepare-join",
            payload=payload,
        ).payload

    def update_bot_status(
        self,
        session_id: str,
        status: str,
        reason: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"status": status}
        if reason:
            payload["reason"] = reason
        return self._request(
            "POST",
            f"/api/v1/sessions/{session_id}/bot-status",
            payload=payload,
        ).payload

    def join_session(self, session_id: str) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/api/v1/sessions/{session_id}/join",
            payload={"joined_at": datetime.now(timezone.utc).isoformat()},
        ).payload

    def get_next_question(self, session_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/v1/sessions/{session_id}/next-question").payload

    def submit_text_answer(
        self,
        session_id: str,
        answer_text: str,
        question_id: str | None = None,
        time_taken_seconds: float | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"answer_text": answer_text}
        if question_id:
            payload["question_id"] = question_id
        if time_taken_seconds is not None:
            payload["time_taken_seconds"] = time_taken_seconds
        return self._request(
            "POST",
            f"/api/v1/sessions/{session_id}/answers/text",
            payload=payload,
        ).payload

    def complete_session(self, session_id: str) -> dict[str, Any]:
        return self._request("POST", f"/api/v1/sessions/{session_id}/complete", payload={}).payload

    def start_session(self, session_id: str) -> dict[str, Any]:
        self.prepare_join(session_id)
        self.update_bot_status(session_id, "joining")
        self.join_session(session_id)
        return self.get_next_question(session_id)

    def watch_and_prepare(self, within_minutes: int = 15) -> list[dict[str, Any]]:
        prepared: list[dict[str, Any]] = []
        for session in self.list_ready_sessions(within_minutes=within_minutes):
            if session["status"] == "scheduled":
                prepared.append(self.prepare_join(session["session_id"]))
        return prepared

    def start_meeting_flow(
        self,
        session_id: str,
        meeting_id: str | None = None,
        meeting_join_url: str | None = None,
    ) -> dict[str, Any]:
        self.prepare_join(
            session_id,
            meeting_id=meeting_id,
            meeting_join_url=meeting_join_url,
        )
        self.update_bot_status(session_id, "joining")
        self.join_session(session_id)
        return self.get_next_question(session_id)


def _print_json(payload: Any) -> None:
    print(json.dumps(payload, indent=2, ensure_ascii=True, default=str))


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Local Teams interview bot harness")
    parser.add_argument(
        "--api-base",
        default=settings.session_api_base,
        help="AI interview service base URL",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    ready_parser = subparsers.add_parser("ready", help="List sessions ready to join")
    ready_parser.add_argument("--within-minutes", type=int, default=15)

    watch_parser = subparsers.add_parser("watch", help="Poll and prepare upcoming sessions")
    watch_parser.add_argument("--within-minutes", type=int, default=15)
    watch_parser.add_argument(
        "--interval",
        type=int,
        default=settings.bot_poll_interval_seconds,
        help="Polling interval in seconds",
    )
    watch_parser.add_argument(
        "--once",
        action="store_true",
        help="Run one poll iteration and exit",
    )

    start_parser = subparsers.add_parser("start", help="Prepare and join a session")
    start_parser.add_argument("session_id")

    next_parser = subparsers.add_parser("next", help="Fetch next question for a session")
    next_parser.add_argument("session_id")

    answer_parser = subparsers.add_parser("answer", help="Submit a text answer")
    answer_parser.add_argument("session_id")
    answer_parser.add_argument("--text", required=True)
    answer_parser.add_argument("--question-id")
    answer_parser.add_argument("--time-taken-seconds", type=float)

    complete_parser = subparsers.add_parser("complete", help="Complete a session")
    complete_parser.add_argument("session_id")

    status_parser = subparsers.add_parser("status", help="Update bot status")
    status_parser.add_argument("session_id")
    status_parser.add_argument("value", choices=["joining", "active", "failed"])
    status_parser.add_argument("--reason")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    bot = TeamsInterviewBot(args.api_base)

    try:
        if args.command == "ready":
            _print_json(bot.list_ready_sessions(within_minutes=args.within_minutes))
            return 0

        if args.command == "watch":
            if args.once:
                _print_json(bot.watch_and_prepare(within_minutes=args.within_minutes))
                return 0

            print(
                f"Watching {bot.session_api_base} every {args.interval}s "
                f"for sessions within {args.within_minutes} minutes. Press Ctrl+C to stop."
            )
            while True:
                prepared = bot.watch_and_prepare(within_minutes=args.within_minutes)
                if prepared:
                    print(f"[{datetime.now().isoformat(timespec='seconds')}] prepared {len(prepared)} session(s)")
                    _print_json(prepared)
                time.sleep(args.interval)

        if args.command == "start":
            _print_json(bot.start_session(args.session_id))
            return 0

        if args.command == "next":
            _print_json(bot.get_next_question(args.session_id))
            return 0

        if args.command == "answer":
            _print_json(
                bot.submit_text_answer(
                    args.session_id,
                    args.text,
                    question_id=args.question_id,
                    time_taken_seconds=args.time_taken_seconds,
                )
            )
            return 0

        if args.command == "complete":
            _print_json(bot.complete_session(args.session_id))
            return 0

        if args.command == "status":
            _print_json(bot.update_bot_status(args.session_id, args.value, reason=args.reason))
            return 0
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0
    except Exception as exc:  # noqa: BLE001 - CLI surface should print actionable failure
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
