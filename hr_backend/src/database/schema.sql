DROP DATABASE IF EXISTS hrportal;
CREATE DATABASE hrportal;
USE hrportal;

SET FOREIGN_KEY_CHECKS=0;

-- USERS
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  role VARCHAR(50) DEFAULT 'HR',
  two_factor_enabled TINYINT(1) DEFAULT '0',
  two_factor_secret VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  designation VARCHAR(100) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT '1',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY email (email)
);

-- CANDIDATES
CREATE TABLE candidates (
  id INT NOT NULL AUTO_INCREMENT,
  custom_first_name VARCHAR(100),
  custom_last_name VARCHAR(100),
  email_id VARCHAR(255),
  phone_number VARCHAR(20),
  alternate_mobile_number VARCHAR(20),
  skills TEXT,
  education TEXT,
  custom_current_employer VARCHAR(255),
  custom_overall_experience_years VARCHAR(50),
  custom_relevant_experience_years VARCHAR(50),
  custom_current_salary_lpa VARCHAR(50),
  custom_expected_salary_lpa VARCHAR(50),
  notice_period VARCHAR(50),
  last_working_day DATE,
  position VARCHAR(255),
  status VARCHAR(50) DEFAULT 'applied',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT,
  updated_by_id INT,
  updated_by_name VARCHAR(100),
  offer_in_hand VARCHAR(255),
  variable_pay_details VARCHAR(255),
  rsu_details VARCHAR(255),
  PRIMARY KEY (id)
);

-- JOBS
CREATE TABLE jobs (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  experience_required VARCHAR(100),
  location VARCHAR(255),
  notice_period VARCHAR(100),
  skills TEXT,
  job_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- INTERVIEWERS
CREATE TABLE interviewers (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  role VARCHAR(100),
  department VARCHAR(100),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- INTERVIEWS
CREATE TABLE interviews (
  id INT NOT NULL AUTO_INCREMENT,
  candidate_id INT NOT NULL,
  scheduled_date DATETIME NOT NULL,
  interview_type ENUM('Technical','Non-Technical') NOT NULL,
  interviewer_name VARCHAR(100),
  interviewer_email VARCHAR(150),
  interviewer_role VARCHAR(100),
  interviewer_department VARCHAR(100),
  meeting_type ENUM('teams') DEFAULT 'teams',
  meeting_link TEXT,
  meeting_event_id VARCHAR(255),
  organizer_email VARCHAR(255),
  status VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY candidate_id (candidate_id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- RESUME VERSIONS
CREATE TABLE resume_versions (
  id INT NOT NULL AUTO_INCREMENT,
  candidate_id INT NOT NULL,
  resume_file_path VARCHAR(1000) NOT NULL,
  updated_by INT,
  updated_by_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY candidate_id (candidate_id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- CANDIDATE STATUS LOGS
CREATE TABLE candidate_status_logs (
  id INT NOT NULL AUTO_INCREMENT,
  candidate_id INT NOT NULL,
  hr_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY candidate_id (candidate_id),
  KEY hr_id (hr_id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CANDIDATE REMARKS
CREATE TABLE candidate_remarks (
  id INT NOT NULL AUTO_INCREMENT,
  candidate_id INT NOT NULL,
  remark_type VARCHAR(50) DEFAULT 'custom',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  changed_fields JSON,
  created_by INT NOT NULL,
  created_by_name VARCHAR(100),
  updated_by INT,
  updated_by_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY fk_candidate_remarks_created_by (created_by),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- OFFERS
CREATE TABLE offers (
  id INT NOT NULL AUTO_INCREMENT,
  candidate_id INT NOT NULL,
  position VARCHAR(255),
  salary VARCHAR(100),
  start_date DATE,
  status VARCHAR(100) DEFAULT 'fol_issued',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  email_sent_at DATETIME,
  offer_letter_url VARCHAR(1000),
  stage1_email VARCHAR(255),
  stage2_email VARCHAR(255),
  stage3_email VARCHAR(255),
  current_stage INT DEFAULT 1,
  stage1_status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  stage2_status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  stage3_status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  overall_status ENUM('In Progress','Approved','Rejected') DEFAULT 'In Progress',
  created_by VARCHAR(255),
  stage1_approved_by VARCHAR(255),
  stage2_approved_by VARCHAR(255),
  stage3_approved_by VARCHAR(255),
  stage1_approved_at DATETIME,
  stage2_approved_at DATETIME,
  stage3_approved_at DATETIME,
  updated_by VARCHAR(255),
  offer_accepted TINYINT DEFAULT 0,
  offer_rejected TINYINT DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY candidate_id (candidate_id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

-- OFFER APPROVERS
CREATE TABLE offer_approvers (
  id INT NOT NULL AUTO_INCREMENT,
  role ENUM('HR','Stage1','Stage2','Stage3'),
  name VARCHAR(100),
  email VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- WORKFLOW EMAILS
CREATE TABLE workflow_emails (
  id INT NOT NULL AUTO_INCREMENT,
  stage VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

SET FOREIGN_KEY_CHECKS=1;
