export interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
  token?: string;
}

export interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position: string;
  status: 'applied' | 'screening_pending' | 'l1_scheduled' | 'l2_scheduled' | 'l1_select' | 'l2_select' | 'col_issued' | 'fol_issued' | 'joined' | string;
  resume_url?: string;
  resume_id?: string;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  created_by_name?: string;
  updated_by_name?: string;
  remarks_count?: number;
}

export interface Job {
  id: string;
  position: string;
  description: string;
  requirements?: string;
  status?: string;
  created_at?: string;
}

export interface Interview {
  id: string;
  candidate_id: string;
  candidate_name: string;
  position: string;
  scheduled_date: string;
  status: 'scheduled' | 'cancelled' | 'completed' | string;
  interviewer_id?: string;
  interviewer_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  candidate_id: string;
  candidate_name: string;
  position: string;
  status: 'draft' | 'pending' | 'accepted' | 'rejected' | string;
  salary?: number;
  joining_date?: string;
  offer_letter_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Remark {
  id: string;
  candidate_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface StatusActivity {
  id: string;
  candidate_name?: string;
  status_from: string;
  status_to: string;
  changed_by_name: string;
  created_at: string;
}

export interface WorkflowEmail {
  id: string;
  stage: string;
  subject: string;
  body: string;
}
