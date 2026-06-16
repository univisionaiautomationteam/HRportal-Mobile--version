// Empty route placeholder
import express from "express";
import fs from "fs";
import path from "path";
import { generatePDF } from "../utils/pdfGenerator.js";
import numberToWords from "number-to-words";
import nodemailer from "nodemailer";

const router = express.Router();

function getSimpleSalary(salary) {
  const num = parseInt(salary);

  const formatted = num.toLocaleString("en-IN");

  const words = numberToWords.toWords(num)
    .replace(/\b\w/g, c => c.toUpperCase()) + " Only";

  return `₹${formatted}/- (Rupees ${words})`;
}

function getDetailedSalary(fixedSalary, variableSalary) {
  const fixed = parseInt(fixedSalary) || 0;
  const variable = parseInt(variableSalary) || 0;

  const fixedFormatted = fixed.toLocaleString("en-IN");
  const variableFormatted = variable.toLocaleString("en-IN");

  const fixedWords = numberToWords.toWords(fixed)
    .replace(/\b\w/g, c => c.toUpperCase()) + " Only";

  const variableWords = numberToWords.toWords(variable)
    .replace(/\b\w/g, c => c.toUpperCase()) + " Only";

  return `₹${fixedFormatted}/- (Rupees ${fixedWords}), with a Variable Compensation of ₹${variableFormatted}/- (Rupees ${variableWords})`;
}


router.post("/generate", async (req, res) => {
  try {
    const { name, location, role, salary, fixedSalary, variableSalary, variableType, date, hrDate, experience, templateType } = req.body;
   


let basic = 0;
let hra = 0;
let pf = 0;
let gratuity = 0;
let fixedAllowance = 0;

let simpleSalary = getSimpleSalary(salary);
let detailedSalary = getDetailedSalary(fixedSalary || 0, variableSalary || 0);

const fixed = parseInt(fixedSalary) || 0;

const monthlyFixed = fixed / 12;

basic = Math.round(monthlyFixed * 0.4);
hra = Math.round(basic * 0.4);
pf = Math.round(basic * 0.12);
gratuity = Math.floor(basic * 0.0481);

fixedAllowance = Math.round(monthlyFixed - (basic + hra));

let filename = "";

if (experience === "fresher") {
  if (templateType === "col") {
    filename = "templates/freshercol.html";
  } else {
    filename = "templates/fresherfol.html";
  }
} else {
  if (templateType === "col") {
    filename = "templates/colTemplate.html";
  } else {
    filename = "templates/folTemplate.html";
  }
}
    console.log("BODY DATA:", req.body);
    console.log("FILENAME:", filename);
    const templatePath = path.resolve(filename);

    console.log("TEMPLATE PATH:", templatePath);
console.log("EXISTS:", fs.existsSync(templatePath));

    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template not found");
    }

    function formatDate(dateStr) {
  const dateObj = new Date(dateStr);

  const day = dateObj.getDate();

  const suffix =
    day === 1 || day === 21 || day === 31 ? "st" :
    day === 2 || day === 22 ? "nd" :
    day === 3 || day === 23 ? "rd" : "th";

  const month = dateObj.toLocaleString("en-IN", { month: "long" });
  const year = dateObj.getFullYear();

  return `${day}${suffix} ${month} ${year}`;
}

const formattedDate = formatDate(date);

    let html = fs.readFileSync(templatePath, "utf-8");

    html = html
      .replace(/{{name}}/g, name)
      .replace(/{{location}}/g, location)
      .replace(/{{role}}/g, role)
      .replace(/{{\s*simpleSalary\s*}}/g, simpleSalary)
      .replace(/{{\s*detailedSalary\s*}}/g, detailedSalary)
      .replace(/{{date}}/g, formattedDate)
      .replace(/{{hrDate}}/g, hrDate || "")
      .replace(/{{basic}}/g, basic)
.replace(/{{basicYear}}/g, basic * 12)

.replace(/{{hra}}/g, hra)
.replace(/{{hraYear}}/g, hra * 12)

.replace(/{{fixedAllowance}}/g, fixedAllowance)
.replace(/{{fixedAllowanceYear}}/g, fixedAllowance * 12)

.replace(/{{pf}}/g, pf)
.replace(/{{pfYear}}/g, pf * 12)

.replace(/{{gratuity}}/g, gratuity)
.replace(/{{gratuityYear}}/g, gratuity * 12)

.replace(/{{totalAllowance}}/g, hra + fixedAllowance)
.replace(/{{totalAllowanceYear}}/g, (hra + fixedAllowance) * 12)

.replace(/{{basePay}}/g, basic + hra + fixedAllowance)
.replace(/{{basePayYear}}/g, (basic + hra + fixedAllowance) * 12)

.replace(/{{totalBenefits}}/g, Math.round(Number(pf) + Number(gratuity) + 833))
.replace(/{{totalBenefitsYear}}/g, Math.round((Number(pf) + Number(gratuity) + 833) * 12))

.replace(/{{totalCTCMonthly}}/g, Math.round(Number(fixedSalary) / 12))
.replace(/{{totalCTC}}/g, Number(fixedSalary))

.replace(/{{variable}}/g, variableSalary)
.replace(/{{finalCTC}}/g, Number(fixedSalary) + Number(variableSalary));
html = html.replaceAll("{{variableType}}", variableType || "NA");



const safeName = name.replace(/[^a-z0-9]/gi, "_");
const fileName =
  templateType === "fol"
    ? `Formal_Offer_Letter-${safeName}`
    : `Conditional_Offer_Letter-${safeName}`;

const filePath =
  `output/${fileName}.pdf`;

res.json({ html });
    
 } catch (err) {

  console.log("🔥 FULL ERROR:");
  console.log(err);

  res.status(500).json({
    error: err.message,
    stack: err.stack
  });

}
});


router.post(
  "/download-pdf",
  async (req, res) => {

  try {

    const { html } = req.body;

    const filePath =
      "output/offer.pdf";

    await generatePDF(
      html,
      filePath
    );

    res.sendFile(
  path.resolve(filePath)
);

  } catch (err) {

    console.log(err);

    res.status(500)
      .send("Failed");

  }

});


router.post("/send-mail", async (req, res) => {

  try {

    const { html, email } = req.body;

    const filePath =
      "output/offer.pdf";

    await generatePDF(
      html,
      filePath
    );

    const transporter =
      nodemailer.createTransport({
        service: "gmail",

        auth: {
          user: "YOUR_GMAIL",
          pass: "YOUR_APP_PASSWORD",
        },
      });

    await transporter.sendMail({

      from: "YOUR_GMAIL",

      to: email,

      subject: "Offer Letter",

      text:
       "Please find attached your offer letter.",

      attachments: [
        {
          filename: "offer.pdf",
          path: filePath,
        },
      ],
    });

    res.send("Mail Sent");

  } catch (err) {

    console.log(err);

    res.status(500)
      .send("Failed");

  }

});

export default router;