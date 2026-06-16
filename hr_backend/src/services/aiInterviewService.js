import axios from "axios";
import { getAiInterviewBackendUrl } from "../utils/aiInterviewConfig.js";

export const createAiInterviewSession = async ({
  candidateName,
  candidateEmail,
  interviewType,
  scheduledAt,
  resumeText = null,
  jobDescription = null,
  meetingId = null,
  meetingJoinUrl = null,
  hrEmail = null,
  interviewers = [],
}) => {
  const payload = {
    candidate_name: candidateName,
    candidate_email: candidateEmail,
    interview_type: interviewType,
    scheduled_at: scheduledAt,
    resume_text: resumeText,
    job_description: jobDescription,
    meeting_id: meetingId,
    meeting_join_url: meetingJoinUrl,
    hr_email: hrEmail,
    interviewers: interviewers.map((interviewer) => ({
      name: interviewer.interviewer_name || interviewer.name || "Interviewer",
      email: interviewer.interviewer_email || interviewer.email || null,
      role: interviewer.interviewer_role || interviewer.role || null,
    })),
  };

  const response = await axios.post(
    `${getAiInterviewBackendUrl()}/api/v1/sessions`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    }
  );

  return response.data;
};
