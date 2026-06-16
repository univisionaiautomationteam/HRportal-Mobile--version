import pool from "../config/database.js";
import { sendMailViaGraph } from "../utils/sendMailGraph.js";


/* ================= CREATE OFFER ================= */
export const createOffer = async (req, res) => {
  try {
    const {
      candidate_id,
      position,
      salary,
      start_date,
      status,
      stage1_email,
      stage2_email,
      stage3_email
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO offers 
      (candidate_id, position, salary, start_date, status,
       stage1_email, stage2_email, stage3_email,
       current_stage, overall_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'In Progress')`,
      [
        candidate_id,
        position,
        salary,
        start_date,
        status || "fol_issued",
        stage1_email,
        stage2_email,
        stage3_email
      ]
    );

    res.status(201).json({
      message: "Offer created successfully",
      offerId: result.insertId,
    });
  } catch (error) {
    console.error("Create Offer Error:", error);
    res.status(500).json({ error: "Failed to create offer" });
  }
};

/* ================= APPROVE / REJECT WORKFLOW ================= */
//       });
//     }

//     const [rows] = await pool.query(
//       "SELECT * FROM offers WHERE id = ?",
//       [id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({
//         error: "Offer not found",
//       });
//     }

//     const offer = rows[0];

//     if (offer.overall_status !== "In Progress") {
//       return res.status(400).json({
//         error: "Workflow already completed",
//       });
//     }

//     let updates = {};
//     let nextStage = offer.current_stage;

//     /* ================= DETERMINE CURRENT STAGE ================= */

//     let stageEmailField = "";
//     let stageStatusField = "";

//     if (offer.current_stage === 1) {
//       stageEmailField = "stage1_email";
//       stageStatusField = "stage1_status";
//     } 
//     else if (offer.current_stage === 2) {
//       stageEmailField = "stage2_email";
//       stageStatusField = "stage2_status";
//     } 
//     else if (offer.current_stage === 3) {
//       stageEmailField = "stage3_email";
//       stageStatusField = "stage3_status";
//     } 
//     else {
//       return res.status(400).json({
//         error: "Invalid workflow stage",
//       });
//     }

//     /* ================= VALIDATE USER ================= */

//     if (userEmail !== offer[stageEmailField]) {
//       return res.status(403).json({
//         error: "Unauthorized action",
//       });
//     }

//     if (offer[stageStatusField] !== "Pending") {
//       return res.status(400).json({
//         error: "Stage already processed",
//       });
//     }

//     /* ================= HANDLE ACTION ================= */

//     if (action === "approve") {
//       updates[stageStatusField] = "Approved";

//           if (offer.current_stage === 1) {
//             updates.stage1_approved_by = userEmail;
//             updates.stage1_approved_at = new Date();
//           }

//           if (offer.current_stage === 2) {
//             updates.stage2_approved_by = userEmail;
//             updates.stage2_approved_at = new Date();
//           }

//           if (offer.current_stage === 3) {
//             updates.stage3_approved_by = userEmail;
//             updates.stage3_approved_at = new Date();
//           }
//     }

//     if (action === "reject") {
//       updates[stageStatusField] = "Rejected";
//       updates.overall_status = "Rejected";
//     }

//     updates.current_stage = nextStage;

//     /* ================= UPDATE DATABASE ================= */

//     const fields = Object.keys(updates);
//     const values = Object.values(updates);

//     const setQuery = fields.map((f) => `${f}=?`).join(",");

//     await pool.query(
//       `UPDATE offers SET ${setQuery} WHERE id=?`,
//       [...values, id]
//     );

//     res.json({
//       message: `Offer ${action}d successfully`,
//     });

//   } catch (error) {
//     console.error("WORKFLOW ERROR:", error);
//     res.status(500).json({
//       error: "Workflow failed",
//     });
//   }
// };
export const handleOfferAction = async (req, res) => {
  try {

    const { id } = req.params;
    const action = req.query.action || req.body.action;

    const [rows] = await pool.query(
      "SELECT * FROM offers WHERE id=?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Offer not found" });
    }

    const offer = rows[0];

    if (offer.overall_status !== "In Progress") {
      return res.status(400).json({
        error: "Workflow already completed"
      });
    }

    let updates = {};
    let stageStatusField;

    if (offer.current_stage === 1) {
      stageStatusField = "stage1_status";
    }
    else if (offer.current_stage === 2) {
      stageStatusField = "stage2_status";
    }
    else if (offer.current_stage === 3) {
      stageStatusField = "stage3_status";
    }
    else {
      return res.status(400).json({ error: "Invalid stage" });
    }

    if (offer[stageStatusField] !== "Pending") {
      return res.status(400).json({ error: "Stage already processed" });
    }

    /* ================= APPROVE ================= */

   if (action === "approve") {

  updates[stageStatusField] = "Approved";

  if (offer.current_stage === 1) {

    updates.stage1_approved_by = offer.stage1_email || "email-approval";
    updates.stage1_approved_at = new Date();
    updates.current_stage = 2;

  }

  else if (offer.current_stage === 2) {

    updates.stage2_approved_by = offer.stage2_email || "email-approval";
    updates.stage2_approved_at = new Date();
    updates.current_stage = 3;

  }

  else if (offer.current_stage === 3) {

    updates.stage3_approved_by = offer.stage3_email || "email-approval";
    updates.stage3_approved_at = new Date();
    updates.overall_status = "Approved";

  }

}

    /* ================= REJECT ================= */

    if (action === "reject") {
      updates[stageStatusField] = "Rejected";
      updates.overall_status = "Rejected";
    }

    const setQuery = Object.keys(updates)
      .map(k => `${k}=?`)
      .join(",");

    await pool.query(
      `UPDATE offers SET ${setQuery} WHERE id=?`,
      [...Object.values(updates), id]
    );

    res.send("Action completed. You can close this window.");

  } catch (err) {

    console.error("WORKFLOW ERROR:", err);

    res.status(500).json({
      error: "Workflow failed"
    });

  }
};



export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM offers WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Offer not found",
      });
    }

    await pool.query(
      "DELETE FROM offers WHERE id = ?",
      [id]
    );

    res.json({
      message: "Offer deleted successfully",
    });

  } catch (error) {
    console.error("DELETE OFFER ERROR:", error);
    res.status(500).json({
      error: "Failed to delete offer",
    });
  }
}


//     const [rows] = await pool.query(
//       "SELECT * FROM offers WHERE id = ?",
//       [id]
//     );

//     if (!rows.length)
//       return res.status(404).json({ error: "Offer not found" });

//     const offer = rows[0];

//     let updates = {};
//     let nextStage = offer.current_stage;

//     /* ===== STAGE 1 ===== */
//     if (
//       offer.current_stage === 1 &&
//       userEmail === offer.stage1_email
//     ) {
//       updates.stage1_status =
//         action === "approve" ? "Approved" : "Rejected";
//     }

//     /* ===== STAGE 2 ===== */
//     else if (
//       offer.current_stage === 2 &&
//       userEmail === offer.stage2_email
//     ) {
//       updates.stage2_status =
//         action === "approve" ? "Approved" : "Rejected";
//     }

//     /* ===== STAGE 3 ===== */
//     else if (
//       offer.current_stage === 3 &&
//       userEmail === offer.stage3_email
//     ) {
//       updates.stage3_status =
//         action === "approve" ? "Approved" : "Rejected";
//     } else {
//       return res.status(403).json({ error: "Unauthorized action" });
//     }

//     /* ===== IF REJECTED ===== */
//     if (action === "reject") {
//       updates.overall_status = "Rejected";
//     }

//     /* ===== IF APPROVED ===== */
//     if (action === "approve") {
//       if (offer.current_stage === 1 && offer.stage2_email) {
//         nextStage = 2;
//       } else if (offer.current_stage === 2 && offer.stage3_email) {
//         nextStage = 3;
//       } else {
//         updates.overall_status = "Approved";
//       }
//     }

//     updates.current_stage = nextStage;

//     const setQuery = Object.keys(updates)
//       .map((key) => `${key}=?`)
//       .join(",");

//     await pool.query(
//       `UPDATE offers SET ${setQuery} WHERE id=?`,
//       [...Object.values(updates), id]
//     );

//     res.json({
//       message: `Offer ${action}d successfully`,
//     });

//   } catch (error) {
//     console.error("Workflow Error:", error);
//     res.status(500).json({ error: "Workflow failed" });
//   }
// };
// export const handleOfferAction = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { action } = req.body;
//     const userEmail = req.user.email;

//     if (!["approve", "reject"].includes(action)) {
//       return res.status(400).json({
//         error: "Invalid action",
//       });
//     }

//     const [rows] = await pool.query(
//       "SELECT * FROM offers WHERE id = ?",
//       [id]
//     );

//     if (!rows.length) {
//       return res.status(404).json({
//         error: "Offer not found",
//       });
//     }

//     const offer = rows[0];

//     if (offer.overall_status !== "In Progress") {
//       return res.status(400).json({
//         error: "Workflow already completed",
//       });
//     }

//     let updates = {};
//     let nextStage = offer.current_stage;

//     /* ================= STAGE 1 ================= */
//     if (
//       offer.current_stage === 1 &&
//       userEmail === offer.stage1_email
//     ) {
//       updates.stage1_status =
//         action === "approve" ? "Approved" : "Rejected";
//     }

//     /* ================= STAGE 2 ================= */
//     else if (
//       offer.current_stage === 2 &&
//       userEmail === offer.stage2_email
//     ) {
//       updates.stage2_status =
//         action === "approve" ? "Approved" : "Rejected";
//     }

//     /* ================= STAGE 3 ================= */
//     else if (
//       offer.current_stage === 3 &&
//       userEmail === offer.stage3_email
//     ) {
//       updates.stage3_status =
//         action === "approve" ? "Approved" : "Rejected";
//     }

//     else {
//       return res.status(403).json({
//         error: "Unauthorized action",
//       });
//     }

//     /* ================= REJECT ================= */
//     if (action === "reject") {
//       updates.overall_status = "Rejected";
//     }

//     /* ================= APPROVE ================= */
//     if (action === "approve") {
//       if (
//         offer.current_stage === 1 &&
//         offer.stage2_email
//       ) {
//         nextStage = 2;
//       }
//       else if (
//         offer.current_stage === 2 &&
//         offer.stage3_email
//       ) {
//         nextStage = 3;
//       }
//       else {
//         updates.overall_status = "Approved";
//       }
//     }

//     updates.current_stage = nextStage;

//     const setQuery = Object.keys(updates)
//       .map((key) => `${key}=?`)
//       .join(",");

//     await pool.query(
//       `UPDATE offers SET ${setQuery} WHERE id=?`,
//       [...Object.values(updates), id]
//     );

//     res.json({
//       message: `Offer ${action}d successfully`,
//     });

//   } catch (error) {
//     console.error("WORKFLOW ERROR:", error);
//     res.status(500).json({
//       error: "Workflow failed",
//     });
//   }
// };
/* ================= GET MY PENDING OFFERS ================= */

export const getMyPendingOffers = async (req, res) => {

  try {

    const userEmail = req.user.email;

    const [rows] = await pool.query(
      `
      SELECT

        c.id AS candidate_id,
        c.custom_first_name,
        c.custom_last_name,
        c.email_id,
        c.position,
        c.custom_expected_salary_lpa AS salary,

        o.id AS offer_id,

        o.stage1_status,
        o.stage2_status,
        o.stage3_status,

        o.stage1_approved_by,
        o.stage2_approved_by,
        o.stage3_approved_by,

        o.overall_status,
        o.current_stage

      FROM offers o

      JOIN candidates c
      ON o.candidate_id = c.id

      WHERE
        (o.current_stage = 1 AND o.stage1_email = ? AND o.stage1_status = 'Pending')
        OR
        (o.current_stage = 2 AND o.stage2_email = ? AND (o.stage2_status = 'Pending' OR o.stage2_status IS NULL))
        OR
        (o.current_stage = 3 AND o.stage3_email = ? AND (o.stage3_status = 'Pending' OR o.stage3_status IS NULL))
      `,
      [userEmail, userEmail, userEmail]
    );

    res.json(rows);

  } catch (error) {

    console.error("GET PENDING OFFERS ERROR:", error);

    res.status(500).json({
      error: "Failed to fetch pending offers"
    });

  }

};


//     const userEmail = req.user.email;

//     const [rows] = await pool.query(
//       `
//       SELECT * FROM offers
//       WHERE
//         (stage1_email = ? AND stage1_status = 'Pending' AND current_stage = 1)
//       OR
//         (stage2_email = ? AND stage2_status = 'Pending' AND current_stage = 2)
//       OR
//         (stage3_email = ? AND stage3_status = 'Pending' AND current_stage = 3)
//       `,
//       [userEmail, userEmail, userEmail]
//     );

//     res.json(rows);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch pending offers" });
//   }
// };
// export const getMyPendingOffers = async (req, res) => {
//   try {

//     const userEmail = req.user.email;

//     const [rows] = await pool.query(
//       `
//       SELECT
//         c.id AS candidate_id,
//         c.custom_first_name,
//         c.custom_last_name,
//         c.email_id,
//         c.position,

//         o.id AS offer_id,
//         o.salary,
//         o.stage1_status,
//         o.stage2_status,
//         o.stage3_status,
//         o.overall_status,
//         o.current_stage

//       FROM offers o
//       JOIN candidates c
//         ON o.candidate_id = c.id

//      WHERE
//       (o.current_stage = 1 AND o.stage1_email = ? AND o.stage1_status = 'Pending')
//       OR
//       (o.current_stage = 2 AND o.stage2_email = ? AND (o.stage2_status = 'Pending' OR o.stage2_status IS NULL))
//       OR
//       (o.current_stage = 3 AND o.stage3_email = ? AND (o.stage3_status = 'Pending' OR o.stage3_status IS NULL))
//       `,
//       [userEmail, userEmail, userEmail]
//     );

//     res.json(rows);

//   } catch (error) {

//     console.error(error);

//     res.status(500).json({
//       error: "Failed to fetch pending offers"
//     });

//   }
// };
/* ================= OLD LOGIC BELOW (UNCHANGED) ================= */

export const getOffer = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM offers WHERE id = ?",
      [id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Offer not found" });

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch offer" });
  }
};

export const getOffersByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM offers WHERE candidate_id = ? ORDER BY id DESC",
      [candidateId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Fetch Offers Error:", error);
    res.status(500).json({ error: "Failed to fetch offers" });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { position, salary, start_date, status } = req.body;

    await pool.query(
      `UPDATE offers 
       SET position=?, salary=?, start_date=?, status=? 
       WHERE id=?`,
      [position, salary, start_date, status, id]
    );

    res.json({ message: "Offer updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update offer" });
  }
};
export const respondToOffer = async (req, res) => {
  try {

    const { id } = req.params;

    const response =
      req.body.response || req.query.response;

    if (!["accepted", "rejected"].includes(response)) {
      return res.status(400).json({
        error: "Invalid response"
      });
    }

    if (response === "accepted") {

      await pool.query(
        `UPDATE offers
         SET status='fol_accepted',
             offer_accepted = 1,
             offer_rejected = 0
         WHERE id=?`,
        [id]
      );

    } else {

      await pool.query(
        `UPDATE offers
         SET status='fol_rejected',
             offer_accepted = 0,
             offer_rejected = 1
         WHERE id=?`,
        [id]
      );

    }

    res.send(`
      <h1>Thank you</h1>
      <p>Your response has been recorded.</p>
    `);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to respond to offer"
    });

  }
};

//     const { id } = req.params;

//     const response =
//       req.body.response || req.query.response;

//     if (!["accepted", "rejected"].includes(response)) {
//       return res.status(400).json({ error: "Invalid response" });
//     }

//     await pool.query(
//       "UPDATE offers SET status=? WHERE id=?",
//       [
//         response === "accepted"
//           ? "fol_accepted"
//           : "fol_rejected",
//         id
//       ]
//     );

//     res.send(`
//       <h2>Thank you</h2>
//       <p>Your response has been recorded.</p>
//     `);

//   } catch (error) {

//     res.status(500).json({
//       error: "Failed to respond to offer"
//     });

//   }
// };
// export const respondToOffer = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { response } = req.body;

//     if (!["accepted", "rejected"].includes(response)) {
//       return res.status(400).json({ error: "Invalid response" });
//     }

//     await pool.query(
//       "UPDATE offers SET status=? WHERE id=?",
//       [response === "accepted" ? "fol_accepted" : "fol_rejected", id]
//     );

//     res.json({ message: `Offer ${response}` });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to respond to offer" });
//   }
// };

export const getAllOffers = async (req, res) => {
  try {
    const isGlobalScope = String(req.query?.scope || "").toLowerCase() === "global";

    if (isGlobalScope) {
      const [rows] = await pool.query(
        `
        SELECT
          c.id AS candidate_id,
          c.custom_first_name,
          c.custom_last_name,
          CONCAT(c.custom_first_name, ' ', c.custom_last_name) AS candidate_name,
          c.email_id,
          c.position,
          c.custom_expected_salary_lpa AS salary,
          c.status,
          c.updated_by_name,

          o.id AS offer_id,
          o.id,
          o.current_stage,
          o.overall_status,
          o.stage1_status,
          o.stage2_status,
          o.stage3_status,
          o.stage1_approved_by,
          o.stage2_approved_by,
          o.stage3_approved_by,
          o.offer_accepted,
          o.offer_rejected,
          o.created_by,
          o.created_at AS offer_created_at,
          o.updated_at AS offer_updated_at
        FROM offers o
        INNER JOIN candidates c ON o.candidate_id = c.id
        ORDER BY o.updated_at DESC
        LIMIT 5000
        `
      );

      return res.json(rows);
    }

    const userEmail = req.user.email;
    const userName = req.user.name; // HR name stored in candidates.updated_by_name

    const [rows] = await pool.query(
      `
      SELECT
        c.id AS candidate_id,
        c.custom_first_name,
        c.custom_last_name,
        CONCAT(c.custom_first_name, ' ', c.custom_last_name) AS candidate_name,
        c.email_id,
        c.position,
        c.custom_expected_salary_lpa AS salary,

        c.status,
        c.updated_by_name,

        o.id AS offer_id,
        o.current_stage,
        o.overall_status,

        o.stage1_status,
        o.stage2_status,
        o.stage3_status,

        o.stage1_approved_by,
        o.stage2_approved_by,
        o.stage3_approved_by,

        o.offer_accepted,
        o.offer_rejected,

        o.created_by,
        o.created_at AS offer_created_at,
        o.updated_at AS offer_updated_at

      FROM candidates c

      LEFT JOIN offers o
      ON o.candidate_id = c.id
        WHERE
          c.status IN ('col_accepted','fol_accepted')
          AND (
                o.created_by = ?
                OR LOWER(o.stage3_approved_by) = LOWER(?)
                OR (o.id IS NULL AND c.updated_by_name = ?)
              )

        ORDER BY c.updated_at DESC
        `,
        [userEmail, userEmail, userName]
    );

    res.json(rows);

  } catch (error) {

    console.error("GET OFFERS ERROR:", error);

    res.status(500).json({
      error: "Failed to fetch offers"
    });

  }
};

//   try {

//     const userEmail = req.user.email;

//     const [rows] = await pool.query(

//       `
//       SELECT
//         c.id AS candidate_id,
//         c.custom_first_name,
//         c.custom_last_name,
//         c.email_id,
//         c.position,
//         c.custom_expected_salary_lpa AS salary,

//         o.id AS offer_id,

//         COALESCE(o.stage1_status,'-') AS stage1_status,
//         COALESCE(o.stage2_status,'-') AS stage2_status,
//         COALESCE(o.stage3_status,'-') AS stage3_status,

//         o.stage1_approved_by,
//         o.stage2_approved_by,
//         o.stage3_approved_by,

//         COALESCE(o.overall_status,'Not Started') AS overall_status,
//         o.current_stage,
//         o.created_by

//       FROM offers o

//       JOIN candidates c
//       ON c.id = o.candidate_id

//       WHERE o.created_by = ?

//       ORDER BY o.updated_at DESC
//       `,
//       [userEmail]
//     );

//     res.json(rows);

//   } catch (error) {

//     console.error("GET OFFERS ERROR:", error);

//     res.status(500).json({
//       error: "Failed to fetch offers"
//     });

//   }

// };

// export const getAllOffers = async (req, res) => {
//   try {

//     const userEmail = req.user.email;
//     const role = req.user.role;

//     let query;
//     let params = [];

//     if (role === "Admin") {

//       query = `
//         SELECT
//           c.id AS candidate_id,
//           c.custom_first_name,
//           c.custom_last_name,
//           c.email_id,
//           c.position,
//           c.status AS candidate_status,

//           o.id AS offer_id,

//           /* salary from candidates table */
//           c.custom_expected_salary_lpa AS salary,

//           COALESCE(o.stage1_status,'-') AS stage1_status,
//           COALESCE(o.stage2_status,'-') AS stage2_status,
//           COALESCE(o.stage3_status,'-') AS stage3_status,

//           o.stage1_approved_by,
//           o.stage2_approved_by,
//           o.stage3_approved_by,

//           COALESCE(o.overall_status,'Not Started') AS overall_status,

//           o.current_stage,
//           o.created_by

//         FROM candidates c
//         LEFT JOIN offers o ON c.id = o.candidate_id

//         WHERE c.status IN ('col_accepted','fol_accepted')

//         ORDER BY c.updated_at DESC
//       `;

//     } else {

//       query = `
//         SELECT
//           c.id AS candidate_id,
//           c.custom_first_name,
//           c.custom_last_name,
//           c.email_id,
//           c.position,
//           c.status AS candidate_status,

//           o.id AS offer_id,

//           /* salary from candidates table */
//           c.custom_expected_salary_lpa AS salary,

//           COALESCE(o.stage1_status,'-') AS stage1_status,
//           COALESCE(o.stage2_status,'-') AS stage2_status,
//           COALESCE(o.stage3_status,'-') AS stage3_status,

//           o.stage1_approved_by,
//           o.stage2_approved_by,
//           o.stage3_approved_by,

//           COALESCE(o.overall_status,'Not Started') AS overall_status,

//           o.current_stage,
//           o.created_by

//         FROM candidates c
//         LEFT JOIN offers o 
//           ON c.id = o.candidate_id

//         WHERE 
//           c.status IN ('col_accepted','fol_accepted')
//           AND (
//             o.created_by = ?
//             OR o.id IS NULL
//           )

//         ORDER BY c.updated_at DESC
//       `;

//       params = [userEmail];

//     }

//     const [rows] = await pool.query(query, params);

//     res.json(rows);

//   } catch (error) {

//     console.error("GET OFFERS ERROR:", error);

//     res.status(500).json({
//       error: "Failed to fetch offers"
//     });

//   }
// };

// export const getAllOffers = async (req, res) => {
//   try {

//     const userEmail = req.user.email;
//     const role = req.user.role;

//     let query;
//     let params = [];

//     if (role === "Admin") {

//       query = `
//         SELECT
//           c.id AS candidate_id,
//           c.custom_first_name,
//           c.custom_last_name,
//           c.email_id,
//           c.position,
//           c.status AS candidate_status,

//           o.id AS offer_id,
//           o.salary,

//           COALESCE(o.stage1_status,'-') AS stage1_status,
//           COALESCE(o.stage2_status,'-') AS stage2_status,
//           COALESCE(o.stage3_status,'-') AS stage3_status,

//           o.stage1_approved_by,
//           o.stage2_approved_by,
//           o.stage3_approved_by,

//           COALESCE(o.overall_status,'Not Started') AS overall_status,

//           o.current_stage,
//           o.created_by

//         FROM candidates c
//        LEFT JOIN offers o ON c.id = o.candidate_id
//         WHERE c.status IN ('col_accepted','fol_accepted')

//         ORDER BY c.updated_at DESC
//       `;

//     } else {

//       query = `
//         SELECT
//           c.id AS candidate_id,
//           c.custom_first_name,
//           c.custom_last_name,
//           c.email_id,
//           c.position,
//           c.status AS candidate_status,

//           o.id AS offer_id,
//           o.salary,

//           COALESCE(o.stage1_status,'-') AS stage1_status,
//           COALESCE(o.stage2_status,'-') AS stage2_status,
//           COALESCE(o.stage3_status,'-') AS stage3_status,

//           o.stage1_approved_by,
//           o.stage2_approved_by,
//           o.stage3_approved_by,

//           COALESCE(o.overall_status,'Not Started') AS overall_status,

//           o.current_stage,
//           o.created_by

//         FROM candidates c
//         LEFT JOIN offers o 
//           ON c.id = o.candidate_id

//         WHERE 
//           c.status IN ('col_accepted','fol_accepted')
//           AND (
//             o.created_by = ?
//             OR o.id IS NULL
//           )

//         ORDER BY c.updated_at DESC
//       `;

//       params = [userEmail];

//     }

//     const [rows] = await pool.query(query, params);

//     res.json(rows);

//   } catch (error) {

//     console.error("GET OFFERS ERROR:", error);

//     res.status(500).json({
//       error: "Failed to fetch offers"
//     });

//   }
// };

// export const getAllOffers = async (req, res) => {
//   try {

//     const userEmail = req.user.email;
//     const role = req.user.role;

//     let query;
//     let params = [];

//     if (role === "Admin") {

//       query = `
//         SELECT
//           c.id As candidate_id,
//           c.custom_first_name,
//           c.custom_last_name,
//           c.email_id,
//           c.position,
//           c.status as candidate_status,

//           o.id,
//           o.salary,
//           o.stage1_status,
//           o.stage2_status,
//           o.stage3_status,
//           o.stage1_approved_by,
//           o.stage2_approved_by,
//           o.stage3_approved_by,
//           o.overall_status,
//           o.current_stage,
//           o.created_by

//         FROM candidates c
//         LEFT JOIN offers o ON c.id = o.candidate_id

//         WHERE c.status IN ('col_accepted', 'fol_accepted')

//         ORDER BY c.updated_at DESC
//       `;

//     } else {

//       query = `
//         SELECT
//           c.id as candidate_id,
//           c.custom_first_name,
//           c.custom_last_name,
//           c.email_id,
//           c.position,
//           c.status as candidate_status,

//           o.id,
//           o.salary,
//           o.stage1_status,
//           o.stage2_status,
//           o.stage3_status,
//           o.stage1_approved_by,
//           o.stage2_approved_by,
//           o.stage3_approved_by,
//           o.overall_status,
//           o.current_stage,
//           o.created_by

//         FROM candidates c
//         LEFT JOIN offers o ON c.id = o.candidate_id

//         WHERE 
//           c.status IN ('col_accepted', 'fol_accepted')
//           AND (
//             o.created_by = ?
//             OR o.id IS NULL
//           )

//         ORDER BY c.updated_at DESC
//       `;

//       params = [userEmail];

//     }

//     const [rows] = await pool.query(query, params);

//     res.json(rows);

//   } catch (error) {

//     console.error(error);

//     res.status(500).json({
//       error: "Failed to fetch offers"
//     });

//   }
// };


// export const getAllOffers = async (req, res) => {
//   try {

//     const userEmail = req.user.email;
//     const role = req.user.role;

//     let query;
//     let params = [];

//     if (role === "Admin") {

//       query = `
//         SELECT
//           c.id AS candidate_id,
//           c.custom_first_name,
//           c.custom_last_name,
//           c.email_id,
//           c.position,

//           c.custom_expected_salary_lpa AS salary,

//           o.id AS offer_id,

//           COALESCE(o.stage1_status,'-') AS stage1_status,
//           COALESCE(o.stage2_status,'-') AS stage2_status,
//           COALESCE(o.stage3_status,'-') AS stage3_status,

//           o.stage1_approved_by,
//           o.stage2_approved_by,
//           o.stage3_approved_by,

//           COALESCE(o.overall_status,'Not Started') AS overall_status,

//           o.current_stage,
//           o.created_by

//         FROM candidates c
//         LEFT JOIN offers o
//         ON c.id = o.candidate_id

//         WHERE c.status IN ('col_accepted','fol_accepted')

//         ORDER BY c.updated_at DESC
//       `;

//     } else {

//       query = `
//         SELECT
//           c.id AS candidate_id,
//           c.custom_first_name,
//           c.custom_last_name,
//           c.email_id,
//           c.position,

//           c.custom_expected_salary_lpa AS salary,

//           o.id AS offer_id,

//           COALESCE(o.stage1_status,'-') AS stage1_status,
//           COALESCE(o.stage2_status,'-') AS stage2_status,
//           COALESCE(o.stage3_status,'-') AS stage3_status,

//           o.stage1_approved_by,
//           o.stage2_approved_by,
//           o.stage3_approved_by,

//           COALESCE(o.overall_status,'Not Started') AS overall_status,

//           o.current_stage,
//           o.created_by

//         FROM candidates c
//         LEFT JOIN offers o
//         ON c.id = o.candidate_id

//         WHERE
//           c.status IN ('col_accepted','fol_accepted')
//           AND (o.created_by = ? OR o.id IS NULL)

//         ORDER BY c.updated_at DESC
//       `;

//       params = [userEmail];

//     }

//     const [rows] = await pool.query(query, params);

//     res.json(rows);

//   } catch (error) {

//     console.error("GET OFFERS ERROR:", error);

//     res.status(500).json({
//       error: "Failed to fetch offers"
//     });

//   }
// };


export const assignNextStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { nextEmail } = req.body;

    if (!nextEmail) {
      return res.status(400).json({
        error: "Next stage email required",
      });
    }

    const [rows] = await pool.query(
      "SELECT * FROM offers WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "Offer not found",
      });
    }

    const offer = rows[0];

    let updates = {};

    // HR assigning Stage 1 first time
    if (!offer.stage1_email) {

        updates.stage1_email = nextEmail;
        updates.stage1_status = "Pending";
        updates.current_stage = 1;

      }

      else if (offer.current_stage === 2 && !offer.stage2_email) {

        updates.stage2_email = nextEmail;
        updates.stage2_status = "Pending";
        updates.current_stage = 2;

      }

      else if (offer.current_stage === 3 && !offer.stage3_email) {

        updates.stage3_email = nextEmail;
        updates.stage3_status = "Pending";
        updates.current_stage = 3;

      }

      else {

        return res.status(400).json({
          error: "Stage already assigned or waiting approval"
        });

      }

    const setQuery = Object.keys(updates)
      .map((key) => `${key}=?`)
      .join(",");

    await pool.query(
      `UPDATE offers SET ${setQuery} WHERE id=?`,
      [...Object.values(updates), id]
    );

    res.json({
      message: "Stage assigned successfully",
    });

  } catch (error) {
    console.error("ASSIGN ERROR:", error);
    res.status(500).json({
      error: "Stage assignment failed",
    });
  }
};

//   try {
//     await connection.beginTransaction();

//     const { id } = req.params;
//     const { nextEmail, cc, subject, body } = req.body;
//     const { candidate_id } = req.body;

//     if (!candidate_id) {
//   return res.status(400).json({
//     error: "candidate_id is required"
//   });
// }

//     if (!nextEmail) {
//       return res.status(400).json({
//         error: "Email required",
//       });
//     }

//     /* ================= FIND OR CREATE OFFER ================= */

//     let [rows] = await connection.query(
//       "SELECT * FROM offers WHERE id=?",
//       [id]
//     );

//     let offer;

//     if (!rows.length) {

//       // create offer automatically if not exists
//       const [result] = await connection.query(
//         `INSERT INTO offers 
//         (candidate_id, current_stage, overall_status)
//         VALUES (?,1,'In Progress')`,
//         [candidate_id]
//       );

//       const [newOffer] = await connection.query(
//         "SELECT * FROM offers WHERE id=?",
//         [result.insertId]
//       );

//       offer = newOffer[0];

//     } else {

//       offer = rows[0];

//     }

//     /* ================= FILE ATTACHMENT ================= */

//     let attachments = [];

//     if (req.file) {
//       attachments.push({
//         "@odata.type": "#microsoft.graph.fileAttachment",
//         name: req.file.originalname,
//         contentBytes: Buffer.from(req.file.buffer).toString("base64"),
//       });
//     }

//     /* ================= DETERMINE STAGE ================= */

//     let updates = {
//       created_by: req.user.email,
//       // updated_by: req.user.email,
//     };

//     if (!offer.stage1_email) {

//       updates.stage1_email = nextEmail;
//       updates.stage1_status = "Pending";
//       updates.current_stage = 1;

//     }
//     else if (offer.stage1_status === "Approved" && !offer.stage2_email) {

//       updates.stage2_email = nextEmail;
//       updates.stage2_status = "Pending";
//       updates.current_stage = 2;

//     }
//     else if (offer.stage2_status === "Approved" && !offer.stage3_email) {

//       updates.stage3_email = nextEmail;
//       updates.stage3_status = "Pending";
//       updates.current_stage = 3;

//     }
//     else {

//       return res.status(400).json({
//         error: "Invalid stage assignment",
//       });

//     }

//     /* ================= UPDATE OFFER ================= */

//     const setQuery = Object.keys(updates)
//       .map((key) => `${key}=?`)
//       .join(",");

//     await connection.query(
//       `UPDATE offers SET ${setQuery} WHERE id=?`,
//       [...Object.values(updates), offer.id]
//     );

//     /* ================= SEND EMAIL ================= */

//    const approveUrl = `http://localhost:5000/api/offers/${offer.id}/action?action=approve`;
// const rejectUrl = `http://localhost:5000/api/offers/${offer.id}/action?action=reject`;

// const htmlBody = `
// <p>${body}</p>

// <br/>

// <a href="${approveUrl}"
// style="padding:10px 20px;background:#28a745;color:white;text-decoration:none;border-radius:5px;">
// Approve Offer
// </a>

// &nbsp;

// <a href="${rejectUrl}"
// style="padding:10px 20px;background:#dc3545;color:white;text-decoration:none;border-radius:5px;">
// Reject Offer
// </a>

// <br/><br/>

// <p>HR Portal Workflow</p>
// `;

// await sendMailViaGraph({
//   to: nextEmail,
//   cc: cc ? cc.split(",").map(e => e.trim()) : [],
//   subject,
//   html: htmlBody,
//   attachments
// });

//     await connection.commit();

//     res.json({
//       message: "Mail sent & stage assigned",
//     });

//   } catch (error) {

//     await connection.rollback();

//     console.error("MAIL WORKFLOW ERROR:", error);

//     res.status(500).json({
//       error: "Workflow failed",
//     });

//   } finally {

//     connection.release();

//   }

//   console.log("BODY:", req.body);
//   console.log("FILE:", req.file);
// };
export const workflowMailAndAssign = async (req, res) => {

  const connection = await pool.getConnection();

  try {

    await connection.beginTransaction();

    const { id } = req.params;
    const { nextEmail, cc, subject, body, candidate_id } = req.body;

    if (!candidate_id) {
      return res.status(400).json({
        error: "candidate_id is required"
      });
    }

    if (!nextEmail) {
      return res.status(400).json({
        error: "Next stage email required"
      });
    }

    /* ================= FIND EXISTING OFFER ================= */

   const [rows] = await connection.query(
  "SELECT * FROM offers WHERE candidate_id=?",
  [candidate_id]
);

let offer;

if (!rows.length) {

  const [result] = await connection.query(
    `INSERT INTO offers (candidate_id,current_stage,overall_status)
     VALUES (?,1,'In Progress')`,
    [candidate_id]
  );

  const [newRow] = await connection.query(
    "SELECT * FROM offers WHERE id=?",
    [result.insertId]
  );

  offer = newRow[0];

} else {

  offer = rows[0];

}
    /* ================= FILE ATTACHMENT ================= */

    let attachments = [];

    if (req.file) {
      attachments.push({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: req.file.originalname,
        contentBytes: Buffer.from(req.file.buffer).toString("base64"),
      });
    }

    /* ================= DETERMINE STAGE ================= */

    let updates = {
      created_by: req.user.email
    };

    /* ===== STAGE 1 ===== */

    if (!offer.stage1_email) {

      updates.stage1_email = nextEmail;
      updates.stage1_status = "Pending";
      updates.current_stage = 1;

    }

    /* ===== STAGE 2 ===== */

    else if (offer.stage1_status === "Approved" && !offer.stage2_email) {

      updates.stage2_email = nextEmail;
      updates.stage2_status = "Pending";
      updates.current_stage = 2;

    }

    /* ===== STAGE 3 ===== */

    else if (offer.stage2_status === "Approved" && !offer.stage3_email) {

      updates.stage3_email = nextEmail;
      updates.stage3_status = "Pending";
      updates.current_stage = 3;

    }

    else {

      return res.status(400).json({
        error: "Invalid stage assignment"
      });

    }

    /* ================= UPDATE OFFER ================= */

    const setQuery = Object.keys(updates)
      .map(key => `${key}=?`)
      .join(",");

    await connection.query(
      `UPDATE offers SET ${setQuery} WHERE id=?`,
      [...Object.values(updates), offer.id]
    );

    /* ================= EMAIL LINKS ================= */

    const approveUrl =
      `https://d3akj83x87be4b.cloudfront.net/api/offers/${offer.id}/action?action=approve`;

    const rejectUrl =
      `https://d3akj83x87be4b.cloudfront.net/api/offers/${offer.id}/action?action=reject`;

    const htmlBody = `
      <p>${body}</p>
 
      <br/>

      <a href="${approveUrl}"
      style="padding:10px 20px;background:#28a745;color:white;text-decoration:none;border-radius:5px;">
      Approve Offer
      </a>

      &nbsp;

      <a href="${rejectUrl}"
      style="padding:10px 20px;background:#dc3545;color:white;text-decoration:none;border-radius:5px;">
      Reject Offer
      </a>

      <br/><br/>

      <p>HR Portal Workflow</p>
    `;

    /* ================= SEND MAIL ================= */

    await sendMailViaGraph({
      to: nextEmail,
      cc: cc ? cc.split(",").map(e => e.trim()) : [],
      subject,
      html: htmlBody,
      attachments
    });

    await connection.commit();

    res.json({
      message: "Mail sent & stage assigned successfully"
    });

  }
  catch (error) {

    await connection.rollback();

    console.error("MAIL WORKFLOW ERROR:", error);

    res.status(500).json({
      error: "Workflow failed"
    });

  }
  finally {

    connection.release();

  }

};

export const getAcceptedByMe = async (req, res) => {

  try {

    const userEmail = req.user.email;

    const [rows] = await pool.query(
      `
      SELECT 
        o.id AS offer_id,
        o.candidate_id,

        o.stage1_status,
        o.stage2_status,
        o.stage3_status,

        o.stage1_approved_by,
        o.stage2_approved_by,
        o.stage3_approved_by,

        o.offer_accepted,
        o.offer_rejected,

        o.overall_status,
        o.current_stage,

        c.custom_expected_salary_lpa AS salary,
        c.custom_first_name,
        c.custom_last_name,
        c.email_id,
        c.position

      FROM offers o

      LEFT JOIN candidates c
      ON o.candidate_id = c.id

      WHERE
        LOWER(o.stage1_approved_by) = LOWER(?)
        OR LOWER(o.stage2_approved_by) = LOWER(?)
        OR LOWER(o.stage3_approved_by) = LOWER(?)

      ORDER BY o.updated_at DESC
      `,
      [userEmail, userEmail, userEmail]
    );

    res.json(rows);

  } catch (error) {

    console.error("GET ACCEPTED OFFERS ERROR:", error);

    res.status(500).json({
      error: "Failed to fetch accepted offers"
    });

  }

};

//   try {

//     const userEmail = req.user.email;

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         o.id AS offer_id,
//         o.candidate_id,

//         o.stage1_status,
//         o.stage2_status,
//         o.stage3_status,

//         o.stage1_approved_by,
//         o.stage2_approved_by,
//         o.stage3_approved_by,

//         o.overall_status,
//         o.current_stage,

//         c.custom_expected_salary_lpa AS salary,
//         c.custom_first_name,
//         c.custom_last_name,
//         c.email_id,
//         c.position

//       FROM offers o

//       LEFT JOIN candidates c
//       ON o.candidate_id = c.id

//       WHERE
//         LOWER(o.stage1_approved_by) = LOWER(?)
//         OR LOWER(o.stage2_approved_by) = LOWER(?)
//         OR LOWER(o.stage3_approved_by) = LOWER(?)

//       ORDER BY o.updated_at DESC
//       `,
//       [userEmail, userEmail, userEmail]
//     );

//     res.json(rows);

//   } catch (error) {

//     console.error("GET ACCEPTED OFFERS ERROR:", error);

//     res.status(500).json({
//       error: "Failed to fetch accepted offers"
//     });

//   }

// };


export const deleteOfferWorkflow = async (req, res) => {

  const { id } = req.params;

  try {

    const [result] = await pool.query(
      "DELETE FROM offers WHERE id = ? OR candidate_id = ?",
      [id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Workflow not found"
      });
    }

    res.json({
      message: "Workflow deleted successfully"
    });

  } catch (error) {

    console.error("Delete workflow error:", error);

    res.status(500).json({
      error: "Delete failed"
    });

  }

};
export const sendOfferLetter = async (req, res) => {

  try {

   const { to, cc, subject, body, offer_id, id } = req.body;

    const offerId = offer_id || id;

    if (!to) {
      return res.status(400).json({
        error: "Recipient email required"
      });
    }

    /* ================= FILE ATTACHMENT ================= */

    let attachments = [];

    if (req.file) {
      attachments.push({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: req.file.originalname,
        contentBytes: Buffer.from(req.file.buffer).toString("base64"),
      });
    }

    /* ================= ACCEPT / REJECT LINKS ================= */

    const acceptUrl =
`https://d3akj83x87be4b.cloudfront.net/api/offers/${offerId}/respond?response=accepted`;

const rejectUrl =
`https://d3akj83x87be4b.cloudfront.net/api/offers/${offerId}/respond?response=rejected`;

    const htmlBody = `
      <p>${body}</p>

      <br/>

      <a href="${acceptUrl}"
      style="padding:12px 22px;background:#16a34a;color:white;text-decoration:none;border-radius:6px;">
      Accept Offer
      </a>

      &nbsp;&nbsp;

      <a href="${rejectUrl}"
      style="padding:12px 22px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;">
      Reject Offer
      </a>

      <br/><br/>

      <p>Please respond using the buttons above.</p>
    `;

    /* ================= SEND MAIL ================= */

    await sendMailViaGraph({
      to,
      cc: cc ? cc.split(",").map(e => e.trim()) : [],
      subject,
      html: htmlBody,
      attachments
    });

    /* ================= UPDATE DB ================= */

   await pool.query(
    `UPDATE offers SET email_sent_at = NOW() WHERE id = ?`,
    [offerId]
    );

    res.json({
      message: "Offer letter sent successfully"
    });

  } catch (error) {

    console.error("SEND OFFER LETTER ERROR:", error);

    res.status(500).json({
      error: "Failed to send offer letter"
    });

  }

};

// try{

//         const userEmail = req.user.email;

//         const [rows] = await pool.query(`
//         SELECT *
//         FROM offers
//         WHERE
//         stage1_approved_by = ?
//         OR stage2_approved_by = ?
//         OR stage3_approved_by = ?
//         `,[userEmail,userEmail,userEmail]);

//         res.json(rows);

//         }catch(err){
//         res.status(500).json({error:"Failed"});
//         }
//   };
