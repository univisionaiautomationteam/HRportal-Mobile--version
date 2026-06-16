from pathlib import Path
from dotenv import load_dotenv
import os


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)
HR_BACKEND_ENV_PATH = BASE_DIR.parent / "hr_backend" / ".env"
if HR_BACKEND_ENV_PATH.exists():
    load_dotenv(HR_BACKEND_ENV_PATH, override=False)


def _resolve_store_path() -> Path:
    raw_path = os.getenv("AI_INTERVIEW_STORE", "./data/sessions.json")
    path = Path(raw_path)
    if not path.is_absolute():
        path = BASE_DIR / path
    return path


class Settings:
    app_name = "AI HR Interview Bot"
    store_path = _resolve_store_path()
    openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    use_openai = os.getenv("AI_INTERVIEW_USE_OPENAI", "false").lower() == "true"
    use_gemini = os.getenv("AI_INTERVIEW_USE_GEMINI", "false").lower() == "true"
    default_question_count = int(os.getenv("AI_INTERVIEW_DEFAULT_QUESTION_COUNT", "10"))
    session_api_base = os.getenv("AI_INTERVIEW_SESSION_API_BASE", "http://127.0.0.1:8000").rstrip("/")
    bot_poll_interval_seconds = int(os.getenv("AI_INTERVIEW_BOT_POLL_INTERVAL_SECONDS", "10"))
    microsoft_app_id = os.getenv("MICROSOFT_APP_ID", "").strip()
    microsoft_app_password = os.getenv("MICROSOFT_APP_PASSWORD", "").strip()
    microsoft_app_tenant_id = os.getenv("MICROSOFT_APP_TENANT_ID", "").strip()
    bot_public_base_url = os.getenv("BOT_PUBLIC_BASE_URL", "http://127.0.0.1:8010").rstrip("/")
    graph_tenant_id = os.getenv("MS_TENANT_ID", "").strip()
    graph_client_id = os.getenv("MS_CLIENT_ID", "").strip()
    graph_client_secret = os.getenv("MS_CLIENT_SECRET", "").strip()
    graph_sender_email = os.getenv("TEAMS_ORGANIZER_EMAIL", "").strip()
    aws_access_key = os.getenv("AWS_ACCESS_KEY", "").strip()
    aws_secret_key = os.getenv("AWS_SECRET_KEY", "").strip()
    aws_region = os.getenv("AWS_REGION", "ap-south-1").strip()
    ai_audio_bucket = os.getenv("AI_INTERVIEW_AUDIO_BUCKET", os.getenv("AWS_S3_BUCKET", "")).strip()
    ai_audio_prefix = os.getenv("AI_INTERVIEW_AUDIO_PREFIX", "ai-interview/audio").strip().strip("/")


settings = Settings()
