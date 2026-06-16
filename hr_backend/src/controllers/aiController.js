import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import extractResumeText from "../utils/resumeExtractor.js";
import { ai } from "../config/gemini.js";
import { parseResume } from "../services/documentAI.js";
import {
  Document,
  Packer,
  Paragraph,
  Header,
  TextRun,
  ImageRun,
  AlignmentType,
  BorderStyle
} from "docx";







/* ================= AI FIELD EXTRACTION ================= */

function normalizePointsToNumbered(text) {
  if (!text) return "";

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  // Pass 1: map each line to its marker type
  const mapped = lines.map(line => {
    const sanitized = line
      .replace(/%a/gi, "•")
      .replace(/â€¢/g, "•")
      .replace(/%[0-9A-Fa-f]{2}/g, " ")
      .replace(/[\u2022\u00B7\u00A7\u25AA\u25BA]/g, "•")
      .trim();

    const cleaned = sanitized
      .replace(/^[•\-\*▪▸]+\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "";

    // Numbered project titles (PROJECT 1, Project 1:, Project 1 �)
    if (/^(PROJECT\s+\d+|Project\s+\d+[\s:\-–])/i.test(cleaned)) {
      return `##${cleaned}`;
    }

    // Project sub-label lines → $$ marker
    if (/^(Project|Client|Duration|Environment|Methodology|Role|Description|Tools Used|Technology Node|Foundry|Contribution|Responsibilities|Tools|Technology worked|Tools utilized|Instance\/macro count|No of blocks|Role & Description|HDL|Language|Academic Projects Worked)[\s:]*/i.test(cleaned)) {
      return `$$${cleaned}`;
    }

    // Already has a bullet
    if (cleaned.startsWith("•")) return cleaned;

    // Descriptive bullet lines
    return `• ${cleaned}`;
  }).filter(Boolean);

  // Pass 2: remove $$ sub-labels that have NO inline value and no content following before next label
  // e.g. bare "Client", "Foundry", "Environment" with nothing after → remove
  // BUT "Technology worked: 7nm", "Duration: 9 Months", "Tools utilized: Genus & Tempus" → always keep
  const filtered = [];
  for (let i = 0; i < mapped.length; i++) {
    const cur = mapped[i];
    if (!cur) continue;

    if (cur.startsWith("$$")) {
      const raw = cur.slice(2);
      const colonIdx = raw.indexOf(":");
      // Label has a value inline on the same line → always keep it
      if (colonIdx !== -1 && raw.slice(colonIdx + 1).trim() !== "") {
        filtered.push(cur);
        continue;
      }
      // No inline value — look ahead: if next non-empty entry is another label, skip this one
      let j = i + 1;
      while (j < mapped.length && !mapped[j]) j++;
      if (j >= mapped.length) continue;           // nothing follows → skip
      const next = mapped[j];
      if (next.startsWith("$$") || next.startsWith("##")) continue; // next is another label → skip
      // Content (bullet/text) follows → keep this label (e.g. "Description:", "Role & Description:")
    }

    filtered.push(cur);
  }

  return filtered.join("\n");
}


async function extractFieldsWithAI(resumeText) {
  const prompt = `
Extract resume details and return ONLY a JSON object in UTS (Univision Technology Solutions) company format.

PRIVACY RULES — STRICTLY FOLLOW:
- Do NOT include phone numbers, email addresses, websites, LinkedIn URLs, or any contact details.
- Do NOT include personal details (date of birth, gender, nationality, photo).
- Replace ALL specific employer/company names with "Present Employer" (current job) or "Past Employer" (all previous jobs). Do NOT reveal actual company names anywhere.

FORMATTING RULES:
- For "name": extract the candidate's full name from the resume. It is usually the largest text or the first prominent line. If not explicitly found, infer from filename hints or header text. Do NOT leave name empty if any name-like text exists.
- For "total_experience": always include the unit, e.g. "4.1 years" not just "4.1".
- Each item, bullet point, or entry MUST be on its own separate line using \\n as the separator.
- Do NOT merge multiple bullet points into a single sentence or paragraph.
- For skills: preserve sub-category groupings exactly (e.g. "Design Skills: skill1, skill2\\nVerification Skills: skill3, skill4"). If no sub-categories, list each skill on its own line.
- For work_experience: format each role as "ROLE TITLE [START – END], Employer Type" then bullet points for responsibilities below it.
- For projects: each project MUST start with a numbered header on its own line: "PROJECT 1", "PROJECT 2", "PROJECT 3" etc. (uppercase, sequential).Immediately after the project header, include a title line in this format:"Title: <short, meaningful project title>" Below it, include sub-labels ONLY when they have actual, non-empty values. Format as "Label: value" on one line (e.g. "Duration: 9 Months", "Role: Synthesis & STA"). Do NOT output a label if there is no value for it. For Description and long content, put the label on one line and bullets on the following lines.
- For technical_skills: list each technical skill or tool on its own line.
- For professional_development: list each course, certification, or training on its own line with institution and dates.
- For education: each degree entry on its own line with degree, institution, and year.
- If a section does not exist in the resume, return "" for that field.

Return ONLY valid JSON (no markdown, no code block, no extra text):
{
  "name": "",
  "role": "",
  "total_experience": "",
  "objective": "",
  "professional_summary": "",
  "skills": "",
  "technical_skills": "",
  "work_experience": "",
  "projects": "",
  "professional_development": "",
  "education": ""
}

RESUME TEXT:
${resumeText}
`;

  const result = await ai.generateContent(prompt);
  return extractJSON(result.response.text());
}

/* ================= STEP 1: UPLOAD & EXTRACT ================= */

// export const convertResumeFormatController = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "Resume file missing" });
//     }

//     const buffer = fs.readFileSync(req.file.path);
//     const resumeText = await extractResumeText(buffer);
//     const fields = await extractFieldsWithAI(resumeText);

//     res.json({ success: true, fields });
//   } catch (err) {
//     console.error("Resume extraction error:", err);
//     res.status(500).json({ error: "Resume extraction failed" });
//   }
// };

export const downloadFormattedResume = async (req, res) => {
  const { format } = req.body;

  if (format === "docx") {
    return generateFormattedResumeWord(req, res);
  }

  return generateFormattedResumePDF(req, res);
};


export const convertResumeFormatController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file missing" });
    }

    // ✅ FIX HERE
    const buffer = req.file.buffer;

    const resumeText = await extractResumeText(buffer);
    const fields = await extractFieldsWithAI(resumeText);

    res.json({ success: true, fields });

  } catch (err) {
    console.error("Resume extraction error:", err);
    res.status(500).json({ error: "Resume extraction failed" });
  }
};

/* ================= STEP 2: STREAM PDF WITH LOGO ================= */

export const generateFormattedResumePDF = async (req, res) => {
  try {
    const data = req.body;

    const pdfFileName = data.originalFileName
      ? `${data.originalFileName}.pdf`
      : "Resume.pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${pdfFileName}"`
    );

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 72,
        bottom: 72,
        left: 54,
        right: 54,
      },
    });
    doc.pipe(res);

    // ✅ COMPANY LOGO PATH (YOUR EXACT PATH)
    const logoPath = path.join(
      process.cwd(),
      "src",
      "assest",
      "logo.png"
    );

    // Logo flush to top-right corner (5pt padding from edges)
    const LOGO_WIDTH = 155;
    const LOGO_BOTTOM = 100; // height of logo zone before body starts

    // Every page: draw logo top-right corner, then push cursor below it
    const drawLogoOverlay = () => {
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, doc.page.width - LOGO_WIDTH - doc.page.margins.right, 12, { width: LOGO_WIDTH });
      }
      if (doc.y < LOGO_BOTTOM) {
        doc.y = LOGO_BOTTOM;
      }
    };

    drawLogoOverlay();
    doc.on("pageAdded", drawLogoOverlay);

    //* ===== NAME / ROLE (below logo on page 1) ===== */

    // Name — bold 13pt
    if (data.name) {
      setPdfFont(doc, true);
      doc.text(data.name, { align: "left", lineGap: PDF_LINE_GAP });
    }

    doc.moveDown(0.15);

    // Role — bold 11pt
    if (data.role) {
      setPdfFont(doc, true);
      doc.text(data.role, { align: "left", lineGap: PDF_LINE_GAP });
    }

    if (data.total_experience) {
      doc.moveDown(0.1);
      setPdfFont(doc, false);
      doc.text(`Total Experience: ${data.total_experience}`, { align: "left", lineGap: PDF_LINE_GAP });
    }

    // Thin separator line between name block and sections
    doc.moveDown(0.4);
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .stroke();

    doc.moveDown(0.6);

    // Sections — only render if value is non-empty
    const renderField = (label, value) => {
      if (value && value.trim()) renderModernPdfSection(doc, label, value);
    };

    renderField("Objective", data.objective);
    renderField("Professional Summary", data.professional_summary);
    renderField("Skills", data.skills);
    renderField("Technical Skills", data.technical_skills);
    renderField("Work Experience", data.work_experience);
    renderField("Projects", normalizePointsToNumbered(data.projects));
    renderField("Professional Development", data.professional_development);
    renderField("Education", data.education);

    doc.end();
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({ error: "PDF generation failed" });
  }
};


/* ================= formated resume word ================= */
/* ================= WORD GENERATION ================= */
export const generateFormattedResumeWord = async (req, res) => {
  try {
    const data = req.body;
    const children = [];

    /* ================= LOGO (TOP RIGHT) ================= */

    const logoPath = path.join(
      process.cwd(),
      "src",
      "assest",
      "logo.png"
    );    

    // Spacer below the document header/logo area
    children.push(new Paragraph({ spacing: { after: 120 } }));

    /* ================= HEADER ================= */

    if (data.name) {
      children.push(
        createWordParagraph(
          [createWordRun(data.name, { bold: true })],
          { alignment: AlignmentType.LEFT, spacing: { after: 60, line: WORD_LINE_SPACING } }
        )
      );
    }

    if (data.role) {
      children.push(
        createWordParagraph(
          [createWordRun(data.role)],
          { alignment: AlignmentType.LEFT, spacing: { after: 40, line: WORD_LINE_SPACING } }
        )
      );
    }

    if (data.total_experience) {
      children.push(
        createWordParagraph(
          [createWordRun(`Total Experience: ${data.total_experience}`)],
          { alignment: AlignmentType.LEFT, spacing: { after: 100, line: WORD_LINE_SPACING } }
        )
      );
    }

    children.push(new Paragraph({ spacing: { after: 120 } }));

    /* ================= SECTION HELPER ================= */

    function cleanText(text) {
      if (!text) return "";
      return text.replace(/\r/g, "").trim();
    }

    const addSection = (title, content) => {
      if (!content || content.trim() === "") return;

      // Section heading: bold, same 12 pt size as the body
      children.push(
        createWordParagraph(
          [createWordRun(title.toUpperCase(), { bold: true })],
          { alignment: AlignmentType.LEFT, spacing: { before: 160, after: 60, line: WORD_LINE_SPACING } }
        )
      );

      const cleaned = cleanText(content);
      const lines = cleaned.split("\n");

      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // ## → bold project header
        if (trimmed.startsWith("##")) {
          children.push(
            createWordParagraph(
              [createWordRun(trimmed.slice(2), { bold: true })],
              { alignment: AlignmentType.LEFT, spacing: { before: 80, after: 40, line: WORD_LINE_SPACING } }
            )
          );
          return;
        }

        // $$ → bold label + normal value
        if (trimmed.startsWith("$$")) {
          const raw = trimmed.slice(2);
          const colonIdx = raw.indexOf(":");
          if (colonIdx !== -1 && colonIdx < raw.length - 1) {
            const label = raw.slice(0, colonIdx + 1);
            const value = raw.slice(colonIdx + 1).trim();
            children.push(
              createWordParagraph(
                [
                  createWordRun(label + " ", { bold: true }),
                  createWordRun(value),
                ],
                { alignment: AlignmentType.JUSTIFY, spacing: { after: 40, line: WORD_LINE_SPACING } }
              )
            );
          } else {
            children.push(
              createWordParagraph(
                [createWordRun(raw, { bold: true })],
                { alignment: AlignmentType.LEFT, spacing: { after: 40, line: WORD_LINE_SPACING } }
              )
            );
          }
          return;
        }

        // Work experience role header: bold if contains employer marker
        if (/\b(present employer|past employer)\b/i.test(trimmed)) {
          children.push(
            createWordParagraph(
              [createWordRun(trimmed, { bold: true })],
              { alignment: AlignmentType.LEFT, spacing: { before: 40, after: 40, line: WORD_LINE_SPACING } }
            )
          );
          return;
        }

        // Skill category / metadata: "Label: values" → bold label + normal value
        if (/^[A-Za-z][A-Za-z &\/()\-\.]+:\s+\S/.test(trimmed) && !trimmed.startsWith("•")) {
          const colonIdx = trimmed.indexOf(":");
          const label = trimmed.slice(0, colonIdx + 1);
          const value = trimmed.slice(colonIdx + 1).trim();
          children.push(
            createWordParagraph(
              [
                createWordRun(label + " ", { bold: true }),
                createWordRun(value),
              ],
              { alignment: AlignmentType.JUSTIFY, spacing: { after: 40, line: WORD_LINE_SPACING } }
            )
          );
          return;
        }

        // All other lines (bullets, normal text) — justified
        children.push(
          createWordParagraph(
            [createWordRun(trimmed)],
            { alignment: AlignmentType.JUSTIFY, spacing: { after: 40, line: WORD_LINE_SPACING } }
          )
        );
      });

      children.push(new Paragraph({ spacing: { after: 80 } }));
    };


    /* ================= ADD SECTIONS ================= */

    addSection("Objective", data.objective);
    addSection("Professional Summary", data.professional_summary);
    addSection("Skills", data.skills);
    addSection("Technical Skills", data.technical_skills);
    addSection("Work Experience", data.work_experience);
    addSection("Projects", normalizePointsToNumbered(data.projects));
    addSection("Professional Development", data.professional_development);
    addSection("Education", data.education);

    /* ================= BUILD DOC ================= */

    

    let header;

    if (fs.existsSync(logoPath)) {
      header = new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 0, after: 0 },
            children: [
              new ImageRun({
                data: fs.readFileSync(logoPath),
                transformation: {
                  width: 155,
                  height: 60,
                },
              }),
            ],
          }),
        ],
      });
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1080,
                bottom: 1440,
                left: 1080,
                header: 360,
                footer: 720,
              },
            },
          },
          headers: {
            default: header,
          },
          children: children,
        },
      ],
    });


    const buffer = await Packer.toBuffer(doc);
    
    const docxFileName = data.originalFileName
      ? `${data.originalFileName}.docx`
      : "Resume.docx";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${docxFileName}"`
    );

    res.send(buffer);

  } catch (err) {
    console.error("Word generation error:", err);
    res.status(500).json({ error: "Word generation failed" });
  }
};

function cleanText(text) {
  if (!text) return "";

  return text
    .replace(/-\s+/g, "")     // remove broken hyphen words
    .replace(/\s+/g, " ")
    .trim();
}

const PDF_FONT = "Times-Roman";
const PDF_FONT_BOLD = "Times-Bold";
const PDF_FONT_SIZE = 12;
const PDF_LINE_GAP = 1;
const PDF_FONT_FILE = "C:\\Windows\\Fonts\\times.ttf";
const PDF_FONT_BOLD_FILE = "C:\\Windows\\Fonts\\timesbd.ttf";

function setPdfFont(doc, bold = false) {
  doc.font(fs.existsSync(bold ? PDF_FONT_BOLD_FILE : PDF_FONT_FILE)
    ? (bold ? PDF_FONT_BOLD_FILE : PDF_FONT_FILE)
    : (bold ? PDF_FONT_BOLD : PDF_FONT));
  doc.fontSize(PDF_FONT_SIZE);
}

function renderModernPdfSection(doc, title, content) {
  if (!content || content.trim() === "") return;

  doc.moveDown(0.5);

  setPdfFont(doc, true);
  doc.fillColor("#000000")
    .text(title.toUpperCase(), { align: "left", lineGap: PDF_LINE_GAP });

  doc.moveDown(0.25);
  setPdfFont(doc, false);

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    if (line.startsWith("##")) {
      doc.moveDown(0.2);
      setPdfFont(doc, true);
      doc.text(line.slice(2), { align: "left", lineGap: PDF_LINE_GAP });
      setPdfFont(doc, false);
      doc.moveDown(0.1);
      return;
    }

    if (line.startsWith("$$")) {
      const raw = line.slice(2);
      const colonIdx = raw.indexOf(":");
      if (colonIdx !== -1 && colonIdx < raw.length - 1) {
        const label = raw.slice(0, colonIdx + 1);
        const value = raw.slice(colonIdx + 1).trim();
        setPdfFont(doc, true);
        doc.text(label + " ", { continued: true, lineGap: PDF_LINE_GAP });
        setPdfFont(doc, false);
        doc.text(value, { align: "justify", lineGap: PDF_LINE_GAP });
      } else {
        setPdfFont(doc, true);
        doc.text(raw, { lineGap: PDF_LINE_GAP });
        setPdfFont(doc, false);
      }
      doc.moveDown(0.15);
      return;
    }

    if (/\b(present employer|past employer)\b/i.test(line) && !line.startsWith("â€¢")) {
      setPdfFont(doc, true);
      doc.text(line, { align: "left", lineGap: PDF_LINE_GAP });
      setPdfFont(doc, false);
      doc.moveDown(0.15);
      return;
    }

    if (/^[A-Za-z][A-Za-z &\/()\-\.]+:\s+\S/.test(line) && !line.startsWith("â€¢")) {
      const colonIdx = line.indexOf(":");
      const label = line.slice(0, colonIdx + 1);
      const value = line.slice(colonIdx + 1).trim();
      setPdfFont(doc, true);
      doc.text(label + " ", { continued: true, lineGap: PDF_LINE_GAP });
      setPdfFont(doc, false);
      doc.text(value, { align: "justify", lineGap: PDF_LINE_GAP });
      doc.moveDown(0.15);
      return;
    }

    if (line.startsWith("â€¢")) {
      setPdfFont(doc, false);
      doc.text(line, { indent: 10, align: "justify", lineGap: PDF_LINE_GAP });
      doc.moveDown(0.1);
      return;
    }

    setPdfFont(doc, false);
    doc.text(line, { align: "justify", lineGap: PDF_LINE_GAP });
    doc.moveDown(0.1);
  });

  doc.moveDown(0.15);
}

const WORD_FONT = "Times New Roman";
const WORD_FONT_SIZE = 24; // 12pt
const WORD_LINE_SPACING = 276;
const WORD_PARAGRAPH_SPACING = { after: 80, line: WORD_LINE_SPACING, lineRule: "auto" };

function createWordRun(text, options = {}) {
  return new TextRun({
    text: text ?? "",
    font: WORD_FONT,
    size: WORD_FONT_SIZE,
    bold: options.bold ?? false,
  });
}

function createWordParagraph(children, options = {}) {
  return new Paragraph({
    children,
    alignment: options.alignment ?? AlignmentType.JUSTIFY,
    spacing: {
      ...WORD_PARAGRAPH_SPACING,
      ...(options.spacing || {}),
    },
    indent: options.indent,
  });
}


/* ================= HELPERS ================= */

function renderSection(doc, title, content) {
  if (!content || content.trim() === "") return;

  doc.moveDown(0.5);

  // Section heading — bold 12pt ALL CAPS
  doc.fontSize(12)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text(title.toUpperCase(), { align: "left" });

  doc.moveDown(0.3);

  doc.fontSize(10.5).font("Helvetica");

  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  lines.forEach((line) => {

    // ## → named/numbered project header (bold)
    if (line.startsWith("##")) {
      doc.moveDown(0.3);
      doc.font("Helvetica-Bold").fontSize(10.5)
        .text(line.slice(2), { align: "left", lineGap: 2 });
      doc.font("Helvetica").fontSize(10.5);
      doc.moveDown(0.15);
      return;
    }

    // $$ → bold label: normal value on same line
    if (line.startsWith("$$")) {
      const raw = line.slice(2);
      const colonIdx = raw.indexOf(":");
      if (colonIdx !== -1 && colonIdx < raw.length - 1) {
        const label = raw.slice(0, colonIdx + 1);
        const value = raw.slice(colonIdx + 1).trim();
        doc.font("Helvetica-Bold").fontSize(10.5)
          .text(label + " ", { continued: true, lineGap: 2 });
        doc.font("Helvetica").fontSize(10.5)
          .text(value, { align: "justify", lineGap: 2 });
      } else {
        doc.font("Helvetica-Bold").fontSize(10.5).text(raw, { lineGap: 2 });
        doc.font("Helvetica").fontSize(10.5);
      }
      doc.moveDown(0.2);
      return;
    }

    // Work experience role header: bold if line contains employer marker
    if (/\b(present employer|past employer)\b/i.test(line) && !line.startsWith("•")) {
      doc.font("Helvetica-Bold").fontSize(10.5)
        .text(line, { align: "left", lineGap: 2 });
      doc.font("Helvetica").fontSize(10.5);
      doc.moveDown(0.2);
      return;
    }

    // Skill category / metadata: "Label: values" → bold label + normal value
    if (/^[A-Za-z][A-Za-z &\/()\-\.]+:\s+\S/.test(line) && !line.startsWith("•")) {
      const colonIdx = line.indexOf(":");
      const label = line.slice(0, colonIdx + 1);
      const value = line.slice(colonIdx + 1).trim();
      doc.font("Helvetica-Bold").fontSize(10.5)
        .text(label + " ", { continued: true, lineGap: 2 });
      doc.font("Helvetica").fontSize(10.5)
        .text(value, { align: "justify", lineGap: 2 });
      doc.moveDown(0.25);
      return;
    }

    // Bullet line
    if (line.startsWith("•")) {
      doc.font("Helvetica").fontSize(10.5)
        .text(line, { indent: 10, align: "justify", lineGap: 2 });
      doc.moveDown(0.2);
      return;
    }

    // Normal text — justified
    doc.font("Helvetica").fontSize(10.5)
      .text(line, { align: "justify", lineGap: 2 });
    doc.moveDown(0.2);
  });

  doc.moveDown(0.2);
}


function wordSection(title, content) {
  if (!content) return [];

  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const section = [];

  section.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 24,
          font: WORD_FONT
        })
      ],
      spacing: { before: 300, after: 200, line: WORD_LINE_SPACING }
    })
  );

  lines.forEach(line => {
    section.push(
      new Paragraph({
        children: [
        new TextRun({
          text: line,
          size: 24,
          font: WORD_FONT
        })
      ],
        spacing: { after: 150, line: WORD_LINE_SPACING }
      })
    );
  });

  return section;
}

function extractJSON(text) {
  if (!text) throw new Error("Empty AI response");

  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("Invalid JSON from AI");
  }

  const jsonSnippet = cleaned.substring(start, end + 1);

  try {
    return JSON.parse(jsonSnippet);
  } catch (err) {
    // If parse fails due to control characters, escape them and retry
    const escaped = jsonSnippet.replace(/[\u0000-\u001F]/g, (c) => {
      return "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
    });

    try {
      return JSON.parse(escaped);
    } catch (err2) {
      console.error("extractJSON: failed to parse AI response");
      console.error("Original response (trimmed):", cleaned);
      console.error("JSON snippet:", jsonSnippet);
      console.error("Escaped snippet:", escaped);
      throw new Error("Failed to parse JSON from AI response: " + err2.message);
    }
  }
}

/* ================= OTHER EXISTING FEATURES (UNCHANGED) ================= */
export const parseResumeController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file missing" });
    }

    // 🔥 IMPORTANT CHANGE
    const parsedData = await parseResume(
      req.file.buffer,
      req.file.mimetype
    );

    res.json(parsedData);

  } catch (err) {
    console.error("Resume parsing error:", err);
    res.status(500).json({ error: "Resume parsing failed" });
  }
};

// export const parseResumeController = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "Resume file missing" });
//     }
//     const parsedData = await parseResume(req.file.path);
//     res.json(parsedData);
//   } catch (err) {
//     console.error("Resume parsing error:", err);
//     res.status(500).json({ error: "Resume parsing failed" });
//   }
// };

export const analyzeResumeForJD = async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "resumeText and jobDescription are required",
      });
    }

    const prompt = `
Return ONLY JSON:
{
  "matchScore": 0,
  "strengths": [],
  "missingSkills": [],
  "recommendation": ""
}

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}
`;

    const result = await ai.generateContent(prompt);
    const analysis = extractJSON(result.response.text());

    res.json({ success: true, analysis });
  } catch (err) {
    console.error("Resume analysis error:", err.message);
    res.status(500).json({ error: "Resume analysis failed" });
  }
};

export const getJDSuggestionsForResume = async (req, res) => {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription) {
      return res.status(400).json({ error: "jobDescription is required" });
    }

    const prompt = `
Return ONLY JSON:
{
  "jobTitles": [],
  "primarySkills": [],
  "secondarySkills": [],
  "toolsAndTechnologies": [],
  "booleanSearch": "",
  "naukriTags": []
}

JOB DESCRIPTION:
${jobDescription}
`;

    const result = await ai.generateContent(prompt);
    const suggestions = extractJSON(result.response.text());

    res.json({ success: true, suggestions });
  } catch (err) {
    console.error("JD suggestion error:", err.message);
    res.status(500).json({ error: "JD suggestions failed" });
  }
};

export const getInterviewTips = async (req, res) => {
  try {
    const { position, candidateName } = req.body;

    if (!position) {
      return res.status(400).json({ error: "position is required" });
    }

    const prompt = `
Return ONLY JSON:
{
  "technicalQuestions": [],
  "behavioralQuestions": [],
  "preparationTips": [],
  "whatToExpect": ""
}

Position: ${position}
Candidate: ${candidateName || "Candidate"}
`;

    const result = await ai.generateContent(prompt);
    const tips = extractJSON(result.response.text());

    res.json({ success: true, tips });
  } catch (err) {
    console.error("Interview tips error:", err.message);
    res.status(500).json({ error: "Interview tips failed" });
  }
};

// import path from "path";
// import fs from "fs";
// import PDFDocument from "pdfkit";
// import extractResumeText from "../utils/resumeExtractor.js";
// import { ai } from "../config/gemini.js";
// import { parseResume } from "../services/documentAI.js"; // if used elsewhere

// /* ================= EXTRACT FIELDS USING AI ================= */

// async function extractFieldsWithAI(resumeText) {
//   const prompt = `
// Extract resume details.

// Return ONLY JSON:
// {
//   "name": "",
//   "role": "",
//   "total_experience": "",
//   "objective": "",
//   "professional_summary": "",
//   "work_experience": "",
//   "projects": "",
//   "education": ""
// }

// RESUME TEXT:
// ${resumeText}
// `;

//   const result = await ai.generateContent(prompt);
//   const text = result.response.text();

//   return extractJSON(text);
// }

// /* ================= STEP 1: UPLOAD → EXTRACT → RETURN JSON ================= */

// export const convertResumeFormatController = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "Resume file missing" });
//     }

//     const buffer = fs.readFileSync(req.file.path);
//     const resumeText = await extractResumeText(buffer);
//     const fields = await extractFieldsWithAI(resumeText);

//     // ❗ DO NOT CREATE PDF HERE
//     res.json({
//       success: true,
//       fields,
//     });

//   } catch (err) {
//     console.error("Resume extraction error:", err);
//     res.status(500).json({ error: "Resume extraction failed" });
//   }
// };

// /* ================= STEP 2: GENERATE PDF FROM EDITED DATA ================= */
// export const generateFormattedResumePDF = async (req, res) => {
//   try {
//     const data = req.body;

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       "attachment; filename=Resume.pdf"
//     );

//     const doc = new PDFDocument({ margin: 40 });
//     doc.pipe(res);

//     // LOGO
//     const logoPath = path.join(process.cwd(), "logo.png");
//     if (fs.existsSync(logoPath)) {
//       doc.image(logoPath, doc.page.width - 160, 20, { width: 120 });
//     }

//     doc.moveDown(2);

//     doc.fontSize(18).font("Helvetica-Bold").text(data.name || "");
//     doc.fontSize(14).font("Helvetica").text(data.role || "");
//     doc.fontSize(12).text(`Total Experience: ${data.total_experience || ""}`);
//     doc.moveDown();

//     section(doc, "Objective", data.objective);
//     section(doc, "Professional Summary", data.professional_summary);
//     section(doc, "Work Experience", data.work_experience);
//     section(doc, "Projects", data.projects);
//     section(doc, "Education", data.education);

//     doc.end();
//   } catch (err) {
//     console.error("PDF generation error:", err);
//     res.status(500).json({ error: "PDF generation failed" });
//   }
// };

// // export const generateFormattedResumePDF = async (req, res) => {
// //   try {
// //     const data = req.body;

// //     const outputDir = path.join(process.cwd(), "uploads/converted");
// //     if (!fs.existsSync(outputDir)) {
// //       fs.mkdirSync(outputDir, { recursive: true });
// //     }

// //     const fileName = `converted_${Date.now()}.pdf`;
// //     const filePath = path.join(outputDir, fileName);

// //     const doc = new PDFDocument({ margin: 40 });
// //     const stream = fs.createWriteStream(filePath);
// //     doc.pipe(stream);

// //     /* ===== LOGO ===== */
// //     const logoPath = path.join(process.cwd(), "logo.png");
// //     if (fs.existsSync(logoPath)) {
// //       doc.image(logoPath, doc.page.width - 160, 20, { width: 120 });
// //     }

// //     doc.moveDown(2);

// //     /* ===== CONTENT ===== */
// //     doc.fontSize(18).font("Helvetica-Bold").text(data.name || "");
// //     doc.fontSize(14).font("Helvetica").text(data.role || "");
// //     doc.fontSize(12).text(`Total Experience: ${data.total_experience || ""}`);
// //     doc.moveDown();

// //     section(doc, "Objective", data.objective);
// //     section(doc, "Professional Summary", data.professional_summary);
// //     section(doc, "Work Experience", data.work_experience);
// //     section(doc, "Projects", data.projects);
// //     section(doc, "Education", data.education);

// //     doc.end();

// //     stream.on("finish", () => {
// //       res.json({
// //         success: true,
// //         downloadUrl: `/uploads/converted/${fileName}`,
// //       });
// //     });

// //   } catch (err) {
// //     console.error("PDF generation error:", err);
// //     res.status(500).json({ error: "PDF generation failed" });
// //   }
// // };

// /* ================= HELPER ================= */

// function section(doc, title, content) {
//   doc.fontSize(13).font("Helvetica-Bold").text(title);
//   doc.font("Helvetica").fontSize(12).text(content || "-");
//   doc.moveDown();
// }

// function extractJSON(text) {
//   if (!text) throw new Error("Empty AI response");

//   const cleaned = text
//     .replace(/```json/gi, "")
//     .replace(/```/g, "")
//     .trim();

//   const start = cleaned.indexOf("{");
//   const end = cleaned.lastIndexOf("}");

//   if (start === -1 || end === -1) {
//     throw new Error("No JSON found in AI output");
//   }

//   return JSON.parse(cleaned.substring(start, end + 1));
// }

// /* ================= RESUME PARSE ================= */

// export const parseResumeController = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: "Resume file missing" });
//     }

//     const parsedData = await parseResume(req.file.path);
//     res.json(parsedData);
//   } catch (err) {
//     console.error("Resume parsing error:", err);
//     res.status(500).json({ error: "Resume parsing failed" });
//   }
// };

// /* ================= RESUME vs JD ================= */

// export const analyzeResumeForJD = async (req, res) => {
//   try {
//     const { resumeText, jobDescription } = req.body;

//     if (!resumeText || !jobDescription) {
//       return res.status(400).json({
//         error: "resumeText and jobDescription are required",
//       });
//     }

//     const prompt = `
// You are an ATS system.

// Return ONLY JSON:
// {
//   "matchScore": 0,
//   "strengths": [],
//   "missingSkills": [],
//   "recommendation": ""
// }

// JOB DESCRIPTION:
// ${jobDescription}

// RESUME:
// ${resumeText}
// `;

//     const result = await ai.generateContent(prompt);
//     const analysis = extractJSON(result.response.text());

//     res.json({ success: true, analysis });
//   } catch (error) {
//     console.error("Resume analysis error:", error.message);
//     res.status(500).json({
//       error: "Resume analysis failed",
//       details: error.message,
//     });
//   }
// };

// /* ================= JD SUGGESTIONS ================= */

// export const getJDSuggestionsForResume = async (req, res) => {
//   try {
//     const { jobDescription } = req.body;

//     if (!jobDescription) {
//       return res.status(400).json({ error: "jobDescription is required" });
//     }

//     const prompt = `
// Return ONLY JSON:
// {
//   "jobTitles": [],
//   "primarySkills": [],
//   "secondarySkills": [],
//   "toolsAndTechnologies": [],
//   "booleanSearch": "",
//   "naukriTags": []
// }

// JOB DESCRIPTION:
// ${jobDescription}
// `;

//     const result = await ai.generateContent(prompt);
//     const suggestions = extractJSON(result.response.text());

//     res.json({ success: true, suggestions });
//   } catch (error) {
//     console.error("JD suggestion error:", error.message);
//     res.status(500).json({
//       error: "JD suggestions failed",
//       details: error.message,
//     });
//   }
// };

// /* ================= INTERVIEW TIPS ================= */

// export const getInterviewTips = async (req, res) => {
//   try {
//     const { position, candidateName } = req.body;

//     if (!position) {
//       return res.status(400).json({ error: "position is required" });
//     }

//     const prompt = `
// Return ONLY JSON:
// {
//   "technicalQuestions": [],
//   "behavioralQuestions": [],
//   "preparationTips": [],
//   "whatToExpect": ""
// }

// Position: ${position}
// Candidate: ${candidateName || "Candidate"}
// `;

//     const result = await ai.generateContent(prompt);
//     const tips = extractJSON(result.response.text());

//     res.json({ success: true, tips });
//   } catch (error) {
//     console.error("Interview tips error:", error.message);
//     res.status(500).json({
//       error: "Interview tips failed",
//       details: error.message,
//     });
//   }
// };

// // import path from "path";
// // import fs from "fs";
// // import PDFDocument from "pdfkit";
// // import extractResumeText from "../utils/resumeExtractor.js";
// // import { ai } from "../config/gemini.js";

// // /* ================= EXTRACT FIELDS USING AI ================= */

// // async function extractFieldsWithAI(resumeText) {
// //   const prompt = `
// // Extract resume details.

// // Return ONLY JSON:
// // {
// //   "name": "",
// //   "role": "",
// //   "total_experience": "",
// //   "objective": "",
// //   "professional_summary": "",
// //   "work_experience": "",
// //   "projects": "",
// //   "education": ""
// // }

// // RESUME TEXT:
// // ${resumeText}
// // `;

// //   const result = await ai.generateContent(prompt);
// //   const text = result.response.text();

// //   return JSON.parse(
// //     text.replace(/```json|```/g, "").trim()
// //   );
// // }

// // /* ================= STEP 1: UPLOAD → EXTRACT → RETURN JSON ================= */

// // export const convertResumeFormatController = async (req, res) => {
// //   try {
// //     if (!req.file) {
// //       return res.status(400).json({ error: "Resume file missing" });
// //     }

// //     const buffer = fs.readFileSync(req.file.path);
// //     const resumeText = await extractResumeText(buffer);

// //     const fields = await extractFieldsWithAI(resumeText);

// //     // DO NOT CREATE PDF HERE
// //     res.json({
// //       success: true,
// //       fields
// //     });

// //   } catch (err) {
// //     console.error("Resume extraction error:", err);
// //     res.status(500).json({ error: "Resume extraction failed" });
// //   }
// // };

// // /* ================= STEP 2: GENERATE PDF FROM EDITED DATA ================= */

// // export const generateFormattedResumePDF = async (req, res) => {
// //   try {
// //     const data = req.body;

// //     const outputDir = path.join(process.cwd(), "uploads/converted");
// //     if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// //     const fileName = `converted_${Date.now()}.pdf`;
// //     const filePath = path.join(outputDir, fileName);

// //     const doc = new PDFDocument({ margin: 40 });
// //     const stream = fs.createWriteStream(filePath);
// //     doc.pipe(stream);

// //     // Logo
// //     const logoPath = path.join(process.cwd(), "logo.png");
// //     if (fs.existsSync(logoPath)) {
// //       doc.image(logoPath, doc.page.width - 160, 20, { width: 120 });
// //     }

// //     doc.moveDown(2);

// //     doc.fontSize(18).font("Helvetica-Bold").text(data.name);
// //     doc.fontSize(14).text(data.role);
// //     doc.fontSize(12).text(`Total Experience: ${data.total_experience}`);
// //     doc.moveDown();

// //     doc.fontSize(13).font("Helvetica-Bold").text("Objective");
// //     doc.font("Helvetica").text(data.objective);
// //     doc.moveDown();

// //     doc.font("Helvetica-Bold").text("Professional Summary");
// //     doc.font("Helvetica").text(data.professional_summary);
// //     doc.moveDown();

// //     doc.font("Helvetica-Bold").text("Work Experience");
// //     doc.font("Helvetica").text(data.work_experience);
// //     doc.moveDown();

// //     doc.font("Helvetica-Bold").text("Projects");
// //     doc.font("Helvetica").text(data.projects);
// //     doc.moveDown();

// //     doc.font("Helvetica-Bold").text("Education");
// //     doc.font("Helvetica").text(data.education);

// //     doc.end();

// //     stream.on("finish", () => {
// //       res.json({
// //         success: true,
// //         downloadUrl: `/uploads/converted/${fileName}`
// //       });
// //     });

// //   } catch (err) {
// //     console.error("PDF generation error:", err);
// //     res.status(500).json({ error: "PDF generation failed" });
// //   }
// // };



// // /* ================= HELPER ================= */

// // function extractJSON(text) {
// //   if (!text) throw new Error('Empty AI response');

// //   const cleaned = text
// //     .replace(/```json/gi, '')
// //     .replace(/```/g, '')
// //     .trim();

// //   const start = cleaned.indexOf('{');
// //   const end = cleaned.lastIndexOf('}');

// //   if (start === -1 || end === -1) {
// //     throw new Error('No JSON found in AI output');
// //   }

// //   return JSON.parse(cleaned.substring(start, end + 1));
// // }

// // /* ================= RESUME PARSE ================= */

// // export const parseResumeController = async (req, res) => {
// //   try {
// //     if (!req.file) {
// //       return res.status(400).json({ error: 'Resume file missing' });
// //     }

// //     const parsedData = await parseResume(req.file.path);
// //     res.json(parsedData);
// //   } catch (err) {
// //     console.error('Resume parsing error:', err);
// //     res.status(500).json({ error: 'Resume parsing failed' });
// //   }
// // };

// // /* ================= RESUME vs JD ANALYSIS ================= */

// // export const analyzeResumeForJD = async (req, res) => {
// //   try {
// //     const { resumeText, jobDescription } = req.body;

// //     if (!resumeText || !jobDescription) {
// //       return res.status(400).json({
// //         error: 'resumeText and jobDescription are required',
// //       });
// //     }

// //     const prompt = `
// // You are an ATS system.

// // Analyze the resume against the job description.

// // Return ONLY JSON:
// // {
// //   "matchScore": 0,
// //   "strengths": [],
// //   "missingSkills": [],
// //   "recommendation": ""
// // }

// // JOB DESCRIPTION:
// // ${jobDescription}

// // RESUME:
// // ${resumeText}
// // `;

// //     const result = await ai.generateContent(prompt);
// //     const output = result.response.text();

// //     const analysis = extractJSON(output);

// //     res.json({ success: true, analysis });
// //   } catch (error) {
// //     console.error('Resume analysis error:', error.message);
// //     res.status(500).json({
// //       error: 'Resume analysis failed',
// //       details: error.message,
// //     });
// //   }
// // };

// // /* ================= JD SUGGESTIONS ================= */

// // export const getJDSuggestionsForResume = async (req, res) => {
// //   try {
// //     const { jobDescription } = req.body;

// //     if (!jobDescription) {
// //       return res.status(400).json({ error: 'jobDescription is required' });
// //     }

// //     const prompt = `
// // Generate Naukri keywords.

// // Return ONLY JSON:
// // {
// //   "jobTitles": [],
// //   "primarySkills": [],
// //   "secondarySkills": [],
// //   "toolsAndTechnologies": [],
// //   "booleanSearch": "",
// //   "naukriTags": []
// // }

// // JOB DESCRIPTION:
// // ${jobDescription}
// // `;

// //     const result = await ai.generateContent(prompt);
// //     const output = result.response.text();

// //     const suggestions = extractJSON(output);

// //     res.json({ success: true, suggestions });
// //   } catch (error) {
// //     console.error('JD suggestion error:', error.message);
// //     res.status(500).json({
// //       error: 'JD suggestions failed',
// //       details: error.message,
// //     });
// //   }
// // };

// // /* ================= INTERVIEW TIPS ================= */

// // export const getInterviewTips = async (req, res) => {
// //   try {
// //     const { position, candidateName } = req.body;

// //     if (!position) {
// //       return res.status(400).json({ error: 'position is required' });
// //     }

// //     const prompt = `
// // Generate interview tips in JSON:
// // {
// //   "technicalQuestions": [],
// //   "behavioralQuestions": [],
// //   "preparationTips": [],
// //   "whatToExpect": ""
// // }

// // Position: ${position}
// // Candidate: ${candidateName || 'Candidate'}
// // `;

// //     const result = await ai.generateContent(prompt);
// //     const output = result.response.text();

// //     const tips = extractJSON(output);

// //     res.json({ success: true, tips });
// //   } catch (error) {
// //     console.error('Interview tips error:', error.message);
// //     res.status(500).json({
// //       error: 'Interview tips failed',
// //       details: error.message,
// //     });
// //   }
// // };

// // // import { parseResume } from '../services/documentAI.js';
// // // import { ai } from '../config/gemini.js';

// // // /* ================= HELPER ================= */

// // // /**
// // //  * Extract valid JSON from AI text safely
// // //  */
// // // function extractJSON(text) {
// // //   if (!text) throw new Error('Empty AI response');

// // //   // Remove ```json ``` or ``` wrappers
// // //   const cleaned = text
// // //     .replace(/```json/gi, '')
// // //     .replace(/```/g, '')
// // //     .trim();

// // //   // Extract JSON object
// // //   const firstBrace = cleaned.indexOf('{');
// // //   const lastBrace = cleaned.lastIndexOf('}');

// // //   if (firstBrace === -1 || lastBrace === -1) {
// // //     throw new Error('No JSON object found in AI response');
// // //   }

// // //   const jsonString = cleaned.substring(firstBrace, lastBrace + 1);
// // //   return JSON.parse(jsonString);
// // // }

// // // /* ================= RESUME PARSE ================= */

// // // export const parseResumeController = async (req, res) => {
// // //   try {
// // //     if (!req.file) {
// // //       return res.status(400).json({ error: 'Resume file missing' });
// // //     }

// // //     const parsedData = await parseResume(req.file.path);
// // //     res.json(parsedData);
// // //   } catch (err) {
// // //     console.error('Resume parsing error:', err);
// // //     res.status(500).json({ error: 'Resume parsing failed' });
// // //   }
// // // };

// // // /* ================= RESUME vs JD ANALYSIS ================= */

// // // export const analyzeResumeForJD = async (req, res) => {
// // //   try {
// // //     const { resumeText, jobDescription } = req.body;

// // //     if (!resumeText || !jobDescription) {
// // //       return res.status(400).json({
// // //         error: 'resumeText and jobDescription are required',
// // //       });
// // //     }

// // //     const prompt = `
// // // You are a senior HR recruiter.

// // // Analyze the resume against the job description.

// // // Return ONLY JSON in this format:
// // // {
// // //   "matchScore": 0,
// // //   "strengths": [],
// // //   "missingSkills": [],
// // //   "recommendation": ""
// // // }

// // // JOB DESCRIPTION:
// // // ${jobDescription}

// // // RESUME:
// // // ${resumeText}
// // // `;

// // //     const result = await ai.generateContent(prompt);
// // //     const output = result.response.text();

// // //     const analysis = extractJSON(output);

// // //     res.json({
// // //       success: true,
// // //       analysis,
// // //     });
// // //   } catch (error) {
// // //     console.error('Resume analysis error:', error.message);
// // //     res.status(500).json({
// // //       error: 'Resume analysis failed',
// // //       details: error.message,
// // //     });
// // //   }
// // // };

// // // /* ================= JD → NAUKRI SUGGESTIONS ================= */

// // // export const getJDSuggestionsForResume = async (req, res) => {
// // //   try {
// // //     const { jobDescription } = req.body;

// // //     if (!jobDescription) {
// // //       return res.status(400).json({ error: 'jobDescription is required' });
// // //     }

// // //     const prompt = `
// // // Generate Naukri search keywords.

// // // Return ONLY JSON:
// // // {
// // //   "jobTitles": [],
// // //   "primarySkills": [],
// // //   "secondarySkills": [],
// // //   "toolsAndTechnologies": [],
// // //   "booleanSearch": "",
// // //   "naukriTags": []
// // // }

// // // JOB DESCRIPTION:
// // // ${jobDescription}
// // // `;

// // //     const result = await ai.generateContent(prompt);
// // //     const output = result.response.text();

// // //     const suggestions = extractJSON(output);

// // //     res.json({
// // //       success: true,
// // //       suggestions,
// // //     });
// // //   } catch (error) {
// // //     console.error('JD suggestion error:', error.message);
// // //     res.status(500).json({
// // //       error: 'JD suggestions failed',
// // //       details: error.message,
// // //     });
// // //   }
// // // };

// // // /* ================= INTERVIEW TIPS ================= */

// // // export const getInterviewTips = async (req, res) => {
// // //   try {
// // //     const { position, candidateName } = req.body;

// // //     if (!position) {
// // //       return res.status(400).json({ error: 'position is required' });
// // //     }

// // //     const prompt = `
// // // Generate interview tips in JSON only:
// // // {
// // //   "technicalQuestions": [],
// // //   "behavioralQuestions": [],
// // //   "preparationTips": [],
// // //   "whatToExpect": ""
// // // }

// // // Position: ${position}
// // // Candidate: ${candidateName || 'Candidate'}
// // // `;

// // //     const result = await ai.generateContent(prompt);
// // //     const output = result.response.text();

// // //     const tips = extractJSON(output);

// // //     res.json({
// // //       success: true,
// // //       tips,
// // //     });
// // //   } catch (error) {
// // //     console.error('Interview tips error:', error.message);
// // //     res.status(500).json({
// // //       error: 'Interview tips failed',
// // //       details: error.message,
// // //     });
// // //   }
// // // };

// // // // import { parseResume } from '../services/documentAI.js';
// // // // import { ai } from '../config/gemini.js';

// // // // /**
// // // //  * Resume parsing using Document AI
// // // //  */
// // // // export const parseResumeController = async (req, res) => {
// // // //   try {
// // // //     if (!req.file) {
// // // //       return res.status(400).json({ error: 'Resume file missing' });
// // // //     }

// // // //     const parsedData = await parseResume(req.file.path);
// // // //     res.json(parsedData);
// // // //   } catch (err) {
// // // //     console.error('Resume parsing error:', err);
// // // //     res.status(500).json({ error: 'Resume parsing failed' });
// // // //   }
// // // // };

// // // // /**
// // // //  * Resume vs Job Description analysis (Gemini)
// // // //  */
// // // // export const analyzeResumeForJD = async (req, res) => {
// // // //   try {
// // // //     const { resumeText, jobDescription } = req.body;

// // // //     if (!resumeText || !jobDescription) {
// // // //       return res.status(400).json({
// // // //         error: 'resumeText and jobDescription are required',
// // // //       });
// // // //     }

// // // //     const prompt = `
// // // // You are a senior HR recruiter.

// // // // Analyze the resume against the job description.

// // // // Return ONLY valid JSON:
// // // // {
// // // //   "matchScore": 0.0,
// // // //   "strengths": [],
// // // //   "missingSkills": [],
// // // //   "recommendation": ""
// // // // }

// // // // JOB DESCRIPTION:
// // // // ${jobDescription}

// // // // RESUME:
// // // // ${resumeText}
// // // // `;

// // // //     const result = await ai.generateContent(prompt);
// // // //     const output = result.response.text();

// // // //     res.json({
// // // //       success: true,
// // // //       analysis: JSON.parse(output),
// // // //     });
// // // //   } catch (error) {
// // // //     console.error('Resume analysis error:', error);
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // };

// // // // /**
// // // //  * JD → Naukri keyword suggestions
// // // //  */
// // // // export const getJDSuggestionsForResume = async (req, res) => {
// // // //   try {
// // // //     const { jobDescription } = req.body;

// // // //     if (!jobDescription) {
// // // //       return res.status(400).json({ error: 'jobDescription is required' });
// // // //     }

// // // //     const prompt = `
// // // // Generate Naukri search keywords in JSON only:

// // // // {
// // // //   "jobTitles": [],
// // // //   "primarySkills": [],
// // // //   "secondarySkills": [],
// // // //   "toolsAndTechnologies": [],
// // // //   "booleanSearch": "",
// // // //   "naukriTags": []
// // // // }

// // // // JOB DESCRIPTION:
// // // // ${jobDescription}
// // // // `;

// // // //     const result = await ai.generateContent(prompt);
// // // //     const text = result.response.text().replace(/```json|```/g, '').trim();

// // // //     res.json({
// // // //       success: true,
// // // //       suggestions: JSON.parse(text),
// // // //     });
// // // //   } catch (error) {
// // // //     console.error('JD suggestion error:', error);
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // };

// // // // /**
// // // //  * Interview preparation tips
// // // //  */
// // // // export const getInterviewTips = async (req, res) => {
// // // //   try {
// // // //     const { position, candidateName } = req.body;

// // // //     const prompt = `
// // // // Generate interview tips in JSON:

// // // // {
// // // //   "technicalQuestions": [],
// // // //   "behavioralQuestions": [],
// // // //   "preparationTips": [],
// // // //   "whatToExpect": ""
// // // // }

// // // // Position: ${position}
// // // // Candidate: ${candidateName}
// // // // `;

// // // //     const result = await ai.generateContent(prompt);
// // // //     const output = result.response.text();

// // // //     res.json({
// // // //       success: true,
// // // //       tips: JSON.parse(output),
// // // //     });
// // // //   } catch (error) {
// // // //     console.error('Interview tips error:', error);
// // // //     res.status(500).json({ error: error.message });
// // // //   }
// // // // };

