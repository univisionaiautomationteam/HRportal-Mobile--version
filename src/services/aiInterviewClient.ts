import axios from 'axios';
import { AI_INTERVIEW_BASE_URL } from '../constants/config';

const aiInterviewClient = axios.create({
  baseURL: AI_INTERVIEW_BASE_URL,
  timeout: 30000, // Longer timeout for AI processing/audio upload
});

/* Simple wrapper for AI Interview Assessment API */
export const aiAssessmentAPI = {
  createSession: (data: any) => aiInterviewClient.post('/sessions', data),
  getSession: (id: string) => aiInterviewClient.get(`/sessions/${id}`),
  getNextQuestion: (id: string) => aiInterviewClient.get(`/sessions/${id}/next-question`),
  submitAudio: (id: string, formData: FormData) =>
    aiInterviewClient.post(`/sessions/${id}/answers/audio`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getReport: (id: string) => aiInterviewClient.get(`/sessions/${id}/report`),
};

export default aiInterviewClient;
