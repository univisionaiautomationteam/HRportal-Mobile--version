import pool from '../config/database.js';
import {
  isValidEmail,
  isValidPersonName,
  normalizeText
} from '../utils/validation.js';

/* GET INTERVIEWERS */
export const getInterviewers = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM interviewers WHERE is_active = true'
  );
  res.json(rows);
};

/* CREATE INTERVIEWER */
export const createInterviewer = async (req, res) => {
  try {
    console.log('Received interviewer payload:', req.body);

    const { name, email, role, department } = req.body;
    const normalizedName = normalizeText(name);
    const normalizedEmail = normalizeText(email).toLowerCase();
    const normalizedRole = normalizeText(role);
    const normalizedDepartment = normalizeText(department);

    if (!normalizedName || !normalizedRole || !normalizedDepartment) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!isValidPersonName(normalizedName)) {
      return res.status(400).json({ message: 'Please enter a valid interviewer name' });
    }

    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid interviewer email address' });
    }

    // Prevent duplicates among active interviewers:
    // - if email exists, treat matching email as duplicate
    // - otherwise match by name + role + department
    const duplicateSql = normalizedEmail
      ? `SELECT id
         FROM interviewers
         WHERE is_active = true
           AND LOWER(TRIM(email)) = LOWER(TRIM(?))
         LIMIT 1`
      : `SELECT id
         FROM interviewers
         WHERE is_active = true
           AND LOWER(TRIM(name)) = LOWER(TRIM(?))
           AND LOWER(TRIM(role)) = LOWER(TRIM(?))
           AND LOWER(TRIM(department)) = LOWER(TRIM(?))
         LIMIT 1`;

    const duplicateParams = normalizedEmail
      ? [normalizedEmail]
      : [normalizedName, normalizedRole, normalizedDepartment];

    const [existing] = await pool.query(duplicateSql, duplicateParams);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Interviewer already exists' });
    }

    await pool.query(
      `INSERT INTO interviewers (name, email, role, department)
       VALUES (?, ?, ?, ?)`,
      [normalizedName, normalizedEmail || null, normalizedRole, normalizedDepartment]
    );

    res.json({ message: 'Interviewer added successfully' });
  } catch (err) {
    console.error('Create interviewer error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* DELETE INTERVIEWER */
export const deleteInterviewer = async (req, res) => {
  await pool.query(
    'UPDATE interviewers SET is_active = false WHERE id = ?',
    [req.params.id]
  );

  res.json({ message: 'Interviewer removed' });
};
