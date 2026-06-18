import apiClient from './apiClient';

/* ================= AUTH API ================= */
export const authAPI = {
  googleLogin: (token: string) =>
    apiClient.post('/auth/google-login', { token }),

  verifyOTP: (userId: string, otp: string) =>
    apiClient.post('/auth/verify-otp', { userId, otp }),
  
  microsoftLogin: (token: string) =>
    apiClient.post('/auth/microsoft-login', { token }),
};

/* ================= ADMIN API ================= */
export const adminAPI = {
  login: (data: any) => apiClient.post('/admin/login', data),
  addUser: (data: any) => apiClient.post('/admin/add-user', data),
  getUsers: () => apiClient.get('/admin/users'),
  updateUser: (id: string, data: any) => apiClient.put(`/admin/update-user/${id}`, data),
  deleteUser: (id: string) => apiClient.delete(`/admin/delete-user/${id}`),
};

/* ================= CANDIDATES API ================= */
export const candidatesAPI = {
  getAll: () => apiClient.get('/candidates'),
  getById: (id: string) => apiClient.get(`/candidates/${id}`),
  create: (data: any) => apiClient.post('/candidates', data),
  update: (id: string, data: any) => apiClient.put(`/candidates/${id}`, data),
  delete: (id: string) => apiClient.delete(`/candidates/${id}`),
  getRemarks: (candidateId: string) => apiClient.get(`/candidates/${candidateId}/remarks`),
  addRemark: (candidateId: string, data: any) => apiClient.post(`/candidates/${candidateId}/remarks`, data),
};

/* ================= INTERVIEWS API ================= */
export const interviewsAPI = {
  getAll: (params?: any) => apiClient.get('/interviews', { params }),
  getByCandidate: (candidateId: string) =>
    apiClient.get(`/interviews/candidate/${candidateId}`),
  create: (data: any) => apiClient.post('/interviews', data),
  cancel: (id: string) => apiClient.post(`/interviews/${id}/cancel`),
  update: (id: string, data: any) =>
    apiClient.put(`/interviews/${id}`, data),
  updateStatus: (id: string, data: any) =>
    apiClient.put(`/interviews/${id}/status`, data),
};

/* ================= OFFERS API ================= */
export const offersAPI = {
  getAll: (params?: any) => apiClient.get('/offers', { params }),
  getMyPending: () => apiClient.get('/offers/my/pending'),
  getAcceptedByMe: () => apiClient.get('/offers/my/accepted'),
  getByCandidate: (candidateId: string) =>
    apiClient.get(`/offers/candidate/${candidateId}`),
  create: (data: any) => apiClient.post('/offers', data),
  update: (id: string, data: any) =>
    apiClient.put(`/offers/${id}`, data),
  respond: (id: string, data: any) =>
    apiClient.post(`/offers/${id}/respond`, data),
  handleAction: (id: string, data: any) =>
    apiClient.post(`/offers/${id}/action`, data),
  assignStage: (id: string, data: any) =>
    apiClient.post(`/offers/${id}/assign`, data),
  workflow: (id: string, data: any) =>
    apiClient.post(`/offers/${id}/workflow`, data),
  delete: (id: string) =>
    apiClient.delete(`/offers/${id}/workflow`),
  sendOfferLetter: (data: any) =>
    apiClient.post('/offers/send-offer-letter', data),
  getWorkflowEmails: () =>
    apiClient.get('/workflow-emails'),
  saveWorkflowEmails: (data: any) =>
    apiClient.post('/workflow-emails', data),
};

/* ================= EMAILS API ================= */
export const emailsAPI = {
  sendInterview: (data: any) =>
    apiClient.post('/emails/interview', data),
  sendHRInterviewNotification: (data: any) =>
    apiClient.post('/emails/hr-interview-notification', data),
  sendOffer: (data: any) =>
    apiClient.post('/emails/offer', data),
  getLogs: () =>
    apiClient.get('/emails/logs'),
};

/* ================= AI API ================= */
export const aiAPI = {
  parseResume: (formData: any) =>
    apiClient.post('/ai/parse-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  analyzeResume: (data: any) =>
    apiClient.post('/ai/analyze', data),
  getJDSuggestions: (data: any) =>
    apiClient.post('/ai/jd-suggestions', data),
  getInterviewTips: (data: any) =>
    apiClient.post('/ai/interview-tips', data),
  convertResumeFormat: (formData: any) =>
    apiClient.post('/ai/convert-resume-format', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  generateFormattedResume: (data: any) =>
    apiClient.post('/ai/generate-formatted-resume', data),
  downloadFormattedResume: (data: any) =>
    apiClient.post('/ai/generate-formatted-resume', data, {
      responseType: 'blob',
    }),
};

/* ================= INTERVIEWERS API ================= */
export const interviewersAPI = {
  getAll: () => apiClient.get('/interviewers'),
  create: (data: any) => apiClient.post('/interviewers', data),
  delete: (id: string) => apiClient.delete(`/interviewers/${id}`),
};

/* ================= RESUMES API ================= */
export const resumesAPI = {
  parseResume: (formData: any) =>
    apiClient.post('/ai/parse-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  upload: (formData: any) =>
    apiClient.post('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAllUpdates: () => apiClient.get('/resumes/all-updates'),
  getByCandidate: (candidateId: string) =>
    apiClient.get(`/resumes/candidate/${candidateId}`),
  getById: (id: string) =>
    apiClient.get(`/resumes/${id}`),
  download: (id: string) =>
    apiClient.get(`/resumes/download/${id}`),
};

/* ================= PROFILE API ================= */
export const profileAPI = {
  getStatusActivity: () => apiClient.get('/profile/status-activity'),
  getProfile: () => apiClient.get('/profile/me'),
};

/* ================= CHATBOT API ================= */
export const chatbotAPI = {
  query: (query: string) => apiClient.post('/chatbot', { query }),
};

/* ================= JOBS API ================= */
export const jobsAPI = {
  getAll: () => apiClient.get('/jobs'),
  create: (data: any) => apiClient.post('/jobs', data),
  delete: (id: string) => apiClient.delete(`/jobs/${id}`),
};
