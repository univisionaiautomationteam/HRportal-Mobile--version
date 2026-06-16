from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from backend.config import settings
from .teams_bot import TeamsInterviewBot, UpstreamApiError
from .teams_models import (
    TeamsBotConfigResponse,
    TeamsMeetingStartPayload,
    TeamsMessagePayload,
)


app = FastAPI(title="AI HR Interview Teams Bot Gateway")
bot = TeamsInterviewBot(settings.session_api_base)


class MeetingStartRequest(BaseModel):
    session_id: str
    meeting_id: str | None = None
    meeting_join_url: str | None = None


class MeetingAnswerRequest(BaseModel):
    answer_text: str
    question_id: str | None = None
    time_taken_seconds: float | None = None


def _raise_as_http_exception(exc: UpstreamApiError) -> None:
    detail = exc.detail
    if isinstance(detail, dict) and "detail" in detail:
        detail = detail["detail"]
    raise HTTPException(status_code=exc.status_code, detail=detail)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "session_api_base": settings.session_api_base,
        "bot_public_base_url": settings.bot_public_base_url,
    }


@app.get("/config", response_model=TeamsBotConfigResponse)
async def get_bot_config():
    return TeamsBotConfigResponse(
        microsoft_app_id_configured=bool(settings.microsoft_app_id),
        microsoft_app_password_configured=bool(settings.microsoft_app_password),
        microsoft_app_tenant_id_configured=bool(settings.microsoft_app_tenant_id),
        bot_public_base_url=settings.bot_public_base_url,
        endpoints={
            "health": f"{settings.bot_public_base_url}/health",
            "messages": f"{settings.bot_public_base_url}/api/messages",
            "meeting_start": f"{settings.bot_public_base_url}/api/teams/events/meeting-start",
            "message_event": f"{settings.bot_public_base_url}/api/teams/events/message",
        },
    )


@app.get("/api/v1/sessions-ready")
async def get_ready_sessions(within_minutes: int = 15):
    try:
        return bot.list_ready_sessions(within_minutes=within_minutes)
    except UpstreamApiError as exc:
        _raise_as_http_exception(exc)


@app.post("/api/v1/meetings/start")
async def start_meeting(payload: MeetingStartRequest):
    try:
        next_question = bot.start_meeting_flow(
            payload.session_id,
            meeting_id=payload.meeting_id,
            meeting_join_url=payload.meeting_join_url,
        )
        return {
            "message": "Bot join flow initialized",
            "session_id": payload.session_id,
            "next_question": next_question,
        }
    except UpstreamApiError as exc:
        _raise_as_http_exception(exc)


@app.post("/api/teams/events/meeting-start")
async def start_meeting_from_teams(payload: TeamsMeetingStartPayload):
    try:
        next_question = bot.start_meeting_flow(
            payload.session_id,
            meeting_id=payload.meeting_id,
            meeting_join_url=payload.meeting_join_url,
        )
        return {
            "message": "Teams meeting event processed",
            "session_id": payload.session_id,
            "conversation_id": payload.conversation_id,
            "organizer_email": payload.organizer_email,
            "next_question": next_question,
        }
    except UpstreamApiError as exc:
        _raise_as_http_exception(exc)


@app.get("/api/v1/meetings/{session_id}/next-question")
async def get_next_question(session_id: str):
    try:
        return bot.get_next_question(session_id)
    except UpstreamApiError as exc:
        _raise_as_http_exception(exc)


@app.post("/api/v1/meetings/{session_id}/answers/text")
async def submit_answer(session_id: str, payload: MeetingAnswerRequest):
    try:
        session = bot.submit_text_answer(
            session_id,
            payload.answer_text,
            question_id=payload.question_id,
            time_taken_seconds=payload.time_taken_seconds,
        )
        next_question = bot.get_next_question(session_id)
        return {
            "session": session,
            "next_question": next_question,
        }
    except UpstreamApiError as exc:
        _raise_as_http_exception(exc)


@app.post("/api/teams/events/message")
async def submit_teams_message(payload: TeamsMessagePayload):
    try:
        session = bot.submit_text_answer(
            payload.session_id,
            payload.text,
            question_id=payload.question_id,
            time_taken_seconds=payload.time_taken_seconds,
        )
        next_question = bot.get_next_question(payload.session_id)
        return {
            "message": "Teams message processed",
            "session": session,
            "next_question": next_question,
            "user_id": payload.user_id,
            "user_name": payload.user_name,
            "conversation_id": payload.conversation_id,
        }
    except UpstreamApiError as exc:
        _raise_as_http_exception(exc)


@app.post("/api/messages")
async def microsoft_bot_messages(payload: dict):
    """
    Placeholder Bot Framework webhook.

    Real Teams/Bot Framework validation and activity parsing are not wired yet.
    This endpoint exists so the Azure bot registration can target a stable URL
    while we finish the adapter and meeting-media integration.
    """
    activity_type = payload.get("type", "unknown")
    conversation = payload.get("conversation") or {}
    from_user = payload.get("from") or {}

    return {
        "accepted": True,
        "message": "Bot Framework webhook placeholder received activity",
        "activity_type": activity_type,
        "conversation_id": conversation.get("id"),
        "from_id": from_user.get("id"),
        "from_name": from_user.get("name"),
        "note": "Adapter validation and real Teams activity handling are not implemented yet.",
    }


@app.post("/api/v1/meetings/{session_id}/complete")
async def complete_meeting(session_id: str):
    try:
        return bot.complete_session(session_id)
    except UpstreamApiError as exc:
        _raise_as_http_exception(exc)
