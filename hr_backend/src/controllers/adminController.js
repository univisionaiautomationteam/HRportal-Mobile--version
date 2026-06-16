import db from "../config/database.js";

export const adminLogin = (req, res) => {
  const { username, password } = req.body;
  if (username === "Univision" && password === "Univision@123") {
    return res.json({ success: true });
  }
  res.status(401).json({ message: "Invalid credentials" });
};

export const addUser = async (req, res) => {
  const { name, email, role } = req.body;

  await db.query(
    "INSERT INTO users (name, email, role) VALUES (?, ?, ?)",
    [name, email, role]
  );

  res.json({ message: "User added successfully" });
};

export const getUsers = async (req, res) => {
  const [users] = await db.query(
    "SELECT id, name, email, role FROM users"
  );
  res.json(users);
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;

  // Fetch current name before updating
  const [[existing]] = await db.query("SELECT name FROM users WHERE id = ?", [id]);

  await db.query(
    "UPDATE users SET name=?, email=?, role=? WHERE id=?",
    [name, email, role, id]
  );

  // If name changed, cascade update all snapshot name columns so old records reflect the new name
  if (existing && existing.name !== name) {
    await db.query("UPDATE candidates SET created_by_name = ? WHERE created_by = ?", [name, id]);
    await db.query("UPDATE candidates SET updated_by_name = ? WHERE updated_by = ?", [name, id]);
    await db.query("UPDATE candidates SET assigned_to_name = ? WHERE assigned_to = ?", [name, id]);
    await db.query("UPDATE candidate_remarks SET created_by_name = ? WHERE created_by = ?", [name, id]);
    await db.query("UPDATE candidate_remarks SET updated_by_name = ? WHERE updated_by = ?", [name, id]);
    await db.query("UPDATE resume_versions SET updated_by_name = ? WHERE updated_by = ?", [name, id]);
  }

  res.json({ message: "User updated" });
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  // 1️⃣ Reassign candidate updates to SYSTEM user
  await db.query(
    "UPDATE candidates SET updated_by = 0 WHERE updated_by = ?",
    [id]
  );

  // 2️⃣ Now safely delete user
  await db.query(
    "DELETE FROM users WHERE id = ?",
    [id]
  );

  res.json({ message: "User deleted successfully" });
};

// export const deleteUser = async (req, res) => {
//   const { id } = req.params;

//   await db.query("DELETE FROM users WHERE id=?", [id]);
//   res.json({ message: "User deleted" });
// };


// import pool from "../config/database.js";

// // ADD HR USER
// export const addUser = async (req, res) => {
//   const { name, email, role } = req.body;
//

//   if (!email) {
//     return res.status(400).json({ message: "Email is required" });
//   }

//   try {
//     const [result] = await pool.query(
//       `INSERT INTO users (name, email, role, two_factor_enabled)
//        VALUES (?, ?, ?, 0)`,
//       [name || null, email, role || "HR"]
//     );

//     res.json({
//       message: "User added successfully",
//       userId: result.insertId
//     });

//   } catch (err) {
//     if (err.code === "ER_DUP_ENTRY") {
//       return res.status(409).json({ message: "User already exists" });
//     }
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
