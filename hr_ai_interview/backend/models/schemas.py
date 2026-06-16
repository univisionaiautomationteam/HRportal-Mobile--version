from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


SessionStatus = Literal[
    "scheduled",
    "ready_to_join",
    "joining",
    "active",
    "completed",
    "failed",
]

QuestionType = Literal["standard", "coding"]
AnswerMode = Literal["audio", "text"]


class InterviewerRef(BaseModel):
    name: str
    email: str | None = None
    role: str | None = None


class SessionCreateRequest(BaseModel):
    candidate_name: str
    candidate_email: str | None = None
    interview_type: str = "L1 HR"
    scheduled_at: datetime
    meeting_id: str | None = None
    meeting_join_url: str | None = None
    hr_email: str | None = None
    interviewers: list[InterviewerRef] = Field(default_factory=list)
    questions: list[str] | None = None
    resume_text: str | None = None
    job_description: str | None = None


class SessionQuestion(BaseModel):
    question_id: str
    question: str
    order: int
    question_type: QuestionType = "standard"
    preferred_answer_mode: AnswerMode = "audio"
    code_language: str | None = None


class SessionAnswer(BaseModel):
    question_id: str
    question: str
    answer_text: str
    score: float
    feedback: str
    strengths: list[str] = []
    concerns: list[str] = []
    cheating_risk: str
    answered_at: datetime
    source: Literal["text", "audio"]
    transcript: str | None = None
    audio_url: str | None = None


class SessionState(BaseModel):
    session_id: str
    candidate_name: str
    candidate_email: str | None = None
    interview_type: str
    scheduled_at: datetime
    meeting_id: str | None = None
    meeting_join_url: str | None = None
    hr_email: str | None = None
    interviewers: list[InterviewerRef] = Field(default_factory=list)
    questions: list[SessionQuestion]
    current_question_index: int = 0
    answers: list[SessionAnswer] = Field(default_factory=list)
    status: SessionStatus = "scheduled"
    bot_joined_at: datetime | None = None
    ready_to_join_at: datetime | None = None
    join_attempted_at: datetime | None = None
    last_bot_event_at: datetime | None = None
    failure_reason: str | None = None
    report_emailed_at: datetime | None = None
    report_email_error: str | None = None
    created_at: datetime
    updated_at: datetime


class SessionCreateResponse(BaseModel):
    session_id: str
    status: SessionStatus
    question_count: int


class JoinSessionRequest(BaseModel):
    joined_at: datetime | None = None


class PrepareJoinRequest(BaseModel):
    meeting_id: str | None = None
    meeting_join_url: str | None = None
    ready_at: datetime | None = None


class BotStatusRequest(BaseModel):
    status: Literal["joining", "active", "failed"]
    reason: str | None = None
    occurred_at: datetime | None = None


class TextAnswerRequest(BaseModel):
    answer_text: str
    question_id: str | None = None
    time_taken_seconds: float | None = None


class NextQuestionResponse(BaseModel):
    session_id: str
    status: SessionStatus
    question: SessionQuestion | None = None
    remaining_questions: int
    completed: bool


class SessionQueueItem(BaseModel):
    session_id: str
    candidate_name: str
    scheduled_at: datetime
    status: SessionStatus
    meeting_id: str | None = None
    meeting_join_url: str | None = None
    hr_email: str | None = None


class SessionSummary(BaseModel):
    overall_score: float
    strengths: list[str]
    concerns: list[str]
    recommendation: str


class SessionReport(BaseModel):
    session_id: str
    candidate_name: str
    status: SessionStatus
    scheduled_at: datetime
    answers: list[SessionAnswer]
    summary: SessionSummary
