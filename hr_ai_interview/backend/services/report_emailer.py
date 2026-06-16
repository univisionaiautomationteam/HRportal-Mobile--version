from __future__ import annotations

import json
from urllib import error, parse, request

from ..config import settings
from ..models.schemas import SessionReport, SessionState


def _graph_token() -> str:
    if not (
        settings.graph_tenant_id
        and settings.graph_client_id
        and settings.graph_client_secret
        and settings.graph_sender_email
    ):
        raise ValueError("Microsoft Graph mail settings are incomplete")

    payload = parse.urlencode(
        {
            "client_id": settings.graph_client_id,
            "client_secret": settings.graph_client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials",
        }
    ).encode("utf-8")

    token_request = request.Request(
        f"https://login.microsoftonline.com/{settings.graph_tenant_id}/oauth2/v2.0/token",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with request.urlopen(token_request, timeout=30) as response:
        token_data = json.loads(response.read().decode("utf-8"))
    return token_data["access_token"]


def _report_html(session: SessionState, report: SessionReport) -> str:
    strengths = "".join(f"<li>{item}</li>" for item in report.summary.strengths) or "<li>None</li>"
    concerns = "".join(f"<li>{item}</li>" for item in report.summary.concerns) or "<li>None</li>"
    answers = "".join(
        (
            f"<h4>Question {index}</h4>"
            f"<p><strong>Question:</strong> {answer.question}</p>"
            f"<p><strong>Answer:</strong> {answer.answer_text}</p>"
            f"<p><strong>Score:</strong> {answer.score:.1f}/10</p>"
            f"<p><strong>Feedback:</strong> {answer.feedback}</p>"
            f"<p><strong>Cheating Risk:</strong> {answer.cheating_risk}</p>"
            "<hr />"
        )
        for index, answer in enumerate(report.answers, start=1)
    )

    return f"""
    <h2>AI Interview Report</h2>
    <p><strong>Candidate:</strong> {session.candidate_name}</p>
    <p><strong>Candidate Email:</strong> {session.candidate_email or 'N/A'}</p>
    <p><strong>Interview Type:</strong> {session.interview_type}</p>
    <p><strong>Session ID:</strong> {session.session_id}</p>
    <p><strong>Scheduled At:</strong> {session.scheduled_at.isoformat()}</p>
    <h3>Summary</h3>
    <p><strong>Overall Score:</strong> {report.summary.overall_score:.1f}/10</p>
    <p><strong>Recommendation:</strong> {report.summary.recommendation}</p>
    <p><strong>Strengths:</strong></p>
    <ul>{strengths}</ul>
    <p><strong>Concerns:</strong></p>
    <ul>{concerns}</ul>
    <h3>Detailed Answers</h3>
    {answers}
    """


def send_report_email(session: SessionState, report: SessionReport) -> None:
    if not session.hr_email:
        raise ValueError("HR email is not set for this session")

    access_token = _graph_token()
    payload = {
        "message": {
            "subject": f"AI Interview Report: {session.candidate_name}",
            "body": {
                "contentType": "HTML",
                "content": _report_html(session, report),
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": session.hr_email,
                    }
                }
            ],
        },
        "saveToSentItems": True,
    }

    mail_request = request.Request(
        f"https://graph.microsoft.com/v1.0/users/{settings.graph_sender_email}/sendMail",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(mail_request, timeout=30):
            return
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Graph mail send failed: {detail}") from exc
