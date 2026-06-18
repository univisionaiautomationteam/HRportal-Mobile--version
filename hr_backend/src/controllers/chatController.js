import { getAllCandidatesInternal } from "./candidateController.js";
import pool from "../config/database.js";
let lastResult = null;


const stopWords = [
  "give","me","all","details","about","show",
  "info","data","of","the","candidates","candidate",
  "list","out","show","get","fetch"
];

export const handleChat = async (req, res) => {
  try {
    const { query } = req.body;

    const data = await getAllCandidatesInternal();

    if (!data || data.length === 0) {
      return res.json("No data in DB");
    }
const q = (query || "").toLowerCase();
const words = q.split(" ");

const filteredWords = words.filter(
  w => !stopWords.includes(w)
);

// 👉 STATUS DETECTION (NEW 🔥)
let detectedStatus = null;

// get all statuses from DB
const [statusRows] = await pool.query(`
  SELECT DISTINCT LOWER(status) as status FROM candidates
`);

for (let s of statusRows) {
  const dbStatus = s.status.toLowerCase();
const normalizedStatus = dbStatus.replace("_", " ");

if (
  q.includes(dbStatus) ||          // l1_scheduled ✅
  q.includes(normalizedStatus)     // l1 scheduled ✅
) {
  detectedStatus = dbStatus;
  break;
}
}

// 🔥 keyword detection
const isWeek =
  q.includes("week") || q.includes("wekk") || q.includes("weak");

const isMonth = q.includes("month");

const isCandidate =
  q.includes("candidate") ||
  q.includes("candidates") ||
  q.includes("cand");

const isOffer = q.includes("offer");

  // 👉DELETE
if (q.includes("delete") || q.includes("remove")) {



  const target = words.find(
    w => !stopWords.includes(w) && w !== "delete" && w !== "remove"
  );

  if (!target) {
    return res.json("❌ Please mention name or ID to delete");
  }

  // 👉 DELETE BY ID
  if (!isNaN(target)) {
    const [result] = await pool.query(`
      DELETE FROM candidates
      WHERE id = ?
    `, [target]);

    if (result.affectedRows === 0) {
      return res.json("❌ No candidate found with this ID");
    }

    return res.json(`🗑️ Candidate with ID ${target} permanently deleted`);
  }

  // 👉 DELETE BY NAME
  const [result] = await pool.query(`
    DELETE FROM candidates
    WHERE LOWER(custom_first_name) LIKE ?
  `, [`%${target}%`]);

  if (result.affectedRows === 0) {
    return res.json("❌ No candidate found to delete");
  }

  return res.json(`🗑️ Candidate "${target}" permanently deleted`);
}

if (q.includes("year") || q.includes("experience")) {

  const num = parseInt(q.match(/\d+/));

  if (!num) {
    return res.json("Please mention experience like '2 years'");
  }

  // 👉 DB roles fetch
  const [rolesData] = await pool.query(`
    SELECT DISTINCT LOWER(position) as role FROM candidates
  `);

  let role = "";

  // 👉 match user query with DB roles
  for (let r of rolesData) {
    if (q.includes(r.role)) {
      role = r.role;
      break;
    }
  }

  let rows;

  // 👉 EXACT
  if (q.includes("exact") || q.includes("only")) {

    if (role) {
      [rows] = await pool.query(`
        SELECT *
        FROM candidates
        WHERE CAST(custom_overall_experience_years AS UNSIGNED) = ?
        AND LOWER(position) LIKE ?
      `, [num, `%${role}%`]);
    } else {
      [rows] = await pool.query(`
        SELECT *
        FROM candidates
        WHERE CAST(custom_overall_experience_years AS UNSIGNED) = ?
      `, [num]);
    }

  } else {

    // 👉 >=
    if (role) {
      [rows] = await pool.query(`
        SELECT *
        FROM candidates
        WHERE CAST(custom_overall_experience_years AS UNSIGNED) >= ?
        AND LOWER(position) LIKE ?
      `, [num, `%${role}%`]);
    } else {
      [rows] = await pool.query(`
        SELECT *
        FROM candidates
        WHERE CAST(custom_overall_experience_years AS UNSIGNED) >= ?
      `, [num]);
    }

  }

  if (rows.length === 0) {
    return res.json("No candidates found");
  }

  // 👉 DIRECT LIST
  const list = rows.map((c, i) =>
    `${i + 1}. ${c.custom_first_name} ${c.custom_last_name || ""}`
  ).join("\n");

  lastResult = rows;

  return res.json(`👥 Candidates:\n\n${list}`);
}
// 👉 TOP N CANDIDATES (USING SAME BEST LOGIC 🔥)
if (q.includes("top")) {

  const numMatch = q.match(/\d+/);
  const limit = numMatch ? parseInt(numMatch[0]) : 3;

  const roleWords = words.filter(
    w =>
      !["top", "candidate", "candidates", "in", "for"].includes(w) &&
      !stopWords.includes(w) &&
      isNaN(w)
  );

  const role = roleWords.join(" ").trim();

  if (!role) {
    return res.json("Please specify role");
  }

  const [rows] = await pool.query(`
    SELECT *
    FROM candidates
    WHERE LOWER(position) LIKE ?
  `, [`%${role}%`]);

  if (rows.length === 0) {
    return res.json(`No candidates found for "${role}"`);
  }

  // 👉 SAME BEST LOGIC REUSED
  const scored = rows.map(c => {

    const exp = parseInt(c.custom_overall_experience_years) || 0;

    const skillsCount = c.skills
      ? c.skills.split(",").length
      : 0;

    const notice = c.notice_period
      ? parseInt(c.notice_period)
      : null;

    const score =
      (exp * 2) +
      skillsCount -
      (notice !== null ? notice / 30 : 0);

    // 👉 SAME REASON LOGIC
    let reasons = [];

    if (exp >= 3) reasons.push("High experience");

    if (skillsCount > 0) reasons.push("Strong skill match");
    else reasons.push("Limited skill data");

    if (notice !== null && notice <= 30)
      reasons.push("Good availability");
    else if (notice === null)
      reasons.push("Notice period not specified");

    return { ...c, score, reasons };
  });

  // 👉 SORT
  scored.sort((a, b) => b.score - a.score);

  // 👉 TOP N
  const topCandidates = scored.slice(0, limit);

  // 👉 FORMAT OUTPUT
  const result = topCandidates.map((c, i) => {
    return `${i + 1}. ${c.custom_first_name} ${c.custom_last_name || ""}

⭐ Score: ${c.score.toFixed(2)}
📊 Experience: ${c.custom_overall_experience_years || "N/A"} years
🧠 Skills: ${c.skills || "N/A"}
📄 Notice: ${c.notice_period || "N/A"} days

💡 Reason:
- ${c.reasons.join("\n- ")}`;
  }).join("\n\n------------------\n\n");

  return res.json(`🏆 Top ${limit} ${role} candidates:\n\n${result}`);
}

// 👉 STATUS FILTER (STS 🔥)
if (detectedStatus) {

  const [rows] = await pool.query(`
    SELECT custom_first_name, custom_last_name
    FROM candidates
    WHERE LOWER(status) = ?
  `, [detectedStatus]);

  if (rows.length === 0) {
    return res.json("No candidates found for this status");
  }

  // save for reuse
  lastResult = rows;

  // 🔥 ALWAYS RETURN LIST (no need "list" keyword)
  const list = rows.map((c, i) =>
    `${i + 1}. ${c.custom_first_name} ${c.custom_last_name || ""}`
  ).join("\n");

  // 🔥 format status nicely (col_issued → Col Issued)
  const displayStatus = detectedStatus
    .split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return res.json(`📋 ${displayStatus} Candidates:\n\n${list}`);
}

// 👉 TOTAL / ROLE COUNT 🔥
if (
  (
    q.includes("how many") ||
    q.includes("count") ||
    q.includes("total")
  ) &&
  !detectedStatus   // 🔥 ADD THIS LINE
) {

  const roleWords = words.filter(
    w =>
      !["how", "many", "count", "candidates", "candidate", "in", "total","number","of","overall","all"].includes(w) &&
      !stopWords.includes(w)
  );

  const role = roleWords.join(" ").trim();

  // 👉 TOTAL COUNT
  if (!role) {
    const [rows] = await pool.query(`
      SELECT COUNT(*) AS total FROM candidates
    `);

    return res.json(`📊 Total candidates: ${rows[0].total}`);
  }

  // 👉 ROLE BASED COUNT
  const [rows] = await pool.query(`
    SELECT COUNT(*) AS total
    FROM candidates
    WHERE LOWER(position) LIKE ?
  `, [`%${role}%`]);

  return res.json(`📊 ${role} candidates: ${rows[0].total}`);
}


// 👉 DYNAMIC BEST CANDIDATE (ANY ROLE 🔥)
if (q.includes("best")) {

  // remove unwanted words
const roleWords = words.filter(
  w =>
    !["best", "candidate", "candidates", "in", "for", "position"].includes(w) &&
    !stopWords.includes(w)
);
const role = roleWords.join(" ").trim();
  if (!role) {
    return res.json("Please specify role (e.g., backend developer)");
  }

  // 🔍 DB FILTER
  const [rows] = await pool.query(`
    SELECT *
    FROM candidates
    WHERE LOWER(position) LIKE ?
  `, [`%${role}%`]);

  if (rows.length === 0) {
    return res.json(`No candidates found for "${role}"`);
  }

  // 🧠 SCORE LOGIC
  let best = null;
  let bestScore = -1;

  for (let c of rows) {

    const exp = parseInt(c.custom_overall_experience_years) || 0;

    const skillsCount = c.skills
      ? c.skills.split(",").length
      : 0;

    const notice = parseInt(c.notice_period) || 0;

    const score =
      (exp * 2) +
      skillsCount -
      (notice / 30);

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
     }

     let reasons = [];

const exp = parseInt(best.custom_overall_experience_years) || 0;

const skillsCount = best.skills
  ? best.skills.split(",").length
  : 0;
const notice = best.notice_period
  ? parseInt(best.notice_period)
  : null;

if (exp >= 3) {
  reasons.push("High experience");
}

if (skillsCount > 0) {
  reasons.push("Strong skill match");
}

if (notice !== null && notice <= 30) {
  reasons.push("Good availability");
}

if (notice === null) {
  reasons.push("Notice period not specified");
}

if (!best.skills || best.skills.trim() === "") {
  reasons.push("Limited skill data");
}

  return res.json(
`🏆 Best ${role}: ${best.custom_first_name} ${best.custom_last_name || ""}

📊 Experience: ${best.custom_overall_experience_years} years
🧠 Skills: ${best.skills || "N/A"}
📄 Notice: ${best.notice_period || "N/A"} days

⭐ Score: ${bestScore.toFixed(2)}

💡 Reason:
- ${reasons.join("\n- ")}`
  );
} 
// 👉 THIS WEEK CANDIDATES
if (isWeek && isCandidate) {
  const [rows] = await pool.query(`
    SELECT *
    FROM candidates
    WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
  `);

  lastResult = rows; // 🔥 SAVE DATA

  return res.json(`📊 This week candidates: ${rows.length}`);
}

if (isMonth && isCandidate) {
  const [rows] = await pool.query(`
    SELECT *
    FROM candidates
    WHERE MONTH(created_at) = MONTH(CURDATE())
      AND YEAR(created_at) = YEAR(CURDATE())
  `);

  lastResult = rows;

  return res.json(`📊 This month candidates: ${rows.length}`);
}

if (isWeek && isOffer) {
  const [rows] = await pool.query(`
    SELECT *
    FROM candidates
    WHERE status IN ('col_issued', 'fol_issued')
      AND YEARWEEK(updated_at, 1) = YEARWEEK(CURDATE(), 1)
  `);

  lastResult = rows;

  return res.json(`🎯 Offers this week: ${rows.length}`);
}


if (isOffer && q.includes("list")) {
  const [rows] = await pool.query(`
    SELECT custom_first_name, custom_last_name
    FROM candidates
    WHERE status IN ('col_issued', 'fol_issued')
  `);

  if (rows.length === 0) {
    return res.json("No offers released yet");
  }

  const list = rows.map((c, i) =>
    `${i + 1}. ${c.custom_first_name} ${c.custom_last_name || ""}`
  ).join("\n");

  return res.json(`🎯 Offer Released Candidates:\n\n${list}`);
}


// 👉 SMART POSITION FILTER (FINAL FIX 🔥)

// remove useless words
const ignoreWords = ["in", "for", "with", "on", "at"];

const roleWords = words.filter(
  w =>
    !stopWords.includes(w) &&
    !ignoreWords.includes(w)
);

// 🔥 normalize role (developer → engineer)
const normalizedWords = roleWords.map(w =>
  w === "developer" ? "engineer" : w
);

let positionMatches = data.filter(c =>
  normalizedWords.every(word =>
    (c.position || "").toLowerCase().includes(word)
  )
);

if (positionMatches.length > 0) {
  lastResult = positionMatches;

  const roleText = normalizedWords.join(" ");

  return res.json(`📊 ${roleText} candidates: ${positionMatches.length}`);
}

// 👉 USER asks for names
if ((q.includes("name") || q.includes("list")) && lastResult) {
  if (!lastResult || lastResult.length === 0) {
    return res.json("No data available. Ask something first.");
  }

  const list = lastResult.map((c, i) =>
    `${i + 1}. ${c.custom_first_name} ${c.custom_last_name || ""}`
  ).join("\n");

  return res.json(`👥 Candidate List:\n\n${list}`);
}

  const result = data.filter(c => {
  const first = (c.custom_first_name || "").toLowerCase();
  const last = (c.custom_last_name || "").toLowerCase();
  const full = `${first} ${last}`.toLowerCase();

  return filteredWords.some(word =>
    first.includes(word) ||
    last.includes(word) ||
    full.includes(word) ||
    String(c.id) === word
  );
});
    // ✅ CORRECT: no result
    if (result.length === 0) {
      return res.json("No candidate found");
    }

    // ✅ CORRECT: result irukku
    const c = result[0];


  
  // 👉 SMART FIELD MAP (FINAL)
const fieldMap = {
  email: "email_id",
  phone: "phone_number",
  status: "status",
  role: "position",
  resume: "resume_file_path",
  skills: "skills",
  education: "education",
  company: "custom_current_employer",
  experience: "custom_overall_experience_years",
  salary: "custom_current_salary_lpa",
  expected: "custom_expected_salary_lpa",
  notice: "notice_period"
};

// 👉 DYNAMIC FIELD RESPONSE
for (let key in fieldMap) {
  if (words.includes(key)) {
    const field = fieldMap[key];

    return res.json(
      c[field]
        ? `🔹 ${key.toUpperCase()}: ${c[field]}`
        : `No ${key} available`
    );
  }
}

    return res.json(
`👤 Name: ${c.custom_first_name} ${c.custom_last_name || ""}

📧 Email: ${c.email_id || "N/A"}

📱 Phone: ${c.phone_number || "N/A"}

💼 Role: ${c.position || "N/A"}

📊 Status: ${c.status || "N/A"}

🧠 Skills: ${c.skills || "N/A"}

🎓 Education: ${c.education || "N/A"}

📅 Experience: ${c.custom_overall_experience_years || "N/A"} years

💰 Current Salary: ${c.custom_current_salary_lpa || "N/A"} LPA

💰 Expected Salary: ${c.custom_expected_salary_lpa || "N/A"} LPA

📄 Notice Period: ${c.notice_period || "N/A"}`
);

  } catch (err) {
    console.error("❌ REAL ERROR:", err);
    return res.status(500).json("Server error");
  }
};