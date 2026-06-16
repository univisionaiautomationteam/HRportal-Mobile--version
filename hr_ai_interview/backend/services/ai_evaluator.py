from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

try:
    import google.genai as genai
except ImportError:
    genai = None

from openai import OpenAI

from ..config import settings
from ..models.schemas import SessionAnswer


@dataclass
class EvaluationResult:
    score: float
    feedback: str
    strengths: list[str]
    concerns: list[str]
    recommendation: str


def _fallback_score(question: str, answer: str) -> EvaluationResult:
    words = len(answer.split())
    score = min(10.0, max(3.5, round(words / 7, 1)))
    strong = words >= 20
    feedback = (
        "Answer showed reasonable detail for an L1 or junior interview round."
        if strong
        else "Answer showed some understanding but needs more structure and concrete examples."
    )
    return EvaluationResult(
        score=score,
        feedback=feedback,
        strengths=["Provided a relevant answer"] if strong else ["Showed partial understanding"],
        concerns=[] if strong else ["Response was brief, loosely structured, or lacked examples"],
        recommendation=(
            "Proceed to the next round; the answer shows relevant understanding for this level."
            if score >= 7
            else "Needs follow-up questioning because the answer shows partial understanding but lacks enough depth."
        ),
    )


def _build_evaluation_prompt(question: str, answer: str) -> str:
    return (
        "You are evaluating an L1 or junior interview answer. "
        "Be fair, practical, and slightly lenient. "
        "Do not expect an exact textbook answer. "
        "Do not heavily penalize filler words, grammar issues, Indian-accent phrasing, or minor speech-to-text errors. "
        "Give partial credit when the candidate shows relevant hands-on exposure, tool familiarity, debugging experience, "
        "correct terminology, or approximate understanding even if the answer is unstructured.\n\n"
        "Scoring guide:\n"
        "- 8 to 10: strong, clearly relevant, technically convincing\n"
        "- 5 to 7.5: good enough, relevant understanding with some gaps\n"
        "- 2 to 4.5: partial understanding, weak structure, but still meaningfully relevant\n"
        "- 0 to 1: mostly irrelevant, incorrect, or extremely thin\n\n"
        "Return only valid JSON with keys: score, feedback, strengths, concerns, recommendation.\n"
        "The recommendation must be a short specific sentence, not just a label like advance/reject. "
        "If the answer is weak, clearly state why.\n\n"
        f"Question: {question}\n"
        f"Answer: {answer}\n"
    )


def evaluate_answer(question: str, answer: str) -> EvaluationResult:
    if settings.use_gemini and settings.gemini_api_key:
        prompt = _build_evaluation_prompt(question, answer)
        try:
            if genai is None:
                raise ImportError("google-genai not installed")
            client = genai.Client(api_key=settings.gemini_api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            text = getattr(response, "text", "") or ""
            return _parse_evaluation_text(text, question, answer)
        except Exception as err:
            print(f"AI eval fallback due to exception: {err}")
            return _fallback_score(question, answer)

    if settings.use_openai and settings.openai_api_key:
        client = OpenAI(api_key=settings.openai_api_key)
        prompt = _build_evaluation_prompt(question, answer)

        try:
            response = client.responses.create(
                model="gpt-4o-mini",
                input=[
                    {"role": "user", "content": prompt},
                ],
                max_output_tokens=400,
            )

            text = None
            if hasattr(response, "output_text"):
                text = response.output_text
            elif isinstance(response, dict):
                text = response.get("output_text") or response.get("text")
            elif hasattr(response, "choices") and response.choices:
                text = response.choices[0].get("message", {}).get("content", "")

            return _parse_evaluation_text(text or "", question, answer)
        except Exception as err:
            print(f"AI eval fallback due to exception: {err}")
            return _fallback_score(question, answer)

    return _fallback_score(question, answer)


def _parse_evaluation_text(text: str, question: str, answer: str) -> EvaluationResult:
    import json
    import re

    body = text.strip()
    if not body:
        raise ValueError("No text output from model")

    json_match = re.search(r"\{.*\}", body, re.DOTALL)
    parsed = None
    if json_match:
        parsed = json.loads(json_match.group(0))

    if not parsed:
        return _fallback_score(question, answer)

    return EvaluationResult(
        score=max(0.0, min(10.0, float(parsed.get("score", 3.5)))),
        feedback=str(parsed.get("feedback", "No feedback")),
        strengths=list(parsed.get("strengths", [])),
        concerns=list(parsed.get("concerns", [])),
        recommendation=str(parsed.get("recommendation", "review")),
    )


def summarize_session(feedback_items: Iterable[SessionAnswer]) -> dict:
    items = list(feedback_items)
    if not items:
        return {
            "overall_score": 0.0,
            "strengths": [],
            "concerns": ["No answers were recorded"],
            "recommendation": "Interview incomplete because no answers were recorded.",
        }

    overall = round(sum(item.score for item in items) / len(items), 1)
    strengths = [text for item in items for text in item.strengths][:5]
    concerns = [text for item in items for text in item.concerns][:5]

    if overall >= 7.5:
        recommendation = "Proceed to the next round; the candidate showed solid overall understanding with manageable gaps."
    elif overall >= 5:
        recommendation = "Needs manual review; the candidate showed relevant understanding, but some answers need deeper validation."
    else:
        recommendation = "Do not make a positive decision yet; the answers were too weak or inconsistent and need significant follow-up."

    return {
        "overall_score": overall,
        "strengths": strengths,
        "concerns": concerns,
        "recommendation": recommendation,
    }
