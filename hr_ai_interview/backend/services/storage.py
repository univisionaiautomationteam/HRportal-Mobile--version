from __future__ import annotations

from io import BytesIO
from pathlib import Path
import re

import boto3

from ..config import settings


def _sanitize_name(file_name: str | None) -> str:
    raw_name = file_name or "audio.bin"
    base_name = Path(raw_name).name
    return re.sub(r"[^A-Za-z0-9._-]", "_", base_name)


def upload_audio_bytes(
    *,
    session_id: str,
    question_id: str,
    file_name: str | None,
    content: bytes,
    content_type: str | None = None,
) -> str:
    if not settings.ai_audio_bucket:
        raise RuntimeError("AI_INTERVIEW_AUDIO_BUCKET or AWS_S3_BUCKET is not configured")

    if not settings.aws_access_key or not settings.aws_secret_key:
        raise RuntimeError("AWS credentials are not configured for AI interview audio uploads")

    s3 = boto3.client(
        "s3",
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key,
        aws_secret_access_key=settings.aws_secret_key,
    )

    safe_name = _sanitize_name(file_name)
    key = f"{settings.ai_audio_prefix}/{session_id}/{question_id}/{safe_name}"

    extra_args: dict[str, str] = {}
    if content_type:
        extra_args["ContentType"] = content_type

    s3.upload_fileobj(
        Fileobj=BytesIO(content),
        Bucket=settings.ai_audio_bucket,
        Key=key,
        ExtraArgs=extra_args,
    )

    return f"https://{settings.ai_audio_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"
