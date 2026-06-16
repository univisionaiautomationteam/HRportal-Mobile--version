from pathlib import Path
import json
import re
from ..config import settings

try:
    import google.genai as genai
    from google.genai import types
except ImportError:
    genai = None
    types = None


def _guess_mime_type(path: Path, provided_mime_type: str | None = None) -> str:
    if provided_mime_type:
        return provided_mime_type

    suffix = path.suffix.lower()
    if suffix == ".wav":
        return "audio/wav"
    if suffix == ".mp3":
        return "audio/mpeg"
    if suffix == ".webm":
        return "audio/webm"
    if suffix == ".ogg":
        return "audio/ogg"
    if suffix == ".m4a":
        return "audio/mp4"
    return "application/octet-stream"


TECH_TERM_REPLACEMENTS = {
    r"\bcarium\b": "Cadence Xcelium",
    r"\bcareum\b": "Cadence Xcelium",
    r"\bexcelium\b": "Xcelium",
    r"\bxceliom\b": "Xcelium",
    r"\bzeelium\b": "Xcelium",
    r"\bsystem verilog\b": "SystemVerilog",
    r"\bperl script(?:ing)?\b": "Perl scripting",
    r"\bx run\b": "xrun",
    r"\bquesta sim\b": "QuestaSim",
    r"\btest bench\b": "testbench",
}


def _normalize_technical_transcript(transcript: str) -> str:
    cleaned = transcript.strip()
    for pattern, replacement in TECH_TERM_REPLACEMENTS.items():
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

    # Collapse repeated filler spacing without aggressively rewriting content.
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _extract_transcript_payload(text: str) -> str:
    body = (text or "").strip()
    if not body:
        return ""

    match = re.search(r"\{.*\}", body, re.DOTALL)
    if not match:
        return body

    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return body

    transcript = str(parsed.get("transcript", "")).strip()
    if transcript.lower() in {"", "null", "none"}:
        return ""
    return transcript


def transcribe_audio(file_path: str | Path, mime_type: str | None = None) -> str:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")

    # Check dependencies
    if genai is None or types is None:
        raise ImportError("google-genai not installed. Run: pip install google-genai")

    if not settings.gemini_api_key:
        raise ValueError("GEMINI_API_KEY not set in .env")

    if not settings.use_gemini:
        raise ValueError("AI_INTERVIEW_USE_GEMINI not set to 'true' in .env")

    # Configure Gemini client
    client = genai.Client(api_key=settings.gemini_api_key)

    try:
        # Read audio file
        with path.open("rb") as f:
            audio_data = f.read()

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                (
                    "You are performing strict speech transcription for an interview recording. "
                    "The speaker may have an Indian accent. "
                    "Transcribe only what is actually spoken. "
                    "Do not infer missing content. "
                    "Do not rewrite weak audio into a better answer. "
                    "Do not add technical terms unless they are clearly spoken. "
                    "If audio is unclear, use [inaudible] for the unclear parts instead of guessing. "
                    "If the speaker is singing, humming, or saying random unrelated content, transcribe it literally. "
                    "If a known technical term is clearly intended but slightly misheard, keep the correction minimal. "
                    "If the audio is completely silent, return an empty transcript. "
                    "Transcript the language spoken, even if it is not English. "
                    "Return only valid JSON with one key: transcript."
                ),
                types.Part.from_bytes(
                    data=audio_data,
                    mime_type=_guess_mime_type(path, mime_type),
                ),
            ],
        )

        transcript = _extract_transcript_payload(getattr(response, "text", "") or "")
        transcript = _normalize_technical_transcript(transcript)
        if transcript:
            return transcript
        return "No transcription result"
    except Exception as e:
        raise RuntimeError(f"Gemini speech recognition failed: {e}") from e
