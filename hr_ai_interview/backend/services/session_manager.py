from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import tempfile
import string
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from ..config import settings
from ..database.store import store
from ..models.schemas import (
    BotStatusRequest,
    JoinSessionRequest,
    NextQuestionResponse,
    PrepareJoinRequest,
    SessionAnswer,
    SessionCreateRequest,
    SessionCreateResponse,
    SessionQueueItem,
    SessionQuestion,
    SessionReport,
    SessionState,
    SessionSummary,
    TextAnswerRequest,
)
from .ai_evaluator import evaluate_answer, summarize_session
from .cheating_detection import detect_cheating
from .question_bank import DEFAULT_QUESTIONS
from .question_generator import generate_questions_from_resume
from .report_emailer import send_report_email
from .speech_to_text import transcribe_audio
from .storage import upload_audio_bytes


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_session(session: SessionState) -> dict:
    return session.model_dump(mode="json")


def _load_session(session_id: str) -> SessionState:
    raw = store.get_session(session_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionState.model_validate(raw)


def _current_question(session: SessionState) -> SessionQuestion | None:
    if session.current_question_index >= len(session.questions):
        return None
    return session.questions[session.current_question_index]


def _next_question(session: SessionState, question_id: str | None) -> SessionQuestion:
    current_question = _current_question(session)
    if not current_question:
        raise HTTPException(status_code=400, detail="No pending questions")

    if question_id:
        if current_question.question_id != question_id:
            raise HTTPException(
                status_code=400,
                detail="Only the current pending question can be answered",
            )
        return current_question

    return current_question


def create_session(payload: SessionCreateRequest) -> SessionCreateResponse:
    # Generate questions: prioritize provided questions, then resume-based, then defaults
    if payload.questions:
        questions = [
            {
                "question": question,
                "question_type": "standard",
                "preferred_answer_mode": "audio",
                "code_language": None,
            }
            for question in payload.questions
        ]
    elif payload.resume_text:
        questions = generate_questions_from_resume(
            resume_text=payload.resume_text,
            job_description=payload.job_description,
            count=settings.default_question_count,
        )
    else:
        questions = [
            {
                "question": question,
                "question_type": "standard",
                "preferred_answer_mode": "audio",
                "code_language": None,
            }
            for question in DEFAULT_QUESTIONS[: settings.default_question_count]
        ]
    
    now = _utcnow()
    session = SessionState(
        session_id=str(uuid4()),
        candidate_name=payload.candidate_name,
        candidate_email=payload.candidate_email,
        interview_type=payload.interview_type,
        scheduled_at=payload.scheduled_at,
        meeting_id=payload.meeting_id,
        meeting_join_url=payload.meeting_join_url,
        hr_email=payload.hr_email,
        interviewers=payload.interviewers,
        questions=[
            SessionQuestion(
                question_id=str(uuid4()),
                question=question["question"],
                order=index + 1,
                question_type=question.get("question_type", "standard"),
                preferred_answer_mode=question.get("preferred_answer_mode", "audio"),
                code_language=question.get("code_language"),
            )
            for index, question in enumerate(questions)
        ],
        created_at=now,
        updated_at=now,
    )
    store.save_session(_serialize_session(session))
    return SessionCreateResponse(
        session_id=session.session_id,
        status=session.status,
        question_count=len(session.questions),
    )


def get_session(session_id: str) -> SessionState:
    return _load_session(session_id)


def list_sessions_ready_to_join(within_minutes: int = 15) -> list[SessionQueueItem]:
    now = _utcnow()
    latest = now + timedelta(minutes=within_minutes)
    queue: list[SessionQueueItem] = []

    for raw in store.list_sessions():
        session = SessionState.model_validate(raw)
        if session.status not in {"scheduled", "ready_to_join", "joining"}:
            continue
        scheduled_at = session.scheduled_at
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        if scheduled_at <= latest:
            queue.append(
                SessionQueueItem(
                    session_id=session.session_id,
                    candidate_name=session.candidate_name,
                    scheduled_at=session.scheduled_at,
                    status=session.status,
                    meeting_id=session.meeting_id,
                    meeting_join_url=session.meeting_join_url,
                    hr_email=session.hr_email,
                )
            )

    queue.sort(key=lambda item: item.scheduled_at)
    return queue


def prepare_session_join(session_id: str, payload: PrepareJoinRequest) -> SessionState:
    ready_at = payload.ready_at or _utcnow()

    def updater(raw: dict) -> dict:
        raw["status"] = "ready_to_join"
        raw["ready_to_join_at"] = ready_at.isoformat()
        raw["failure_reason"] = None
        if payload.meeting_id:
            raw["meeting_id"] = payload.meeting_id
        if payload.meeting_join_url:
            raw["meeting_join_url"] = payload.meeting_join_url
        return raw

    updated = store.update_session(session_id, updater)
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionState.model_validate(updated)


def update_bot_status(session_id: str, payload: BotStatusRequest) -> SessionState:
    occurred_at = payload.occurred_at or _utcnow()

    def updater(raw: dict) -> dict:
        raw["status"] = payload.status
        raw["last_bot_event_at"] = occurred_at.isoformat()
        if payload.status == "joining":
            raw["join_attempted_at"] = occurred_at.isoformat()
        if payload.status == "active":
            raw["bot_joined_at"] = occurred_at.isoformat()
            raw["failure_reason"] = None
        if payload.status == "failed":
            raw["failure_reason"] = payload.reason or "Bot failed without reason"
        return raw

    updated = store.update_session(session_id, updater)
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionState.model_validate(updated)


def join_session(session_id: str, payload: JoinSessionRequest) -> SessionState:
    joined_at = payload.joined_at or _utcnow()

    def updater(raw: dict) -> dict:
        raw["status"] = "active"
        raw["bot_joined_at"] = joined_at.isoformat()
        raw["last_bot_event_at"] = joined_at.isoformat()
        raw["failure_reason"] = None
        return raw

    updated = store.update_session(session_id, updater)
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionState.model_validate(updated)


def get_next_question(session_id: str) -> NextQuestionResponse:
    session = _load_session(session_id)
    question = _current_question(session)
    remaining = max(len(session.questions) - session.current_question_index, 0)
    return NextQuestionResponse(
        session_id=session.session_id,
        status=session.status,
        question=question,
        remaining_questions=remaining,
        completed=question is None,
    )


def _mark_report_email_status(
    session_id: str,
    emailed_at: datetime | None = None,
    error_message: str | None = None,
) -> SessionState:
    def updater(raw: dict) -> dict:
        raw["report_emailed_at"] = emailed_at.isoformat() if emailed_at else None
        raw["report_email_error"] = error_message
        return raw

    updated = store.update_session(session_id, updater)
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionState.model_validate(updated)


def _send_hr_report_if_needed(session: SessionState) -> SessionState:
    if session.status != "completed":
        return session
    if session.report_emailed_at is not None:
        return session

    try:
        report = build_report(session.session_id)
        send_report_email(session, report)
        return _mark_report_email_status(
            session.session_id,
            emailed_at=_utcnow(),
            error_message=None,
        )
    except Exception as err:
        print(f"Report email failed for {session.session_id}: {err}")
        return _mark_report_email_status(
            session.session_id,
            emailed_at=None,
            error_message=str(err),
        )


def submit_text_answer(session_id: str, payload: TextAnswerRequest) -> SessionState:
    session = _load_session(session_id)
    question = _next_question(session, payload.question_id)
    evaluation = evaluate_answer(question.question, payload.answer_text)
    cheating_risk = detect_cheating(payload.answer_text, payload.time_taken_seconds)
    answered_at = _utcnow()

    answer = SessionAnswer(
        question_id=question.question_id,
        question=question.question,
        answer_text=payload.answer_text,
        score=evaluation.score,
        feedback=evaluation.feedback,
        strengths=evaluation.strengths,
        concerns=evaluation.concerns,
        cheating_risk=cheating_risk,
        answered_at=answered_at,
        source="text",
    )

    def updater(raw: dict) -> dict:
        raw["answers"].append(answer.model_dump(mode="json"))
        raw["current_question_index"] = min(
            raw["current_question_index"] + 1,
            len(raw["questions"]),
        )
        raw["last_bot_event_at"] = answered_at.isoformat()
        if raw["current_question_index"] >= len(raw["questions"]):
            raw["status"] = "completed"
        return raw

    updated = store.update_session(session_id, updater)
    return _send_hr_report_if_needed(SessionState.model_validate(updated))


async def submit_audio_answer(session_id: str, file: UploadFile) -> SessionState:
    session = _load_session(session_id)
    question = _next_question(session, None)
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty")

    suffix = Path(file.filename or "").suffix or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(audio_bytes)
        temp_path = Path(temp_file.name)

    audio_url: str | None = None
    try:
        audio_url = upload_audio_bytes(
            session_id=session_id,
            question_id=question.question_id,
            file_name=file.filename,
            content=audio_bytes,
            content_type=file.content_type,
        )
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Audio upload failed: {err}",
        ) from err

    try:
        transcript = transcribe_audio(temp_path, mime_type=file.content_type)
    except (ImportError, ValueError, AttributeError, RuntimeError) as e:
        error_msg = str(e)
        print(f"Transcription error for {session_id}: {error_msg}")
        raise HTTPException(
            status_code=500,
            detail=f"Audio transcription failed: {error_msg}"
        ) from e
    finally:
        temp_path.unlink(missing_ok=True)

    evaluation = evaluate_answer(question.question, transcript)
    cheating_risk = detect_cheating(transcript, None)
    answered_at = _utcnow()

    answer = SessionAnswer(
        question_id=question.question_id,
        question=question.question,
        answer_text=transcript,
        transcript=transcript,
        score=evaluation.score,
        feedback=evaluation.feedback,
        strengths=evaluation.strengths,
        concerns=evaluation.concerns,
        cheating_risk=cheating_risk,
        answered_at=answered_at,
        source="audio",
        audio_url=audio_url,
    )

    def updater(raw: dict) -> dict:
        raw["answers"].append(answer.model_dump(mode="json"))
        raw["current_question_index"] = min(
            raw["current_question_index"] + 1,
            len(raw["questions"]),
        )
        raw["last_bot_event_at"] = answered_at.isoformat()
        if raw["current_question_index"] >= len(raw["questions"]):
            raw["status"] = "completed"
        return raw

    updated = store.update_session(session_id, updater)
    return _send_hr_report_if_needed(SessionState.model_validate(updated))


def build_report(session_id: str) -> SessionReport:
    session = _load_session(session_id)

    if not session.answers:
        raise HTTPException(status_code=400, detail="No answers found")

    total_score = sum([(a.score or 0) for a in session.answers])
    avg_score = total_score / len(session.answers)

    summary_data = summarize_session(session.answers)

    summary = {
        "overall_score": avg_score,
        "strengths": summary_data.get("strengths", "N/A"),
        "concerns": summary_data.get("concerns", "N/A"),
        "recommendation": summary_data.get("recommendation", "N/A"),
    }

    return SessionReport(
        session_id=session.session_id,
        candidate_name=session.candidate_name,
        status=session.status,
        scheduled_at=session.scheduled_at,
        answers=session.answers,
        summary=SessionSummary(**summary),
    )


def complete_session(session_id: str) -> SessionReport:
    session = _load_session(session_id)
    pending_question = _current_question(session)
    if pending_question is not None:
        raise HTTPException(
            status_code=400,
            detail="Session cannot be completed until all questions are answered",
        )

    completed_at = _utcnow()

    def updater(raw: dict) -> dict:
        raw["status"] = "completed"
        raw["last_bot_event_at"] = completed_at.isoformat()
        return raw

    updated = store.update_session(session_id, updater)
    if not updated:
        raise HTTPException(status_code=404, detail="Session not found")
    _send_hr_report_if_needed(SessionState.model_validate(updated))
    return build_report(session_id)
