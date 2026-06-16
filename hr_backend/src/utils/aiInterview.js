const AI_INTERVIEWER_KEYWORDS = ["utsbot", "ai interviewer", "ai bot"];

const normalize = (value = "") => String(value).trim().toLowerCase();

export const isAiInterviewer = (interviewer = {}) => {
  const name = normalize(interviewer.interviewer_name || interviewer.name);
  const email = normalize(interviewer.interviewer_email || interviewer.email);

  return AI_INTERVIEWER_KEYWORDS.some(
    (keyword) => name.includes(keyword) || email.includes(keyword)
  );
};

export const getAiInterviewer = (interviewers = []) =>
  interviewers.find((interviewer) => isAiInterviewer(interviewer)) || null;

export const isAiInterviewRequested = (interviewers = []) =>
  Boolean(getAiInterviewer(interviewers));
