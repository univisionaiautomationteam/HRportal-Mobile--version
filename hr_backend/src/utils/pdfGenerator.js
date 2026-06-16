// Empty PDF generator placeholder
import puppeteer from "puppeteer";
import path from "path";

export const generatePDF = async (html, filePath) => {
  const browser = await puppeteer.launch({
    headless: "new"
  });

  const page = await browser.newPage();

  // 🔥 IMPORTANT: set base path
  const basePath =
  `file://${path.resolve("hr_backend/templates")}/`;

  await page.setContent(html, {
    waitUntil: "load"
  });

  // 👇 THIS LINE FIXES IMAGE LOADING
  await page.evaluate((basePath) => {
    document.querySelectorAll("img").forEach(img => {
      if (!img.src.startsWith("http") && !img.src.startsWith("data:")) {
        img.src = basePath + img.getAttribute("src");
      }
    });
  }, basePath);

  await page.pdf({
  path: filePath,
  format: "A4",
  printBackground: true,
  margin: {
    top: "0px",
    bottom: "0px",
    left: "0px",
    right: "0px"
  }
});

  await browser.close();
};