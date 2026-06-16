try:
    import google.genai as genai
except ImportError:
    genai = None

from openai import OpenAI
from ..config import settings


def _is_software_role(resume_text: str, job_description: str | None = None) -> bool:
    resume_lower = resume_text.lower()
    jd_lower = (job_description or "").lower()
    combined = f"{resume_lower}\n{jd_lower}"

    software_keywords = [
        "computer science",
        "information technology",
        "software",
        "developer",
        "backend",
        "frontend",
        "full stack",
        "fullstack",
        "web development",
        "java",
        "python",
        "javascript",
        "react",
        "node",
        "sql",
        "api",
        "data structures",
        "algorithms",
        "coding",
        "programming",
        "sde",
    ]
    hardware_keywords = [
        "analog",
        "mixed signal",
        "mixed-signal",
        "vlsi",
        "rtl",
        "verification",
        "design verification",
        "physical design",
        "layout",
        "circuit",
        "electronics",
        "electrical",
        "semiconductor",
        "fpga",
        "asic",
        "pcb",
        "embedded hardware",
    ]

    if jd_lower:
        jd_software_hits = sum(1 for keyword in software_keywords if keyword in jd_lower)
        jd_hardware_hits = sum(1 for keyword in hardware_keywords if keyword in jd_lower)

        if jd_hardware_hits > 0 and jd_hardware_hits >= jd_software_hits:
            return False
        if jd_software_hits >= 2:
            return True

    resume_strong_software_keywords = [
        "software engineer",
        "software developer",
        "backend developer",
        "frontend developer",
        "full stack",
        "fullstack",
        "web developer",
        "computer science",
        "information technology",
        "sde",
    ]
    resume_hardware_hits = sum(1 for keyword in hardware_keywords if keyword in resume_lower)
    resume_software_hits = sum(1 for keyword in resume_strong_software_keywords if keyword in resume_lower)

    return resume_software_hits > 0 and resume_hardware_hits == 0


def _detect_code_language(resume_text: str, job_description: str | None = None) -> str:
    combined = f"{resume_text}\n{job_description or ''}".lower()
    if "python" in combined:
        return "Python"
    if "java" in combined:
        return "Java"
    if "javascript" in combined or "node" in combined or "react" in combined:
        return "JavaScript"
    if "c++" in combined:
        return "C++"
    if "c#" in combined:
        return "C#"
    return "Preferred language"


def _build_coding_question(resume_text: str, job_description: str | None = None) -> dict:
    language = _detect_code_language(resume_text, job_description)
    combined = f"{resume_text}\n{job_description or ''}".lower()

    if any(term in combined for term in ["sql", "database", "mysql", "postgres"]):
        prompt = (
            "Write a SQL query that returns the second highest salary from an employee table. "
            "Include a short note on how your query handles duplicate salaries."
        )
    elif any(term in combined for term in ["react", "frontend", "javascript", "web"]):
        prompt = (
            f"Write a small {language} function that takes an array of numbers and returns the first non-repeating value. "
            "Then explain the time complexity briefly."
        )
    else:
        prompt = (
            f"Write a short {language} function to check whether a string is a palindrome, ignoring spaces and case. "
            "Then briefly explain your logic and time complexity."
        )

    return {
        "question": prompt,
        "question_type": "coding",
        "preferred_answer_mode": "text",
        "code_language": language,
    }


def generate_questions_from_resume(
    resume_text: str, job_description: str | None = None, count: int = 5
) -> list[dict]:
    """Generate tailored interview questions based on candidate resume and JD."""

    jd_context = f"\nJob Description:\n{job_description}" if job_description else ""
    software_role = _is_software_role(resume_text, job_description)
    standard_count = max(1, count - 1) if software_role and count > 1 else count

    prompt = (
        "You are an expert HR interviewer. Generate exactly the requested number "
        "of targeted, specific interview questions based on the candidate's resume "
        "and job description. Questions should assess relevant skills, experience, "
        "projects, communication, and role fit. Do not repeat questions. Return only the questions, one per line, "
        "with no numbering or extra commentary.\n\n"
        f"Candidate Resume:\n{resume_text}{jd_context}\n\n"
        f"Generate exactly {standard_count} tailored interview questions."
    )

    if settings.use_gemini and settings.gemini_api_key and genai is not None:
        try:
            client = genai.Client(api_key=settings.gemini_api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            questions = _extract_questions(getattr(response, "text", "") or "", standard_count)
            if questions:
                return _finalize_questions(questions, resume_text, job_description, count)
        except Exception as err:
            print(f"Gemini question generation fallback due to exception: {err}")

    if settings.use_openai and settings.openai_api_key:
        try:
            client = OpenAI(api_key=settings.openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert HR interviewer. Generate exactly the requested number "
                            "of targeted, specific interview questions based on candidate's resume and job description. "
                            "Questions should assess skills, experience, and fit for the role. "
                            "Return ONLY the questions, one per line, no numbering."
                        ),
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0.7,
                max_tokens=800,
            )
            content = response.choices[0].message.content.strip()
            questions = _extract_questions(content, standard_count)
            if questions:
                return _finalize_questions(questions, resume_text, job_description, count)
        except Exception as err:
            print(f"OpenAI question generation fallback due to exception: {err}")

    return _finalize_questions(_fallback_questions(resume_text, standard_count), resume_text, job_description, count)


def _extract_questions(content: str, count: int) -> list[str]:
    questions = []
    for line in content.split("\n"):
        question = line.strip().lstrip("-").lstrip("*").strip()
        if not question:
            continue
        if len(question) > 2 and question[0:2].isdigit():
            question = question.split(".", 1)[-1].strip()
        question = question.strip(' "\'')

        lower_question = question.lower()
        if any(
            phrase in lower_question
            for phrase in [
                "here are",
                "tailored interview questions",
                "based on your resume",
                "based on the job description",
                "as a fresher",
            ]
        ):
            continue

        if "?" not in question:
            continue

        questions.append(question)

    # Ensure we have exactly the requested count
    while len(questions) < count:
        questions.extend(_fallback_questions("", 1))

    return questions[:count]


def _finalize_questions(
    questions: list[str], resume_text: str, job_description: str | None, count: int
) -> list[dict]:
    specs = [
        {
            "question": question,
            "question_type": "standard",
            "preferred_answer_mode": "audio",
            "code_language": None,
        }
        for question in questions[:count]
    ]

    if _is_software_role(resume_text, job_description) and count > 0:
        if len(specs) >= count:
            specs = specs[: count - 1]
        specs.append(_build_coding_question(resume_text, job_description))

    while len(specs) < count:
        specs.extend(
            {
                "question": item,
                "question_type": "standard",
                "preferred_answer_mode": "audio",
                "code_language": None,
            }
            for item in _fallback_questions(resume_text, 1)
        )

    return specs[:count]


def _fallback_questions(resume_text: str, count: int = 5) -> list[str]:
    """Fallback questions when AI is not available."""
    
    # Extract key skills hints from resume if available
    skills_hint = ""
    if resume_text:
        text_lower = resume_text.lower()
        if any(skill in text_lower for skill in ["python", "javascript", "java", "c++"]):
            skills_hint = " (programming)"
        elif any(skill in text_lower for skill in ["project manager", "agile", "scrum"]):
            skills_hint = " (leadership)"
    
    base_questions = [
        "Tell me about your most recent relevant project and your specific contributions.",
        f"Describe your experience with the key skills required for this role{skills_hint}.",
        "How do you approach problem-solving when facing a technical or professional challenge?",
        "Tell us about a time you worked with a team toward a common goal.",
        "What interests you about this position and how does it fit your career goals?",
        "How do you stay updated with industry trends and new technologies?",
        "Describe a situation where you had to learn something new quickly.",
        "How do you handle pressure or tight deadlines in your work?",
    ]
    
    return base_questions[:count]
