import pool from "../config/database.js";

/* ================= GET WORKFLOW EMAILS ================= */

export const getWorkflowEmails = async (req, res) => {
  try {

    const [rows] = await pool.query(
      "SELECT * FROM workflow_emails ORDER BY stage"
    );

    res.json(rows);

  } catch (error) {

    console.error("Fetch workflow emails error:", error);

    res.status(500).json({
      error: "Failed to fetch workflow emails"
    });

  }
};


/* ================= SAVE WORKFLOW EMAILS ================= */

export const saveWorkflowEmails = async (req, res) => {

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const data = req.body;

    await connection.query("DELETE FROM workflow_emails");

    for (const stage in data) {

      for (const email of data[stage]) {

        if (email && email.trim() !== "") {

          await connection.query(
            "INSERT INTO workflow_emails (stage,email) VALUES (?,?)",
            [stage, email]
          );

        }

      }

    }

    await connection.commit();

    res.json({
      message: "Workflow emails saved successfully"
    });

  } catch (error) {

    await connection.rollback();

    console.error("Save workflow emails error:", error);

    res.status(500).json({
      error: "Failed to save workflow emails"
    });

  } finally {

    connection.release();

  }

};