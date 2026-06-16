def detect_cheating(answer: str, time_taken_seconds: float | None) -> str:
    text = (answer or "").strip()

    if time_taken_seconds is not None:
        if len(text) > 250 and time_taken_seconds < 8:
            return "high"
        if time_taken_seconds > 90:
            return "medium"

    if len(text.split()) < 3:
        return "low"

    return "low"
