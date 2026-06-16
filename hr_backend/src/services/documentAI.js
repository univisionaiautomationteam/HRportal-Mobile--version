import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
import language from "@google-cloud/language";
import mammoth from "mammoth";
import { ai } from "../config/gemini.js";

const docClient = new DocumentProcessorServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  apiEndpoint: "us-documentai.googleapis.com", // change if your processor is in another region
});

const nlpClient = new language.LanguageServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

/**
 * MAIN ENTRY
 */
export async function parseResume(fileBuffer, mimeType) {
  if (!fileBuffer) {
    throw new Error("No file buffer provided");
  }

  let text = "";

  // 🟢 PDF → Use Document AI
  if (mimeType === "application/pdf") {
    text = await parsePDFWithDocumentAI(fileBuffer);
  }

  // 🟢 DOCX → Use Mammoth
  else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    text = result.value; // Extract text from Word document
  }

  // ❌ Unsupported
  else {
    throw new Error("Unsupported file format");
  }

  const rawText = text;        // keep original with line breaks
  const normalized = normalizeText(text);

  return await extractResumeData(rawText, normalized);
}

/* ================= PDF PARSER ================= */

async function parsePDFWithDocumentAI(fileBuffer) {
  const base64Content = fileBuffer.toString("base64");

  const request = {
    name: process.env.DOCUMENT_AI_PROCESSOR,
    rawDocument: {
      content: base64Content,
      mimeType: "application/pdf",
    },
  };

  const [result] = await docClient.processDocument(request);
  return result.document.text || "";
}

/* ================= TEXT PARSER (COMMON) ================= */

async function extractResumeData(rawText, text) {
  // Always extract email & phone via regex — fast and reliable
  const email = extractEmail(rawText, text);
  const phone = extractPhone(rawText);

  // Try Gemini first for name / skills / education (handles complex layouts)
  try {
    const geminiResult = await extractWithGemini(rawText);
    if (geminiResult) {
      return {
        first_name:   geminiResult.first_name   || "",
        last_name:    geminiResult.last_name     || "",
        email_id:     email || geminiResult.email_id || "",
        phone_number: phone || geminiResult.phone_number || "",
        skills:       geminiResult.skills        || "",
        education:    geminiResult.education     || "",
        experience:   geminiResult.experience    || "",
        rawText: text,
      };
    }
  } catch (err) {
    console.warn("Gemini extraction failed, falling back to regex:", err.message);
  }

  // Regex fallback
  const fullName = extractNameFromTop(rawText);
  const { firstName, lastName } = splitName(fullName);

  return {
    first_name: firstName,
    last_name: lastName,
    email_id: email,
    phone_number: phone,
    skills:    extractSection(rawText, "SKILLS"),
    education: extractSection(rawText, "EDUCATION"),
    experience: extractExperience(rawText),
    rawText: text,
  };
}

/* ================= GEMINI EXTRACTION ================= */

async function extractWithGemini(rawText) {
  const prompt = `You are a resume parser. Extract the following fields from the resume text below.
Return ONLY a valid JSON object with exactly these keys (no markdown, no extra text):
{
  "first_name": "",
  "last_name": "",
  "email_id": "",
  "phone_number": "",
  "skills": "",
  "education": "",
  "experience": ""
}

Rules:
- first_name: candidate's first name only
- last_name: candidate's remaining name (middle + last)
- email_id: email address
- phone_number: phone number with country code if present
- skills: comma-separated list of all technical and soft skills mentioned
- education: highest degree with institution and year, e.g. "B.Tech ECE - NRI Institution of Technology (2020-2023)"
- experience: total work experience as a string, e.g. "2.3 years" or "3 years 6 months"

RESUME TEXT:
${rawText.slice(0, 8000)}
`;

  const result = await ai.generateContent(prompt);
  const responseText = result.response.text();

  // Strip markdown fences if present
  const cleaned = responseText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;

  const parsed = JSON.parse(cleaned.substring(start, end + 1));

  // Validate — at minimum we need a name or email
  if (!parsed.first_name && !parsed.email_id) return null;

  return parsed;
}

/* =============== HELPERS ============== */

function extractNameFromTop(rawText) {
  const lines = rawText
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 1);

  // Pass 1: look for explicit "Name:" / "Full Name:" / "Candidate Name:" label
  for (const line of lines.slice(0, 40)) {
    const labeled = line.match(
      /^(?:full\s*name|candidate\s*name|name)\s*[:\-]\s*(.+)/i
    );
    if (labeled) {
      const candidate = labeled[1].trim().replace(/\s+/g, " ");
      if (candidate && !/\d|@/.test(candidate) && candidate.length < 60) {
        return candidate;
      }
    }
  }

  // Pass 2: first line in top-20 that looks like a proper name
  const skipPatterns = /resume|curriculum|profile|contact|engineer|developer|manager|analyst|consultant|specialist|summary|objective|skill|experience|education|project|certif|mobile|phone|address|linkedin|pvt|ltd|inc\b|corp\b|technologies|solutions|systems/i;

  for (const line of lines.slice(0, 20)) {
    if (/@/.test(line)) continue;
    if (/\d/.test(line)) continue;
    if (skipPatterns.test(line)) continue;
    if (/[,|;\/\\]/.test(line)) continue;

    const clean = line.replace(/\s+/g, " ").trim();
    // 1–5 word name, each word starts with letter
    if (/^[A-Za-z][A-Za-z.'-]*(\s+[A-Za-z][A-Za-z.'-]*){0,4}$/.test(clean)) {
      return clean;
    }
  }

  return "";
}

function extractEmail(rawText, fallbackText) {
  // No \b boundary — it breaks emails like md.926@gmail.com
  // because \b matches after 'd' then '.' resets, so regex starts from '926'
  const emailRegex = /[A-Z0-9][A-Z0-9._%+\-]*@[A-Z0-9.\-]+\.[A-Z]{2,}/i;

  // Search line-by-line in rawText first (avoids whitespace-collapsed splits)
  for (const line of rawText.split("\n")) {
    const m = line.match(emailRegex);
    if (m) return m[0].toLowerCase();
  }

  // Fallback: search in normalized (space-collapsed) text
  const m = fallbackText.match(emailRegex);
  return m ? m[0].toLowerCase() : "";
}

function extractPhone(rawText) {
  // Search line-by-line to avoid cross-line false positives
  const lines = rawText.split("\n");

  // Pattern 1: Indian mobile — +91 or 91 prefix + 10 digit starting 6-9
  const indianRegex = /(?:\+?91[\s\-.]?)?[6-9]\d{9}/g;

  // Pattern 2: Generic international — country code optional, 10+ digits
  const genericRegex = /(?:\+?\d{1,3}[\s\-.])?(?:\(?\d{2,4}\)?[\s\-.]?)?\d{3,5}[\s\-.]?\d{4,6}/g;

  for (const line of lines) {
    // Try Indian pattern first
    const indianMatches = [...(line.matchAll(indianRegex))].map(m => m[0]);
    for (const m of indianMatches) {
      const digits = m.replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 13) return m.trim();
    }
  }

  for (const line of lines) {
    const genericMatches = [...(line.matchAll(genericRegex))].map(m => m[0]);
    for (const m of genericMatches) {
      const digits = m.replace(/\D/g, "");
      if (digits.length >= 10 && digits.length <= 15) return m.trim();
    }
  }

  return "";
}

// Section header aliases — covers varied resume formats
const SECTION_ALIASES = {
  SKILLS: [
    "SKILL", "TECHNICAL SKILL", "KEY SKILL", "CORE SKILL",
    "CORE COMPETENC", "COMPETENC", "TECHNOLOG", "TOOLS",
    "EXPERTISE", "PROFICIENC", "TECHNICAL PROFIL",
  ],
  EDUCATION: [
    "EDUCATION", "ACADEMIC", "QUALIFICATION",
    "EDUCATIONAL BACKGROUND", "ACADEMIC BACKGROUND",
    "DEGREE", "SCHOLASTIC",
  ],
};

// All known section starters (used to detect where a section ends)
const ALL_SECTION_STARTERS = [
  "SKILL", "TECHNICAL SKILL", "KEY SKILL", "CORE SKILL", "CORE COMPETENC",
  "COMPETENC", "TECHNOLOG", "TOOLS", "EXPERTISE",
  "EDUCATION", "ACADEMIC", "QUALIFICATION",
  "EXPERIENCE", "WORK EXPERIENCE", "WORK HISTORY", "EMPLOYMENT",
  "PROJECT", "PERSONAL PROJECT", "KEY PROJECT",
  "CERTIFICATION", "CERTIFICATE", "ACHIEVEMENT", "AWARD",
  "SUMMARY", "PROFESSIONAL SUMMARY", "OBJECTIVE", "CAREER OBJECTIVE",
  "LANGUAGE", "INTEREST", "HOBBY", "REFERENCE", "DECLARATION",
  "INTERN", "TRAINING",
];

function isSectionHeader(line, aliases) {
  const upper = line.trim().toUpperCase();
  return aliases.some(alias => upper.startsWith(alias));
}

function isAnySectionHeader(line) {
  const upper = line.trim().toUpperCase();
  return ALL_SECTION_STARTERS.some(h => upper.startsWith(h));
}

function extractSection(text, sectionName) {
  const aliases = SECTION_ALIASES[sectionName] || [sectionName];
  const lines = text.split("\n");

  let startIndex = -1;
  let endIndex = lines.length;

  // Find section start
  for (let i = 0; i < lines.length; i++) {
    if (isSectionHeader(lines[i], aliases)) {
      startIndex = i + 1;
      break;
    }
  }

  if (startIndex === -1) return "";

  // Find where this section ends (next recognisable section header)
  for (let i = startIndex; i < lines.length; i++) {
    if (isAnySectionHeader(lines[i]) && !isSectionHeader(lines[i], aliases)) {
      endIndex = i;
      break;
    }
  }

  const sectionLines = lines
    .slice(startIndex, endIndex)
    .map(l =>
      l.trim()
        .replace(/%a/gi, "•")
        .replace(/â€¢/g, "•")
        .replace(/[\u2022\u00B7\u00A7]/g, "•")
        .replace(/^[•\-\*\u25AA\u25CF]+\s*/, "") // strip bullet chars
        .trim()
    )
    .filter(Boolean);

  return sectionLines.join(", ");
}

function extractExperience(text) {
  // Priority 1: "Total Experience: 4.1 years" or "Experience: 4+ years"
  const labeled = text.match(
    /(?:total\s+experience|experience)\s*[:\-]\s*(\d+\.?\d*\s*\+?\s*years?(?:\s+\d+\s*months?)?)/i
  );
  if (labeled) return labeled[1].trim();

  // Priority 2: "4.1 years of experience" / "4+ years of total experience"
  const sentenceMatch = text.match(
    /(\d+\.?\d*)\s*\+?\s*years?\s+(?:of\s+)?(?:total\s+|overall\s+|relevant\s+)?experience/i
  );
  if (sentenceMatch) return sentenceMatch[0].trim();

  // Priority 3: bare "4.1 years" / "4.1+ years"
  const bare = text.match(/(\d+\.?\d*)\s*\+?\s*years?/i);
  if (bare) return bare[0].trim();

  return "";
}

function splitName(name) {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

// import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
// import language from "@google-cloud/language";

// const docClient = new DocumentProcessorServiceClient({
//   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// });

// const nlpClient = new language.LanguageServiceClient({
//   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// });

// /**
//  * MAIN FUNCTION
//  * Accepts:
//  *   - fileBuffer (Buffer)
//  *   - mimeType (string)
//  */
// export async function parseResume(fileBuffer, mimeType) {
//   if (!fileBuffer) {
//     throw new Error("No file buffer provided to parseResume");
//   }

//   if (!mimeType) {
//     mimeType = "application/pdf"; // fallback
//   }

//   // 🔥 IMPORTANT FIX → Convert buffer to base64
//   const base64Content = fileBuffer.toString("base64");

//   const request = {
//     name: process.env.DOCUMENT_AI_PROCESSOR,
//     rawDocument: {
//       content: base64Content,
//       mimeType: mimeType,
//     },
//   };

//   const [result] = await docClient.processDocument(request);
//   const document = result.document;

//   const text = normalizeText(document.text || "");
//   const email = extractEmail(text);

//   const fullName =
//     extractNameFromEntities(document) ||
//     extractNameFromTop(text) ||
//     (await extractNameUsingNLP(text)) ||
//     nameFromEmail(email);

//   const { firstName, lastName } = splitName(fullName);

//   // OLD fields (unchanged)
//   const skillsText = extractSection(text, "SKILLS");
//   const educationText = extractSection(text, "EDUCATION");
//   const experienceText = extractExperience(text);

//   // Structured data
//   const structuredSkills = splitToArray(skillsText);
//   const structuredEducation = splitToArray(educationText);

//   return {
//     // 🔒 Required for existing UI & DB
//     first_name: firstName,
//     last_name: lastName,
//     email_id: email,
//     phone_number: extractPhone(text),
//     skills: skillsText,
//     education: educationText,
//     experience: experienceText,

//     // 🆕 Extra structured data
//     structured: {
//       skills: structuredSkills,
//       education: structuredEducation,
//       rawTextLength: text.length,
//     },

//     // 🆕 Optional debug field
//     rawText: text,
//   };
// }

// /* ================= HELPERS ================= */

// function extractNameFromEntities(document) {
//   return (
//     document.entities?.find(e =>
//       e.type?.toLowerCase().includes("person")
//     )?.mentionText || ""
//   );
// }

// function extractNameFromTop(text) {
//   return text.split("\n").find(l =>
//     /^[A-Z][A-Z\s]{4,}$/.test(l)
//   ) || "";
// }

// async function extractNameUsingNLP(text) {
//   try {
//     const [res] = await nlpClient.analyzeEntities({
//       document: { content: text, type: "PLAIN_TEXT" },
//     });
//     return res.entities.find(e => e.type === "PERSON")?.name || "";
//   } catch {
//     return "";
//   }
// }

// function nameFromEmail(email) {
//   return email
//     ?.split("@")[0]
//     ?.replace(/[._]/g, " ")
//     ?.replace(/\b\w/g, c => c.toUpperCase()) || "";
// }

// function extractEmail(text) {
//   return text.match(/[^\s]+@[^\s]+/)?.[0] || "";
// }

// function extractPhone(text) {
//   const matches = text.match(
//     /(\+?\d{1,3}[\s.-]?)?\d{10,14}/g
//   );
//   return matches?.[0] || "";
// }

// function extractSection(text, title) {
//   const match = text.match(
//     new RegExp(`${title}[\\s\\S]*?(?=EXPERIENCE|EDUCATION|SKILLS|$)`, "i")
//   );
//   return match?.[0]?.replace(title, "").trim() || "";
// }

// function extractExperience(text) {
//   return text.match(/(\d+)\+?\s+years?/i)?.[0] || "";
// }

// function splitName(name) {
//   const parts = name.trim().split(/\s+/);
//   return {
//     firstName: parts[0] || "",
//     lastName: parts.slice(1).join(" "),
//   };
// }

// function splitToArray(text) {
//   if (!text) return [];
//   return text
//     .split(/[,•|\n]/)
//     .map(s => s.trim())
//     .filter(Boolean);
// }

// function normalizeText(text) {
//   return text.replace(/\s+/g, " ").trim();
// }


// // import fs from "fs";
// // import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
// // import language from "@google-cloud/language";

// // const docClient = new DocumentProcessorServiceClient({
// //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // });

// // const nlpClient = new language.LanguageServiceClient({
// //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // });

// // /**
// //  * MAIN FUNCTION
// //  * ⚠️ Backward compatible – old fields are untouched
// //  */
// // export async function parseResume(fileBuffer) {
// //   if (!fileBuffer) {
// //     throw new Error("No file buffer provided to parseResume");
// //   }

// //   const request = {
// //     name: process.env.DOCUMENT_AI_PROCESSOR,
// //     rawDocument: {
// //       content: fileBuffer,
// //       mimeType: "application/pdf",
// //     },
// //   };

// //   const [result] = await docClient.processDocument(request);
// //   const document = result.document;

// //   const text = normalizeText(document.text || "");
// //   const email = extractEmail(text);
  
  

// //   const fullName =
// //     extractNameFromEntities(document) ||
// //     extractNameFromTop(text) ||
// //     (await extractNameUsingNLP(text)) ||
// //     nameFromEmail(email);

// //   const { firstName, lastName } = splitName(fullName);

// //   // OLD fields (DO NOT CHANGE)
// //   const skillsText = extractSection(text, "SKILLS");
// //   const educationText = extractSection(text, "EDUCATION");
// //   const experienceText = extractExperience(text);

// //   // NEW structured data (SAFE ADDITION)
// //   const structuredSkills = splitToArray(skillsText);
// //   const structuredEducation = splitToArray(educationText);

// //   return {
// //     // 🔒 REQUIRED BY EXISTING UI & DB
// //     first_name: firstName,
// //     last_name: lastName,
// //     email_id: email,
// //     phone_number: extractPhone(text),
// //     skills: skillsText,
// //     education: educationText,
// //     experience: experienceText,

// //     // 🆕 EXTRA – DOES NOT AFFECT UI
// //     structured: {
// //       skills: structuredSkills,
// //       education: structuredEducation,
// //       rawTextLength: text.length,
// //     },

// //     // 🆕 OPTIONAL (debug / AI use)
// //     rawText: text,
// //   };
// // }

// // /* ================= HELPERS ================= */

// // function extractNameFromEntities(document) {
// //   return (
// //     document.entities?.find(e =>
// //       e.type?.toLowerCase().includes("person")
// //     )?.mentionText || ""
// //   );
// // }

// // function extractNameFromTop(text) {
// //   return text.split("\n").find(l =>
// //     /^[A-Z][A-Z\s]{4,}$/.test(l)
// //   ) || "";
// // }

// // async function extractNameUsingNLP(text) {
// //   try {
// //     const [res] = await nlpClient.analyzeEntities({
// //       document: { content: text, type: "PLAIN_TEXT" },
// //     });
// //     return res.entities.find(e => e.type === "PERSON")?.name || "";
// //   } catch {
// //     return "";
// //   }
// // }

// // function nameFromEmail(email) {
// //   return email
// //     ?.split("@")[0]
// //     ?.replace(/[._]/g, " ")
// //     ?.replace(/\b\w/g, c => c.toUpperCase()) || "";
// // }

// // function extractEmail(text) {
// //   return text.match(/[^\s]+@[^\s]+/)?.[0] || "";
// // }

// // function extractPhone(text) {
// //   const matches = text.match(
// //     /(\+?\d{1,3}[\s.-]?)?\d{10,14}/g
// //   );
// //   return matches?.[0] || "";
// // }

// // function extractSection(text, title) {
// //   const match = text.match(
// //     new RegExp(`${title}[\\s\\S]*?(?=EXPERIENCE|EDUCATION|SKILLS|$)`, "i")
// //   );
// //   return match?.[0]?.replace(title, "").trim() || "";
// // }

// // function extractExperience(text) {
// //   return text.match(/(\d+)\+?\s+years?/i)?.[0] || "";
// // }

// // function splitName(name) {
// //   const parts = name.trim().split(/\s+/);
// //   return {
// //     firstName: parts[0] || "",
// //     lastName: parts.slice(1).join(" "),
// //   };
// // }

// // function splitToArray(text) {
// //   if (!text) return [];
// //   return text
// //     .split(/[,•|\n]/)
// //     .map(s => s.trim())
// //     .filter(Boolean);
// // }

// // function normalizeText(text) {
// //   return text.replace(/\s+/g, " ").trim();
// // }

// // // import fs from "fs";
// // // import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
// // // import language from "@google-cloud/language";

// // // const docClient = new DocumentProcessorServiceClient({
// // //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // });

// // // const nlpClient = new language.LanguageServiceClient({
// // //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // });

// // // export async function parseResume(filePath) {
// // //   const fileBuffer = fs.readFileSync(filePath);

// // //   const request = {
// // //     name: process.env.DOCUMENT_AI_PROCESSOR,
// // //     rawDocument: {
// // //       content: fileBuffer,
// // //       mimeType: "application/pdf",
// // //     },
// // //   };

// // //   const [result] = await docClient.processDocument(request);
// // //   const document = result.document;

// // //   const text = normalizeText(document.text || "");
// // //   const email = extractEmail(text);

// // //   const fullName =
// // //     extractNameFromEntities(document) ||
// // //     extractNameFromTop(text) ||
// // //     (await extractNameUsingNLP(text)) ||
// // //     nameFromEmail(email);

// // //   const { firstName, lastName } = splitName(fullName);

// // //   return {
// // //     first_name: firstName,
// // //     last_name: lastName,
// // //     email_id: email,
// // //     phone_number: extractPhone(text),
// // //     skills: extractSection(text, "SKILLS"),
// // //     education: extractSection(text, "EDUCATION"),
// // //     experience: extractExperience(text),
// // //   };
// // // }

// // // /* ================= HELPERS ================= */

// // // function extractNameFromEntities(document) {
// // //   return (
// // //     document.entities?.find(e =>
// // //       e.type?.toLowerCase().includes("person")
// // //     )?.mentionText || ""
// // //   );
// // // }

// // // function extractNameFromTop(text) {
// // //   return text.split("\n").find(l =>
// // //     /^[A-Z][A-Z\s]{4,}$/.test(l)
// // //   ) || "";
// // // }

// // // async function extractNameUsingNLP(text) {
// // //   try {
// // //     const [res] = await nlpClient.analyzeEntities({
// // //       document: { content: text, type: "PLAIN_TEXT" },
// // //     });
// // //     return res.entities.find(e => e.type === "PERSON")?.name || "";
// // //   } catch {
// // //     return "";
// // //   }
// // // }

// // // function nameFromEmail(email) {
// // //   return email
// // //     ?.split("@")[0]
// // //     ?.replace(/[._]/g, " ")
// // //     ?.replace(/\b\w/g, c => c.toUpperCase()) || "";
// // // }

// // // function extractEmail(text) {
// // //   return text.match(/[^\s]+@[^\s]+/)?.[0] || "";
// // // }

// // // function extractPhone(text) {
// // //   const matches = text.match(
// // //     /(\+?\d{1,3}[\s.-]?)?\d{10,14}/g
// // //   );
// // //   return matches?.[0] || "";
// // // }

// // // function extractSection(text, title) {
// // //   const match = text.match(
// // //     new RegExp(`${title}[\\s\\S]*?(?=EXPERIENCE|EDUCATION|$)`, "i")
// // //   );
// // //   return match?.[0]?.replace(title, "").trim() || "";
// // // }

// // // function extractExperience(text) {
// // //   return text.match(/(\d+)\+?\s+years?/i)?.[0] || "";
// // // }

// // // function splitName(name) {
// // //   const parts = name.trim().split(/\s+/);
// // //   return {
// // //     firstName: parts[0] || "",
// // //     lastName: parts.slice(1).join(" "),
// // //   };
// // // }

// // // function normalizeText(text) {
// // //   return text.replace(/\s+/g, " ").trim();
// // // }

// // // // import fs from "fs";
// // // // import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
// // // // import language from "@google-cloud/language";

// // // // const docClient = new DocumentProcessorServiceClient({
// // // //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // // });

// // // // const nlpClient = new language.LanguageServiceClient({
// // // //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // // });

// // // // export async function parseResume(filePath) {
// // // //   const fileBuffer = fs.readFileSync(filePath);

// // // //   const request = {
// // // //     name: process.env.DOCUMENT_AI_PROCESSOR,
// // // //     rawDocument: {
// // // //       content: fileBuffer,
// // // //       mimeType: "application/pdf", // IMPORTANT
// // // //     },
// // // //   };

// // // //   const [result] = await docClient.processDocument(request);

// // // //   const document = result.document;
// // // //   const text = normalizeText(document.text || "");
// // // //   const email = extractEmail(text);

// // // //   const fullName =
// // // //     extractNameFromEntities(document) ||
// // // //     extractNameFromTop(text) ||
// // // //     (await extractNameUsingNLP(text)) ||
// // // //     nameFromEmail(email);

// // // //   const { firstName, lastName } = splitName(fullName);

// // // //   return {
// // // //     firstName,
// // // //     lastName,
// // // //     email,
// // // //     phone: extractPhone(text),
// // // //     skills: extractSection(text, "SKILLS"),
// // // //     education: extractSection(text, "EDUCATION"),
// // // //     experience: extractExperience(text),
// // // //   };
// // // // }

// // // // /* ================= HELPERS ================= */

// // // // function extractNameFromEntities(document) {
// // // //   return (
// // // //     document.entities?.find(
// // // //       (e) => e.type?.toLowerCase().includes("person")
// // // //     )?.mentionText || ""
// // // //   );
// // // // }

// // // // function extractNameFromTop(text) {
// // // //   return (
// // // //     text.split("\n").find(
// // // //       (l) => /^[A-Z][A-Z\s]{4,}$/.test(l)
// // // //     ) || ""
// // // //   );
// // // // }

// // // // async function extractNameUsingNLP(text) {
// // // //   try {
// // // //     const [res] = await nlpClient.analyzeEntities({
// // // //       document: { content: text, type: "PLAIN_TEXT" },
// // // //     });
// // // //     return res.entities.find((e) => e.type === "PERSON")?.name || "";
// // // //   } catch {
// // // //     return "";
// // // //   }
// // // // }

// // // // function nameFromEmail(email) {
// // // //   return (
// // // //     email
// // // //       ?.split("@")[0]
// // // //       ?.replace(/[._]/g, " ")
// // // //       ?.replace(/\b\w/g, (c) => c.toUpperCase()) || ""
// // // //   );
// // // // }

// // // // function extractEmail(text) {
// // // //   return text.match(/[^\s]+@[^\s]+/)?.[0] || "";
// // // // }

// // // // function extractPhone(text) {
// // // //   const matches = text.match(
// // // //     /(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g
// // // //   );
// // // //   if (!matches) return "";

// // // //   for (let raw of matches) {
// // // //     const digits = raw.replace(/\D/g, "");
// // // //     if (digits.length === 10 && /^[6-9]/.test(digits)) {
// // // //       return `+91${digits}`;
// // // //     }
// // // //     if (digits.length >= 11 && digits.length <= 15) {
// // // //       return `+${digits}`;
// // // //     }
// // // //   }
// // // //   return "";
// // // // }

// // // // function extractSection(text, title) {
// // // //   const match = text.match(
// // // //     new RegExp(`${title}[\\s\\S]*?(?=EXPERIENCE|EDUCATION|$)`, "i")
// // // //   );
// // // //   return match?.[0]?.replace(title, "").trim() || "";
// // // // }

// // // // function extractExperience(text) {
// // // //   return text.match(/(\d+)\+?\s+years?/i)?.[0] || "";
// // // // }

// // // // function splitName(name) {
// // // //   const parts = name.trim().split(/\s+/);
// // // //   return {
// // // //     firstName: parts[0] || "",
// // // //     lastName: parts.slice(1).join(" "),
// // // //   };
// // // // }

// // // // function normalizeText(text) {
// // // //   return text.replace(/\s+/g, " ").trim();
// // // // }

// // // // // import fs from "fs";
// // // // // import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
// // // // // import language from "@google-cloud/language";

// // // // // const docClient = new DocumentProcessorServiceClient({
// // // // //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // // // });

// // // // // const nlpClient = new language.LanguageServiceClient({
// // // // //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // // // });

// // // // // export async function parseResume(filePath) {
// // // // //   const fileBuffer = fs.readFileSync(filePath);

// // // // //   const request = {
// // // // //     name: process.env.DOCUMENT_AI_PROCESSOR,
// // // // //     rawDocument: {
// // // // //       content: fileBuffer,
// // // // //       mimeType: "application/pdf",
// // // // //     },
// // // // //   };

// // // // //   const [result] = await docClient.processDocument(request);

// // // // //   const document = result.document;
// // // // //   const text = normalizeText(document.text || "");
// // // // //   const email = extractEmail(text);

// // // // //   const fullName =
// // // // //     extractNameFromEntities(document) ||
// // // // //     extractNameFromTop(text) ||
// // // // //     (await extractNameUsingNLP(text)) ||
// // // // //     nameFromEmail(email);

// // // // //   const { firstName, lastName } = splitName(fullName);

// // // // //   return {
// // // // //     firstName,
// // // // //     lastName,
// // // // //     email,
// // // // //     phone: extractPhone(text),
// // // // //     skills: extractSection(text, "SKILLS"),
// // // // //     education: extractSection(text, "EDUCATION"),
// // // // //     experience: extractExperience(text),
// // // // //   };
// // // // // }

// // // // // /* ================= HELPERS ================= */

// // // // // function extractNameFromEntities(document) {
// // // // //   return document.entities?.find(
// // // // //     e => e.type?.toLowerCase().includes("person")
// // // // //   )?.mentionText || "";
// // // // // }

// // // // // function extractNameFromTop(text) {
// // // // //   return text.split("\n").find(
// // // // //     l => /^[A-Z][A-Z\s]{4,}$/.test(l)
// // // // //   ) || "";
// // // // // }

// // // // // async function extractNameUsingNLP(text) {
// // // // //   try {
// // // // //     const [res] = await nlpClient.analyzeEntities({
// // // // //       document: { content: text, type: "PLAIN_TEXT" },
// // // // //     });
// // // // //     return res.entities.find(e => e.type === "PERSON")?.name || "";
// // // // //   } catch {
// // // // //     return "";
// // // // //   }
// // // // // }

// // // // // function nameFromEmail(email) {
// // // // //   return email
// // // // //     ?.split("@")[0]
// // // // //     ?.replace(/[._]/g, " ")
// // // // //     ?.replace(/\b\w/g, c => c.toUpperCase()) || "";
// // // // // }

// // // // // function extractEmail(text) {
// // // // //   return text.match(/[^\s]+@[^\s]+/)?.[0] || "";
// // // // // }

// // // // // function extractPhone(text) {
// // // // //   if (!text) return "";

// // // // //   // Step 1: find all possible phone numbers
// // // // //   const matches = text.match(
// // // // //     /(\+?\d{1,3}[\s.-]?)?(\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g
// // // // //   );

// // // // //   if (!matches) return "";

// // // // //   // Step 2: normalize & validate
// // // // //   for (let raw of matches) {
// // // // //     const digits = raw.replace(/\D/g, "");

// // // // //     // Indian numbers (priority)
// // // // //     if (digits.length === 10 && /^[6-9]/.test(digits)) {
// // // // //       return `+91${digits}`;
// // // // //     }

// // // // //     // With country code (10–15 digits)
// // // // //     if (digits.length >= 11 && digits.length <= 15) {
// // // // //       return `+${digits}`;
// // // // //     }
// // // // //   }

// // // // //   return "";
// // // // // }


// // // // // function extractSection(text, title) {
// // // // //   const match = text.match(
// // // // //     new RegExp(`${title}[\\s\\S]*?(?=EXPERIENCE|EDUCATION|$)`, "i")
// // // // //   );
// // // // //   return match?.[0]?.replace(title, "").trim() || "";
// // // // // }

// // // // // function extractExperience(text) {
// // // // //   return text.match(/(\d+)\+?\s+years?/i)?.[0] || "";
// // // // // }

// // // // // function splitName(name) {
// // // // //   const parts = name.trim().split(/\s+/);
// // // // //   return {
// // // // //     firstName: parts[0] || "",
// // // // //     lastName: parts.slice(1).join(" "),
// // // // //   };
// // // // // }

// // // // // function normalizeText(text) {
// // // // //   return text.replace(/\s+/g, " ").trim();
// // // // // }


// // // // // // import fs from "fs";
// // // // // // import { DocumentProcessorServiceClient } from "@google-cloud/documentai";
// // // // // // import language from "@google-cloud/language";

// // // // // // /* ================= CLIENTS ================= */

// // // // // // const docClient = new DocumentProcessorServiceClient({
// // // // // //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // // // // });

// // // // // // const nlpClient = new language.LanguageServiceClient({
// // // // // //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // // // // });

// // // // // // /* ================= MAIN FUNCTION ================= */

// // // // // // export async function parseResume(filePath) {
// // // // // //   const fileBuffer = fs.readFileSync(filePath);

// // // // // //   const request = {
// // // // // //     name: process.env.DOCUMENT_AI_PROCESSOR,
// // // // // //     rawDocument: {
// // // // // //       content: fileBuffer,
// // // // // //       mimeType: "application/pdf",
// // // // // //     },
// // // // // //   };

// // // // // //   const [result] = await docClient.processDocument(request);

// // // // // //   const document = result?.document;
// // // // // //   const rawText = document?.text || "";

// // // // // //   const cleanText = normalizeText(rawText);

// // // // // //   const email = extractEmail(cleanText);

// // // // // //   const fullName = await detectCandidateName(
// // // // // //     document,
// // // // // //     cleanText,
// // // // // //     email
// // // // // //   );

// // // // // //   const { firstName, lastName } = splitName(fullName);

// // // // // //   return {
// // // // // //     firstName,
// // // // // //     lastName,
// // // // // //     email,
// // // // // //     phone: extractPhone(cleanText),
// // // // // //     skills: extractSection(cleanText, "SKILLS"),
// // // // // //     education: extractSection(cleanText, "EDUCATION"),
// // // // // //     experience: extractExperience(cleanText),
// // // // // //   };
// // // // // // }

// // // // // // /* ================= NAME DETECTION ================= */

// // // // // // async function detectCandidateName(document, text, email) {
// // // // // //   return (
// // // // // //     extractNameFromEntities(document) ||
// // // // // //     extractNameFromTop(text) ||
// // // // // //     (await extractNameUsingNLP(text)) ||
// // // // // //     nameFromEmail(email) ||
// // // // // //     ""
// // // // // //   );
// // // // // // }

// // // // // // /* 1️⃣ Document AI entities */
// // // // // // function extractNameFromEntities(document) {
// // // // // //   const entities = document?.entities || [];

// // // // // //   const person = entities.find(
// // // // // //     (e) =>
// // // // // //       e.type?.toLowerCase().includes("person") ||
// // // // // //       e.type?.toLowerCase().includes("name")
// // // // // //   );

// // // // // //   return person?.mentionText || "";
// // // // // // }

// // // // // // /* 2️⃣ Top-of-resume heuristic */
// // // // // // function extractNameFromTop(text) {
// // // // // //   const lines = text
// // // // // //     .split("\n")
// // // // // //     .map((l) => l.trim())
// // // // // //     .filter(Boolean);

// // // // // //   for (let i = 0; i < Math.min(4, lines.length); i++) {
// // // // // //     const line = lines[i];

// // // // // //     if (line.includes("@") || /\d{10}/.test(line)) continue;

// // // // // //     if (
// // // // // //       /^[A-Z][A-Z\s]{4,}$/.test(line) ||
// // // // // //       /^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(line)
// // // // // //     ) {
// // // // // //       return line;
// // // // // //     }
// // // // // //   }
// // // // // //   return "";
// // // // // // }

// // // // // // /* 3️⃣ Google NLP PERSON detection */
// // // // // // async function extractNameUsingNLP(text) {
// // // // // //   try {
// // // // // //     const [result] = await nlpClient.analyzeEntities({
// // // // // //       document: { content: text, type: "PLAIN_TEXT" },
// // // // // //     });

// // // // // //     const person = result.entities.find(
// // // // // //       (e) => e.type === "PERSON" && e.salience > 0.1
// // // // // //     );

// // // // // //     return person?.name || "";
// // // // // //   } catch {
// // // // // //     return "";
// // // // // //   }
// // // // // // }

// // // // // // /* 4️⃣ Email fallback */
// // // // // // function nameFromEmail(email) {
// // // // // //   if (!email) return "";

// // // // // //   return email
// // // // // //     .split("@")[0]
// // // // // //     .replace(/[._]/g, " ")
// // // // // //     .replace(/\d+/g, "")
// // // // // //     .replace(/\b\w/g, (c) => c.toUpperCase());
// // // // // // }

// // // // // // /* ================= FIELD EXTRACTION ================= */

// // // // // // function extractEmail(text) {
// // // // // //   const match = text.match(
// // // // // //     /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/
// // // // // //   );
// // // // // //   return match ? match[0] : "";
// // // // // // }

// // // // // // function extractPhone(text) {
// // // // // //   const match = text.match(/(\+91[\s-]?[6-9]\d{9})/);
// // // // // //   return match ? match[1] : "";
// // // // // // }

// // // // // // /* ================= SECTION EXTRACTION ================= */

// // // // // // function extractSection(text, sectionName) {
// // // // // //   const regex = new RegExp(
// // // // // //     `${sectionName}[\\s\\n]*([\\s\\S]*?)(\\n[A-Z ]{3,}|$)`,
// // // // // //     "i"
// // // // // //   );

// // // // // //   const match = text.match(regex);
// // // // // //   if (!match) return "";

// // // // // //   return cleanSection(match[1]);
// // // // // // }

// // // // // // function cleanSection(section) {
// // // // // //   return section
// // // // // //     .replace(/\n/g, ", ")
// // // // // //     .replace(/•/g, "")
// // // // // //     .replace(/\s+/g, " ")
// // // // // //     .trim();
// // // // // // }

// // // // // // /* ================= EXPERIENCE ================= */

// // // // // // function extractExperience(text) {
// // // // // //   const years = text.match(/(\d+)\+?\s+years?/i);
// // // // // //   if (years) return years[0];

// // // // // //   return extractSection(text, "EXPERIENCE");
// // // // // // }

// // // // // // /* ================= UTILITIES ================= */

// // // // // // function splitName(fullName) {
// // // // // //   if (!fullName) return { firstName: "", lastName: "" };

// // // // // //   const parts = fullName.trim().split(/\s+/);
// // // // // //   return {
// // // // // //     firstName: parts[0],
// // // // // //     lastName: parts.slice(1).join(" "),
// // // // // //   };
// // // // // // }

// // // // // // function normalizeText(text) {
// // // // // //   return text
// // // // // //     .replace(/\r/g, "")
// // // // // //     .replace(/\n{2,}/g, "\n")
// // // // // //     .trim();
// // // // // // }

// // // // // // // import fs from 'fs';
// // // // // // // import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

// // // // // // // const client = new DocumentProcessorServiceClient({
// // // // // // //   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
// // // // // // // });

// // // // // // // export async function parseResume(filePath) {
// // // // // // //   const fileBuffer = fs.readFileSync(filePath);

// // // // // // //   const request = {
// // // // // // //     name: process.env.DOCUMENT_AI_PROCESSOR,
// // // // // // //     rawDocument: {
// // // // // // //       content: fileBuffer,
// // // // // // //       mimeType: 'application/pdf',
// // // // // // //     },
// // // // // // //   };

// // // // // // //   const [result] = await client.processDocument(request);
// // // // // // //   const text = result.document.text || '';

// // // // // // //   return extractFields(text);
// // // // // // // }

// // // // // // // function extractFields(text) {
// // // // // // //   return {
// // // // // // //     name: find(text, /Name[:\s]+(.+)/i),
// // // // // // //     email: find(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i),
// // // // // // //     phone: find(text, /(\+91[-\s]?)?\d{10}/),
// // // // // // //     skills: find(text, /(Skills|Technologies)[:\s]+(.+)/i),
// // // // // // //     education: find(text, /(Education|Qualification)[:\s]+(.+)/i),
// // // // // // //     experience: find(text, /(\d+)\+?\s+years?/i),
// // // // // // //   };
// // // // // // // }

// // // // // // // function find(text, regex) {
// // // // // // //   const match = text.match(regex);
// // // // // // //   return match ? match[1] || match[0] : '';
// // // // // // // }


// // // // // // // // const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');

// // // // // // // // const client = new DocumentProcessorServiceClient();

// // // // // // // // const PROJECT_ID = process.env.GCP_PROJECT_ID;
// // // // // // // // const LOCATION = process.env.GCP_LOCATION;
// // // // // // // // const PROCESSOR_ID = process.env.DOCUMENT_AI_PROCESSOR_ID;

// // // // // // // // async function extractWithDocumentAI(buffer, mimeType) {
// // // // // // // //   const name = `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`;

// // // // // // // //   const request = {
// // // // // // // //     name,
// // // // // // // //     rawDocument: {
// // // // // // // //       content: buffer.toString('base64'),
// // // // // // // //       mimeType
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   console.log("📄 Calling Google Document AI OCR...");
// // // // // // // //   console.log("📄 Processor:", name);
// // // // // // // //   console.log("📄 MIME Type:", mimeType);

// // // // // // // //   const [result] = await client.processDocument(request);
// // // // // // // //   const document = result.document;

// // // // // // // //   const extractedText = document?.text || '';

// // // // // // // //   console.log("📄 Document AI extracted text length:", extractedText.length);

// // // // // // // //   return extractedText;
// // // // // // // // }

// // // // // // // // module.exports = extractWithDocumentAI;

