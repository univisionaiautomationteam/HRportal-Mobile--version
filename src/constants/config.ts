import { Platform } from 'react-native';

// For Android emulators, 10.0.2.2 points to host machine loopback (localhost).
// For iOS emulators or real devices, you MUST use your computer's LAN IP address.
export const LOCAL_HOST_IP = '192.168.1.3';
//export const LOCAL_HOST_IP = '10.0.2.2';

export const API_BASE_URL = Platform.select({
  android: `http://${LOCAL_HOST_IP}:5000/api`,
  ios: 'http://localhost:5000/api',
  default: 'http://localhost:5000/api',
});

export const AI_INTERVIEW_BASE_URL = Platform.select({
  android: `http://${LOCAL_HOST_IP}:8000/api/v1`,
  ios: 'http://localhost:8000/api/v1',
  default: 'http://localhost:8000/api/v1',
});

export const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening_pending: 'Screening Pending',
  l1_scheduled: 'Interview Scheduled',
  l2_scheduled: 'Interview Scheduled',
  l1_select: 'Shortlisted',
  l2_select: 'Shortlisted',
  col_issued: 'Offered',
  fol_issued: 'Offered',
  joined: 'Joined',
};
