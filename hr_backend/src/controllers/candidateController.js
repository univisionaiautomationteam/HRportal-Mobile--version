import pool from '../config/database.js';
import { sendMailViaGraph } from "../utils/sendMailGraph.js";

const normalizeDateForMysql = (value) =>
  value && String(value).trim()
    ? new Date(value).toISOString().slice(0, 10)
    : null;

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const normalizePhoneNumber = (value) =>
  String(value || '').replace(/\D/g, '');

const isValidPhoneNumber = (value) => {
  const normalized = normalizePhoneNumber(value);
  return normalized.length >= 10 && normalized.length <= 15;
};

const buildCandidateDeletionEmail = ({
  candidateName,
  candidateEmail,
  candidatePhone,
  candidateStatus,
  deletedByName,
  deletedAt,
}) => `
  <h3>Candidate Deleted Notification</h3>
  <p>Dear HR,</p>

  <p>The following candidate has been deleted from the portal.</p>

  <p><b>Candidate Name:</b> ${candidateName || "N/A"}<br/>
  <b>Email:</b> ${candidateEmail || "N/A"}<br/>
  <b>Phone:</b> ${candidatePhone || "N/A"}<br/>
  <b>Status at Deletion:</b> ${candidateStatus || "N/A"}<br/>
  <b>Deleted By:</b> ${deletedByName || "HR Manager"}<br/>
  <b>Deleted At:</b> ${deletedAt}</p>

  <p>If this deletion was unexpected, please check with the HR Manager.</p>

  <br/>
  <p>Best regards,<br/>
  Univision HR Portal</p>
`;

/* ================= CREATE ================= */
export const createCandidate = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hrId = req.user.id;
    const hrName = req.user.name;

    const {
      first_name,
      last_name,
      email_id,
      phone_number,
      alternate_mobile_number,
      skills,
      education,
      custom_current_employer,
      custom_overall_experience_years,
      custom_relevant_experience_years,
      custom_current_salary_lpa,
      custom_expected_salary_lpa,
      offer_in_hand,
      variable_pay_details,
      rsu_details,
      notice_period,
      last_working_day,
      position,
      status = "applied",
    } = req.body;

    const normalizedLastWorkingDay = normalizeDateForMysql(last_working_day);
    const normalizedEmail = String(email_id || '').trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(phone_number);
    const normalizedAlternatePhone = alternate_mobile_number
      ? normalizePhoneNumber(alternate_mobile_number)
      : null;
 

    if (!first_name || !String(first_name).trim()) {
      return res.status(400).json({ error: "Candidate first name is required" });
    }

    if (!email_id) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }
    if (!phone_number) {
      return res.status(400).json({ error: "Mobile number is required" });
    }
    if (!isValidPhoneNumber(phone_number)) {
      return res.status(400).json({ error: "Please enter a valid mobile number using digits only" });
    }
    if (alternate_mobile_number && !isValidPhoneNumber(alternate_mobile_number)) {
      return res.status(400).json({ error: "Please enter a valid alternate mobile number using digits only" });
    }

    // 🔍 DUPLICATE CHECK
    const [existing] = await pool.query(
      "SELECT id FROM candidates WHERE email_id = ?",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: "Email already exists",
        candidateId: existing[0].id
      });
    }

    // 🔍 DUPLICATE CHECK - PHONE NUMBER
    const [existingPhone] = await pool.query(
      "SELECT id FROM candidates WHERE phone_number = ?",
      [normalizedPhone]
    );

    if (existingPhone.length > 0) {
      return res.status(409).json({
        error: "Mobile number already exists",
        candidateId: existingPhone[0].id
      });
    }

    // ✅ INSERT
    const [result] = await pool.query(
      `INSERT INTO candidates (
        custom_first_name,
        custom_last_name,
        email_id,
        phone_number,
        alternate_mobile_number,
        skills,
        education,
        custom_current_employer,
        custom_overall_experience_years,
        custom_relevant_experience_years,
        custom_current_salary_lpa,
        custom_expected_salary_lpa,
        offer_in_hand,
        variable_pay_details,
        rsu_details,
        notice_period,
        last_working_day,
        position,
        status,
        created_by,
        created_by_name,
        assigned_to,
        assigned_to_name,
        updated_by,
        updated_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name || null,
        normalizedEmail,
        normalizedPhone || null,
        normalizedAlternatePhone,
        skills || null,
        education || null,
        custom_current_employer || null,
        custom_overall_experience_years || null,
        custom_relevant_experience_years || null,
        custom_current_salary_lpa || null,
        custom_expected_salary_lpa || null,
        offer_in_hand || null,
        variable_pay_details || null,
        rsu_details || null,
        notice_period || null,
        normalizedLastWorkingDay,
        position || null,
        status,
        hrId,
        hrName,
        hrId,
        hrName,
        hrId,
        hrName
      ]
    );

    res.status(201).json({
      message: "Candidate created successfully",
      id: result.insertId
    });

  } catch (err) {
    console.error("Create candidate error:", err);

    // 🔐 DB unique fallback
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Candidate already exists with this email"
      });
    }

    res.status(500).json({ error: "Server error" });
  }
};

/* ================= LIST ================= */
export const getCandidates = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id,
        c.custom_first_name AS first_name,
        c.custom_last_name AS last_name,
        c.email_id,
        c.phone_number,
        c.skills,
        c.status,
        c.position,
        c.created_at,
        c.created_by AS created_by_id,
        c.created_by_name,
        c.assigned_to AS owner_id,
        c.assigned_to_name AS owner_name,
        c.updated_at,
        COALESCE(u.name, c.updated_by_name, 'Unknown') AS updated_by_name
      FROM candidates c
      LEFT JOIN users u ON c.updated_by = u.id
      ORDER BY c.created_at DESC
      LIMIT 5000
    `);

    res.json(rows);
  } catch (err) {
    console.error('getCandidates error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
};

/* ================= DETAIL ================= */
export const getCandidateById = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT
      c.id,
      c.custom_first_name AS first_name,
      c.custom_last_name AS last_name,
      c.email_id,
      c.phone_number,
      c.alternate_mobile_number,
      c.skills,
      c.education,
      c.custom_current_employer,
      c.custom_overall_experience_years,
      c.custom_relevant_experience_years,
      c.custom_current_salary_lpa,
      c.custom_expected_salary_lpa,
      c.offer_in_hand,
      c.variable_pay_details,
      c.rsu_details,
      c.notice_period,
      c.last_working_day,
      c.position,
      c.status,
      c.created_at,
      c.created_by AS created_by_id,
      c.created_by_name,
      c.assigned_to AS owner_id,
      c.assigned_to_name AS owner_name,
      c.updated_by_name,
      c.updated_at
     FROM candidates c
     WHERE id = ?`,
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  res.json(rows[0]);
};

/* ================= UPDATE ============== */
export const updateCandidate = async (req, res) => {
  try {
    const hrId = req.user.id;
    const hrName = req.user.name;

    const {
      first_name,
      last_name,
      email_id,
      phone_number,
      alternate_mobile_number,
      skills,
      education,
      custom_current_employer,
      custom_overall_experience_years,
      custom_relevant_experience_years,
      custom_current_salary_lpa,
      custom_expected_salary_lpa,
      offer_in_hand,
      variable_pay_details,
      rsu_details,
      notice_period,
      last_working_day,
      position,
      status
    } = req.body;

    const normalizedLastWorkingDay = normalizeDateForMysql(last_working_day);
    const normalizedEmail = String(email_id || '').trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(phone_number);
    const normalizedAlternatePhone = alternate_mobile_number
      ? normalizePhoneNumber(alternate_mobile_number)
      : null;

    if (!first_name || !String(first_name).trim()) {
      return res.status(400).json({ error: "Candidate first name is required" });
    }
    if (!email_id) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }
    if (!phone_number) {
      return res.status(400).json({ error: "Mobile number is required" });
    }
    if (!isValidPhoneNumber(phone_number)) {
      return res.status(400).json({ error: "Please enter a valid mobile number using digits only" });
    }
    if (alternate_mobile_number && !isValidPhoneNumber(alternate_mobile_number)) {
      return res.status(400).json({ error: "Please enter a valid alternate mobile number using digits only" });
    }

    await pool.query(
      `UPDATE candidates SET
        custom_first_name=?,
        custom_last_name=?,
        email_id=?,
        phone_number=?,
        alternate_mobile_number=?,
        skills=?,
        education=?,
        custom_current_employer=?,
        custom_overall_experience_years=?,
        custom_relevant_experience_years=?,
        custom_current_salary_lpa=?,
        custom_expected_salary_lpa=?,
        offer_in_hand=?,
        variable_pay_details=?,
        rsu_details=?,
        notice_period=?,
        last_working_day=?,
        position=?,
        status=?,
        updated_by=?,
        updated_by_name=?
      WHERE id=?`,
      [
        first_name,
        last_name || null,
        normalizedEmail,
        normalizedPhone || null,
        normalizedAlternatePhone,
        skills || null,
        education || null,
        custom_current_employer || null,
        custom_overall_experience_years || null,
        custom_relevant_experience_years || null,
        custom_current_salary_lpa || null,
        custom_expected_salary_lpa || null,
        offer_in_hand || null,
        variable_pay_details || null,
        rsu_details || null,
        notice_period || null,
        normalizedLastWorkingDay,
        position || null,
        status || "applied",
        hrId,
        hrName,
        req.params.id
      ],
    );

      // 🔥 Insert status log
        await pool.query(
          `
          INSERT INTO candidate_status_logs (candidate_id, hr_id, status)
          VALUES (?, ?, ?)
          `,
          [req.params.id, hrId, status || "applied"]
            );

    res.json({ success: true });
  } catch (err) {
    console.error("Update candidate error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ================= DELETE ================= */
/* ================= DELETE ================= */
export const deleteCandidate = async (req, res) => {
  try {
    // 🔐 Must be logged in
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 🔐 Only allow this email
    if (String(req.user.role || "").trim().toLowerCase() !== "hr manager") {
      return res.status(403).json({
        error: "Only HR Manager can delete candidates"
      });
    }

    const { id } = req.params;

    const [[candidate]] = await pool.query(
      `
      SELECT
        c.id,
        c.custom_first_name,
        c.custom_last_name,
        c.email_id,
        c.phone_number,
        c.status,
        c.created_by,
        c.created_by_name,
        c.assigned_to,
        c.assigned_to_name,
        u.email AS owner_email
      FROM candidates c
      LEFT JOIN users u ON u.id = c.created_by
      WHERE c.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!candidate) {
      return res.status(404).json({
        error: "Candidate not found"
      });
    }

    // 1️⃣ Delete related logs first
    await pool.query(
      "DELETE FROM candidate_status_logs WHERE candidate_id = ?",
      [id]
    );

    // 2️⃣ Then delete candidate
    await pool.query(
      "DELETE FROM candidates WHERE id = ?",
      [id]
    );

    const candidateName = [candidate.custom_first_name, candidate.custom_last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    const recipientEmail = candidate.owner_email || null;
    const deletedAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });

    if (recipientEmail) {
      try {
        await sendMailViaGraph({
          to: recipientEmail,
          subject: "Candidate deleted by HR Manager",
          html: buildCandidateDeletionEmail({
            candidateName,
            candidateEmail: candidate.email_id,
            candidatePhone: candidate.phone_number,
            candidateStatus: candidate.status,
            deletedByName: req.user.name,
            deletedAt,
          }),
        });
      } catch (mailErr) {
        console.error("Candidate deletion email failed:", mailErr.message);
      }
    } else {
      console.warn(`No owner email found for deleted candidate ${id}`);
    }

    res.json({ message: "Candidate deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting candidate" });
  }
};

// export const deleteCandidate = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // 1️⃣ Delete related logs first
//     await pool.query(
//       "DELETE FROM candidate_status_logs WHERE candidate_id = ?",
//       [id]
//     ); 

//     // 2️⃣ Then delete candidate
//     await pool.query(
//       "DELETE FROM candidates WHERE id = ?",
//       [id]
//     );

//     res.json({ message: "Candidate deleted successfully" });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error deleting candidate" });
//   }
// };

/* ================= GET REMARKS (TIMELINE) ================= */
export const getRemarks = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const [remarks] = await pool.query(
      `SELECT 
        id,
        candidate_id,
        remark_type,
        title,
        description,
        changed_fields,
        updated_by_name,
        created_at
      FROM candidate_remarks
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      LIMIT 50`,
      [candidateId]
    );

    res.json(remarks);
  } catch (err) {
    console.error("Get remarks error:", err);
    res.status(500).json({ error: "Failed to fetch remarks" });
  }
};

/* ================= ADD REMARK ================= */
export const addRemark = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { remark_type, title, description, changed_fields } = req.body;
    const { id: hrId, name: hrName } = req.user;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const [result] = await pool.query(
      `INSERT INTO candidate_remarks 
        (candidate_id, remark_type, title, description, changed_fields, created_by, created_by_name, updated_by, updated_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        candidateId,
        remark_type || 'custom',
        title,
        description || null,
        changed_fields ? JSON.stringify(changed_fields) : null,
        hrId,
        hrName,
        hrId,
        hrName
      ]
    );

    const [newRemark] = await pool.query(
      `SELECT * FROM candidate_remarks WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json(newRemark[0]);
  } catch (err) {
    console.error("Add remark error:", err);
    res.status(500).json({ error: "Failed to add remark" });
  }
};

/* ================= UPDATE REMARK ================ */
export const updateRemark = async (req, res) => {
  try {
    const { candidateId, remarkId } = req.params;
    const { title, description } = req.body;
    const { id: hrId, name: hrName } = req.user;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    await pool.query(
      `UPDATE candidate_remarks 
        SET title = ?, description = ?, updated_by = ?, updated_by_name = ?
        WHERE id = ? AND candidate_id = ?`,
      [title, description || null, hrId, hrName, remarkId, candidateId]
    );

    const [updatedRemark] = await pool.query(
      `SELECT * FROM candidate_remarks WHERE id = ?`,
      [remarkId]
    );

    if (!updatedRemark.length) {
      return res.status(404).json({ error: "Remark not found" });
    }

    res.json(updatedRemark[0]);
  } catch (err) {
    console.error("Update remark error:", err);
    res.status(500).json({ error: "Failed to update remark" });
  }
};

/* ================= GET ELIGIBLE CANDIDATES ================= */
export const getEligibleCandidates = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM candidates 
       WHERE status IN ('col_accepted', 'fol_accepted')`
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
};
