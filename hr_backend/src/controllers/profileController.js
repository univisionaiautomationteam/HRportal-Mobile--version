import pool from "../config/database.js";

export const getStatusActivity = async (req, res) => {
  try {
    const hrId = req.user.id;

    const [rows] = await pool.query(
      `
      SELECT
        sal.id,
        sal.status,
        sal.created_at,
        c.custom_first_name AS first_name,
        c.custom_last_name AS last_name
      FROM candidate_status_logs sal
      JOIN (
          SELECT candidate_id, MAX(created_at) AS latest
          FROM candidate_status_logs
          GROUP BY candidate_id
      ) latest_logs
        ON sal.candidate_id = latest_logs.candidate_id
        AND sal.created_at = latest_logs.latest
      JOIN candidates c ON c.id = sal.candidate_id
      WHERE sal.hr_id = ?
      ORDER BY sal.created_at DESC
      `,
      [hrId]
    );

    res.json(rows);

  } catch (err) {
    console.error("getStatusActivity error:", err);
    res.status(500).json({ error: "Failed to fetch status activity" });
  }
};

// import pool from "../config/database.js";

// export const getStatusActivity = async (req, res) => {
//   try {
//     const hrId = req.user.id;

//     const [rows] = await pool.query(
//       `
//       SELECT
//         sal.id,
//         sal.action AS status,
//         sal.created_at,
//         c.custom_first_name AS first_name,
//         c.custom_last_name AS last_name
//       FROM status_activity_logs sal
//       JOIN candidates c ON c.id = sal.candidate_id
//       WHERE sal.performed_by = ?
//       ORDER BY sal.created_at DESC
//       `,
//       [hrId]
//     );

//     res.json(rows);
//   } catch (err) {
//     console.error("getStatusActivity error:", err);
//     res.status(500).json({ error: "Failed to fetch status activity" });
//   }
// };
