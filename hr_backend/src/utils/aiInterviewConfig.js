const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

export const getAiInterviewBackendUrl = () =>
  trimTrailingSlash(
    process.env.AI_INTERVIEW_BACKEND_URL ||
      process.env.AI_INTERVIEW_SERVICE_URL ||
      "http://127.0.0.1:8000"
  );

export const getCandidateInterviewUrl = () =>
  trimTrailingSlash(
    process.env.CANDIDATE_INTERVIEW_URL || "http://localhost:3001"
  );
