import pool from "../config/database.js"; // adjust path if needed

export const getJobs = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM jobs ORDER BY id DESC");
    res.json(rows);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

export const createJob = async (req, res) => {
  try {
    const {
      title,
      client_name,
      experience_required,
      location,
      notice_period,
      skills,
      job_description
    } = req.body;

    const normalizedTitle = String(title || "").trim();
    const normalizedClient = String(client_name || "").trim();
    const normalizedExperience = String(experience_required || "").trim();
    const normalizedLocation = String(location || "").trim();
    const normalizedNoticePeriod = String(notice_period || "").trim();
    const normalizedSkills = String(skills || "").trim();
    const normalizedJobDescription = String(job_description || "").trim();

    if (!normalizedTitle) {
      return res.status(400).json({ error: "Title is required" });
    }

    // Prevent duplicate job cards (case-insensitive, trimmed).
    // Treat title + client as one unique job definition.
    const [existing] = await pool.query(
      `SELECT id
       FROM jobs
       WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))
         AND LOWER(TRIM(COALESCE(client_name, ''))) = LOWER(TRIM(?))
       LIMIT 1`,
      [normalizedTitle, normalizedClient]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Job already exists for this client" });
    }

    const [result] = await pool.query(
      `INSERT INTO jobs 
      (title, client_name, experience_required, location, notice_period, skills, job_description)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        normalizedTitle,
        normalizedClient || null,
        normalizedExperience || null,
        normalizedLocation || null,
        normalizedNoticePeriod || null,
        normalizedSkills || null,
        normalizedJobDescription || null
      ]
    );

    res.status(201).json({ message: "Job created successfully" });
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM jobs WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job removed' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
};