import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Gmail transporter
 */
export const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_PASSWORD,
  },
});

/**
 * Outlook transporter
 */
// import nodemailer from "nodemailer";

export const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,           // smtp.office365.com
  port: process.env.SMTP_PORT,           // 587
  secure: false,
  auth: {
    user: process.env.SMTP_USER,         // UTSHRBOT@univisiontechnocon.com
    pass: process.env.SMTP_PASS          // Microsoft App Password
  }
});

