import { sendMailViaGraph } from "../utils/sendMailGraph.js";
import { createTeamsMeeting } from "../utils/createTeamsMeeting.js";
import {
  addMinutesToKolkataDateTimeString,
  toKolkataDateTimeString,
} from "../utils/interviewDateTime.js";
import pool from "../config/database.js";

/* ================= EMAIL TEMPLATES ================= */

export const teamsInterviewTemplate = ({
  candidateName,
  interviewDate,
  interviewer,
  meetingLink
}) => `
  <h3>Interview Scheduled – Microsoft Teams</h3>
  <p>Dear ${candidateName || "Candidate"},</p>

  <p>Your interview has been scheduled with our team.</p>

  <p><b>Date & Time:</b> ${interviewDate}</p>
  <p><b>Interviewer:</b> ${interviewer}</p>

  <p><b>Microsoft Teams Link:</b></p>
  <p><a href="${meetingLink}">${meetingLink}</a></p>

  <br/>
  <p>Best regards,<br/>
  Univision HR Team</p>
`;

export const googleMeetInterviewTemplate = ({
  candidateName,
  interviewDate,
  interviewer,
  meetingLink
}) => `
  <h3>Interview Scheduled – Google Meet</h3>
  <p>Dear ${candidateName || "Candidate"},</p>

  <p>Your interview has been scheduled with our team.</p>

  <p><b>Date & Time:</b> ${interviewDate}</p>
  <p><b>Interviewer:</b> ${interviewer}</p>

  <p><b>Google Meet Link:</b></p>
  <p><a href="${meetingLink}">${meetingLink}</a></p>

  <br/>
  <p>Best regards,<br/>
  Univision HR Team</p>
`;

/* ================= SEND EMAIL ================= */

export const sendInterviewEmail = async (req, res) => {
  try {
    const payloadInterviewers = Array.isArray(req.body?.interviewers)
      ? req.body.interviewers
      : req.body?.interviewer_email
        ? [
            {
              interviewer_name: req.body?.interviewer || "Interviewer",
              interviewer_email: req.body.interviewer_email,
            },
          ]
        : [];

    const {
      candidate_email,
      scheduled_date,
      interview_type,
      interviewer_department,
      candidateName: candidateNameFromBody,
      hr_email: hr_email_body
    } = req.body;

    const interviewers = payloadInterviewers;

    // Get HR email from authenticated user if not provided in body
    const hr_email = hr_email_body || req.user?.email;


    // Fetch candidate name from database if not provided
    let candidateName = candidateNameFromBody;
    let candidateId = null;
    let resumeUrl = null;
    if (candidate_email) {
      try {
        // Get candidate id and name
        const [candidates] = await pool.query(
          "SELECT id, custom_first_name, custom_last_name FROM candidates WHERE email_id = ?",
          [candidate_email]
        );
        if (candidates.length) {
          candidateId = candidates[0].id;
          const first = candidates[0].custom_first_name || '';
          const last = candidates[0].custom_last_name || '';
          candidateName = candidateName || [first, last].filter(Boolean).join(' ').trim();
          // Get latest resume for candidate
          const [resumes] = await pool.query(
            `SELECT resume_file_path FROM resume_versions WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1`,
            [candidates[0].id]
          );
          if (resumes.length) {
            resumeUrl = resumes[0].resume_file_path;
          }
        }
      } catch (dbErr) {
        console.warn("⚠️ Failed to fetch candidate name or resume from database:", dbErr.message);
      }
    }

    // Avoid duplicate notifications when schedule flow already sent them.
    // Use force_send=true only for intentional manual resend operations.
    if (candidateId && scheduled_date && !req.body?.force_send) {
      const [existingInterviews] = await pool.query(
        `SELECT id
         FROM interviews
         WHERE candidate_id = ? AND scheduled_date = ?
         LIMIT 1`,
        [candidateId, scheduled_date]
      );

      if (existingInterviews.length) {
        return res.json({
          message: "Notification skipped because interview schedule flow already handles emails/calendar",
          skipped: true,
        });
      }
    }

    // Generate signed S3 link for resume if available
    let resumeDownloadLink = null;
    if (resumeUrl) {
      try {
        const { GetObjectCommand } = await import("@aws-sdk/client-s3");
        const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
        const s3 = (await import("../config/s3.js")).default;
        const key = resumeUrl.split(".amazonaws.com/")[1];
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
        });
        resumeDownloadLink = await getSignedUrl(s3, command, { expiresIn: 172800 }); // 48 hours
      } catch (err) {
        console.warn("⚠️ Failed to generate signed resume link:", err.message);
      }
    }

    console.log("📧 DEBUG - Full Request Body:", req.body);
    console.log("📧 DEBUG - Authenticated User:", req.user?.email);
    console.log("📧 DEBUG - Candidate Name:", candidateName);
    console.log("📧 FINAL EMAIL SEND DATA", {
      to: candidate_email,
      cc: [
        ...interviewers.map((item) => item?.interviewer_email).filter(Boolean),
        ...(hr_email ? [hr_email] : [])
      ],
    });

    const interviewerEmails = interviewers.map(i => i.interviewer_email).filter(Boolean);
    const meetingAttendees = [...new Set([candidate_email, ...interviewerEmails].filter(Boolean))];
    const startDateTime = toKolkataDateTimeString(scheduled_date);
    const endDateTime = addMinutesToKolkataDateTimeString(startDateTime, 30);

    const meeting = await createTeamsMeeting({
      subject: `Interview with ${candidateName}`,
      startDateTime,
      endDateTime,
      organizerEmail: hr_email,
      attendeesEmails: meetingAttendees,
    });
    const meetingLink = meeting.joinUrl;



    // Prepare interviewer names and emails
    const interviewerNames = interviewers.map(i => i.interviewer_name).filter(Boolean);

    // Candidate email: list all interviewer names
    let html = teamsInterviewTemplate({
      candidateName,
      interviewDate: scheduled_date,
      interviewer: interviewerNames.join(', '),
      meetingLink,
    });
    if (resumeDownloadLink) {
      html += `<p><b>Candidate Resume:</b> <a href="${resumeDownloadLink}" target="_blank">Download Resume</a></p>`;
    }
    if (interviewerNames.length > 1) {
      html += `<p><b>Interviewers:</b> ${interviewerNames.join(', ')}</p>`;
    }

    // Send email to candidate (CC all interviewers and HR)
    const ccList = [...interviewerEmails, hr_email].filter(Boolean);
    await sendMailViaGraph({
      to: candidate_email,
      cc: ccList,
      subject: "Univision: Interview Scheduled",
      html,
    });

    // Send a single email to all interviewers together
    if (interviewerEmails.length > 0) {
      let interviewerHtml = teamsInterviewTemplate({
        candidateName,
        interviewDate: scheduled_date,
        interviewer: interviewerNames.join(', '),
        meetingLink,
      });
      if (resumeDownloadLink) {
        interviewerHtml += `<p><b>Candidate Resume:</b> <a href="${resumeDownloadLink}" target="_blank">Download Resume</a></p>`;
      }
      await sendMailViaGraph({
        to: interviewerEmails,
        cc: [hr_email].filter(Boolean),
        subject: `Univision: Interview Scheduled with ${candidateName}`,
        html: interviewerHtml,
      });
    }


    res.json({
      message: "Interview email sent with Teams meeting link",
      meetingLink,
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const sendOfferEmail = async (req, res) => {
  try {
    const { offer_id, to, cc, subject, body } = req.body;

    if (!offer_id || !to) {
      return res.status(400).json({
        error: "Offer ID and recipient email are required"
      });
    }

    // 1️⃣ Get Offer + Candidate
    const [offers] = await pool.query(
      `
      SELECT 
        o.id,
        o.candidate_id,
        c.custom_first_name,
        c.custom_last_name
      FROM offers o
      JOIN candidates c ON o.candidate_id = c.id
      WHERE o.id = ?
      `,
      [offer_id]
    );

    if (!offers.length) {
      return res.status(404).json({ error: "Offer not found" });
    }

    const offer = offers[0];
    const candidateName = `${offer.custom_first_name || ""} ${offer.custom_last_name || ""}`.trim();

    // 2️⃣ Save S3 file URL if uploaded
    let s3FileUrl = null;
    let attachments = [];

    if (req.file) {
      s3FileUrl = req.file.location;  // multerS3 gives location

      // Save in DB
      await pool.query(
        `UPDATE offers 
         SET offer_letter_url = ? 
         WHERE id = ?`,
        [s3FileUrl, offer_id]
      );

      // Convert S3 file to base64 for Graph
      const axios = (await import("axios")).default;
      const response = await axios.get(s3FileUrl, {
        responseType: "arraybuffer"
      });

      attachments.push({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: req.file.originalname,
        contentBytes: Buffer.from(response.data).toString("base64"),
      });
    }

    // 3️⃣ Prepare Email HTML
    const html = `
      <h3>Offer Letter – Univision</h3>
      <p>Dear ${candidateName},</p>
      <div>${body}</div>
      <br/>
      <p>Regards,<br/>Univision HR Team</p>
    `;

    // 4️⃣ Send Email via Graph
    await sendMailViaGraph({
      to,
      cc: cc ? cc.split(",").map(e => e.trim()) : [],
      subject,
      html,
      attachments
    });

    // 5️⃣ Update email_sent_at
    await pool.query(
      `UPDATE offers 
       SET email_sent_at = NOW() 
       WHERE id = ?`,
      [offer_id]
    );

    res.json({ message: "Offer email sent successfully" });

  } catch (error) {
    console.error("❌ Offer Email Error:", error);
    res.status(500).json({ error: error.message });
  }
};
// export const sendInterviewEmail = async (req, res) => {
//   try {
//    const {
//   candidate_email,
//   interviewer_email, // 👈 NEW
//   scheduled_date,
//   interview_type,
//   interviewer,
//   candidateName
// } = req.body;

//     // console.log("📅 Scheduled date:", scheduled_date);

//     const meetingLink = await createTeamsMeeting({
//       subject: `Interview with ${candidateName}`,
//       startDateTime: new Date(scheduled_date).toISOString(),
//       endDateTime: new Date(
//         new Date(scheduled_date).getTime() + 30 * 60000
//       ).toISOString(),
//       attendeesEmails: [candidate_email],
//     });

//     // console.log("🔗 Final Teams Link:", meetingLink);

//     const html = teamsInterviewTemplate({
//       candidateName,
//       interviewDate: scheduled_date,
//       interviewer,
//       meetingLink,
//     });

//     await sendMailViaGraph({
//   to: candidate_email,
//   cc: interviewer_email ? [interviewer_email] : [],
//   subject: "Univision: Interview Scheduled",
//   html,
// });
//     // await sendMailViaGraph({
//     //   to: candidate_email,
//     //   subject: "Univision: Interview Scheduled",
//     //   html,
//     // });

//     res.json({
//       message: "Interview email sent with Teams meeting link",
//       meetingLink,
//     });

//   } catch (error) {
//     console.error("❌ Error:", error);
//     res.status(500).json({ error: error.message });
//   }

// };


// export const sendInterviewEmail = async (req, res) => {
//   try {
//     const {
//       candidate_email,
//       interview_date,
//       interview_type,
//       interviewer,
//       meetingLink,
//       candidateName
//     } = req.body;

//     console.log("📧 Sending interview email via Graph to:", candidate_email);

//     const html =
//       interview_type === "Teams"
//         ? teamsInterviewTemplate({
//             candidateName,
//             interviewDate: interview_date,
//             interviewer,
//             meetingLink,
//           })
//         : googleMeetInterviewTemplate({
//             candidateName,
//             interviewDate: interview_date,
//             interviewer,
//             meetingLink,
//           });

//     await sendMailViaGraph({
//       to: candidate_email,
//       subject: "Univision: Interview Scheduled",
//       html,
//     });

//     console.log("✅ Interview email sent via Graph");
//     res.json({ message: "Interview email sent successfully" });

//   } catch (error) {
//     console.error("❌ Graph email error:", error.response?.data || error);
//     res.status(500).json({ error: "Failed to send interview email" });
//   }
// };

// import { gmailTransporter } from '../config/email.js';

// export const teamsInterviewTemplate = ({
//   candidateName,
//   interviewDate,
//   interviewer,
//   meetingLink
// }) => `
//   <h3>Interview Scheduled – Microsoft Teams</h3>
//   <p>Dear ${candidateName || "Candidate"},</p>

//   <p>Your interview has been scheduled with our team.</p>

//   <p><b>Date & Time:</b> ${interviewDate}</p>
//   <p><b>Interviewer:</b> ${interviewer}</p>

//   <p><b>Microsoft Teams Link:</b></p>
//   <p><a href="${meetingLink}">${meetingLink}</a></p>

//   <br/>
//   <p>Best regards,<br/>
//   Univision HR Team</p>
// `;

// export const googleMeetInterviewTemplate = ({
//   candidateName,
//   interviewDate,
//   interviewer,
//   meetingLink
// }) => `
//   <h3>Interview Scheduled – Google Meet</h3>
//   <p>Dear ${candidateName || "Candidate"},</p>

//   <p>Your interview has been scheduled with our team.</p>

//   <p><b>Date & Time:</b> ${interviewDate}</p>
//   <p><b>Interviewer:</b> ${interviewer}</p>

//   <p><b>Google Meet Link:</b></p>
//   <p><a href="${meetingLink}">${meetingLink}</a></p>

//   <br/>
//   <p>Best regards,<br/>
//   Univision HR Team</p>
// `;

// // import { gmailTransporter } from '../config/email.js';

// export const sendInterviewEmail = async (req, res) => {
//   try {
//     const { candidate_email, interview_date, interview_type, interviewer } = req.body;

//     console.log('📧 Sending interview email to:', candidate_email);

//     const mailOptions = {
//       from: process.env.GMAIL_EMAIL,
//       to: candidate_email,
//       subject: 'Univision: Interview Scheduled',
//       html: `
//         <h3>Interview Scheduled</h3>
//         <p><b>Date:</b> ${interview_date}</p>
//         <p><b>Type:</b> ${interview_type}</p>
//         <p><b>Interviewer:</b> ${interviewer}</p>
//         <br/>
//         <p>Best regards,<br/>HR Team</p>
//       `,
//     };

//     await gmailTransporter.sendMail(mailOptions);

//     console.log('✅ Interview email sent');
//     res.json({ message: 'Interview email sent' });

//   } catch (error) {
//     console.error('❌ Email send error:', error);
//     res.status(500).json({ error: error.message });
//   }
// };
