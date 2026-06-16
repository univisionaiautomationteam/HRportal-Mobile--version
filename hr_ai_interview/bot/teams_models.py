from __future__ import annotations

from pydantic import BaseModel, Field


class TeamsMeetingStartPayload(BaseModel):
    session_id: str
    meeting_id: str | None = None
    meeting_join_url: str | None = None
    conversation_id: str | None = None
    organizer_email: str | None = None


class TeamsMessagePayload(BaseModel):
    session_id: str
    text: str
    question_id: str | None = None
    user_id: str | None = None
    user_name: str | None = None
    conversation_id: str | None = None
    time_taken_seconds: float | None = None


class TeamsBotConfigResponse(BaseModel):
    microsoft_app_id_configured: bool
    microsoft_app_password_configured: bool
    microsoft_app_tenant_id_configured: bool
    bot_public_base_url: str
    endpoints: dict[str, str] = Field(default_factory=dict)
