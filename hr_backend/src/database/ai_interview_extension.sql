CREATE TABLE IF NOT EXISTS ai_interview_sessions (
  id INT NOT NULL AUTO_INCREMENT,
  interview_id INT NOT NULL,
  external_session_id VARCHAR(128) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'teams-bot',
  bot_identity VARCHAR(150) DEFAULT NULL,
  meeting_id VARCHAR(255) DEFAULT NULL,
  meeting_join_url TEXT DEFAULT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  report_url TEXT DEFAULT NULL,
  report_json JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_interview_interview_id (interview_id),
  UNIQUE KEY uq_ai_interview_external_session_id (external_session_id)
);
