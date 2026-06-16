from fastapi import APIRouter, File, UploadFile

from ..models.schemas import (
    BotStatusRequest,
    JoinSessionRequest,
    PrepareJoinRequest,
    SessionCreateRequest,
    TextAnswerRequest,
)
from ..services.session_manager import (
    complete_session,
    create_session,
    get_session,
    get_next_question,
    join_session,
    list_sessions_ready_to_join,
    prepare_session_join,
    submit_audio_answer,
    submit_text_answer,
    update_bot_status,
)


router = APIRouter(tags=["sessions"])


@router.post("/sessions")
async def create_interview_session(payload: SessionCreateRequest):
    return create_session(payload)


@router.get("/sessions/{session_id}")
async def get_interview_session(session_id: str):
    return get_session(session_id)


@router.get("/sessions-ready")
async def get_sessions_ready_to_join(within_minutes: int = 15):
    return list_sessions_ready_to_join(within_minutes)


@router.post("/sessions/{session_id}/prepare-join")
async def prepare_interview_session_join(session_id: str, payload: PrepareJoinRequest):
    return prepare_session_join(session_id, payload)


@router.post("/sessions/{session_id}/bot-status")
async def update_interview_bot_status(session_id: str, payload: BotStatusRequest):
    return update_bot_status(session_id, payload)


@router.post("/sessions/{session_id}/join")
async def mark_bot_joined(session_id: str, payload: JoinSessionRequest):
    return join_session(session_id, payload)


@router.get("/sessions/{session_id}/next-question")
async def get_interview_next_question(session_id: str):
    return get_next_question(session_id)


@router.post("/sessions/{session_id}/answers/text")
async def submit_interview_answer_text(session_id: str, payload: TextAnswerRequest):
    return submit_text_answer(session_id, payload)


@router.post("/sessions/{session_id}/answers/audio")
async def submit_interview_answer_audio(session_id: str, file: UploadFile = File(...)):
    return await submit_audio_answer(session_id, file)


@router.post("/sessions/{session_id}/complete")
async def complete_interview_session(session_id: str):
    return complete_session(session_id)
