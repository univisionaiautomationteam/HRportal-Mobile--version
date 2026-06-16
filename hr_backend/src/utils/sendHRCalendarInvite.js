import axios from "axios";
import { getGraphAccessToken } from "./msGraphAuth.js";
import { toUTCISOStringFromKolkata } from "./interviewDateTime.js";

const getEmailProvider = (email = "") => {
  const normalized = String(email).trim().toLowerCase();
  const domain = normalized.split("@")[1] || "";

  if (["gmail.com", "googlemail.com"].includes(domain)) {
    return "gmail";
  }

  return "outlook";
};

const toICSDateTime = (dateString) =>
  new Date(toUTCISOStringFromKolkata(dateString))
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

const escapeICS = (value = "") =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const buildICSContent = ({
  subject,
  startDateTime,
  endDateTime,
  candidateName,
  interviewType,
  interviewerName,
  candidateEmail,
  teamsMeetingLink,
}) => {
  const uid = `interview-${Date.now()}-${Math.random().toString(36).slice(2)}@hrportal`;
  const description = [
    `Interview Details:`,
    `Candidate: ${candidateName}`,
    `Candidate Email: ${candidateEmail}`,
    `Interview Type: ${interviewType}`,
    `Interviewer: ${interviewerName}`,
    teamsMeetingLink ? `Meeting Link: ${teamsMeetingLink}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HR Portal//Interview Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDateTime(new Date().toISOString())}`,
    `DTSTART:${toICSDateTime(startDateTime)}`,
    `DTEND:${toICSDateTime(endDateTime)}`,
    `SUMMARY:${escapeICS(subject)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    teamsMeetingLink ? `LOCATION:${escapeICS(teamsMeetingLink)}` : "",
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Interview Reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
};

const sendGmailCalendarInvite = async ({
  hrEmail,
  subject,
  startDateTime,
  endDateTime,
  candidateName,
  interviewType,
  interviewerName,
  candidateEmail,
  teamsMeetingLink,
}) => {
  const icsContent = buildICSContent({
    subject,
    startDateTime,
    endDateTime,
    candidateName,
    interviewType,
    interviewerName,
    candidateEmail,
    teamsMeetingLink,
  });

  const htmlBody = `
<html>
<body>
<p><strong>Interview Details:</strong></p>
<p>
Candidate: <strong>${candidateName}</strong><br/>
Candidate Email: <a href="mailto:${candidateEmail}">${candidateEmail}</a><br/>
Interview Type: <strong>${interviewType}</strong><br/>
Interviewer: <strong>${interviewerName}</strong><br/>
${teamsMeetingLink ? `Meeting Link: <a href="${teamsMeetingLink}">Join Meeting</a><br/>` : ""}
</p>
<p>A calendar invite is attached. Please accept it to add to your Google Calendar.</p>
</body>
</html>
  `.trim();

  if (!process.env.TEAMS_ORGANIZER_EMAIL) {
    throw new Error("Missing TEAMS_ORGANIZER_EMAIL for calendar invite");
  }

  const token = await getGraphAccessToken();

  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${process.env.TEAMS_ORGANIZER_EMAIL}/sendMail`,
    {
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: htmlBody,
        },
        toRecipients: [
          {
            emailAddress: {
              address: hrEmail,
            },
          },
        ],
        attachments: [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: "interview-invite.ics",
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
            contentBytes: Buffer.from(icsContent, "utf-8").toString("base64"),
          },
        ],
      },
      saveToSentItems: true,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return { provider: "gmail", status: "sent" };
};

/**
 * Send a calendar invite to an HR user's Outlook calendar
 */
export const sendHRCalendarInvite = async ({
  hrEmail,
  subject,
  startDateTime,
  endDateTime,
  candidateName,
  interviewType,
  interviewerName,
  candidateEmail,
  teamsMeetingLink,
}) => {
  try {
    if (!hrEmail) {
      throw new Error("Missing hrEmail for calendar invite");
    }
    if (!startDateTime || !endDateTime) {
      throw new Error("Missing startDateTime or endDateTime for calendar invite");
    }
    const provider = getEmailProvider(hrEmail);

    if (provider === "gmail") {
      return await sendGmailCalendarInvite({
        hrEmail,
        subject,
        startDateTime,
        endDateTime,
        candidateName,
        interviewType,
        interviewerName,
        candidateEmail,
        teamsMeetingLink,
      });
    }

    if (!process.env.TEAMS_ORGANIZER_EMAIL) {
      throw new Error("Missing TEAMS_ORGANIZER_EMAIL for calendar invite");
    }

    const token = await getGraphAccessToken();

    // Build HTML body for calendar event
    const htmlBody = `
<html>
<body>
<p><strong>Interview Details:</strong></p>
<p>
Candidate: <strong>${candidateName}</strong><br/>
Candidate Email: <a href="mailto:${candidateEmail}">${candidateEmail}</a><br/>
Interview Type: <strong>${interviewType}</strong><br/>
Interviewer: <strong>${interviewerName}</strong><br/>
${teamsMeetingLink ? `Meeting Link: <a href="${teamsMeetingLink}">Join Teams Meeting</a><br/>` : ''}
</p>
<p>This event has been created in your calendar to track the scheduled interview.</p>
</body>
</html>
    `.trim();

    const eventPayload = {
      subject,
      bodyPreview: `Interview scheduled: ${candidateName}`,
      body: {
        contentType: "HTML",
        content: htmlBody,
      },
      start: {
        dateTime: startDateTime,
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "Asia/Kolkata",
      },
      categories: ["Interview"],
      isReminderOn: true,
      reminderMinutesBeforeStart: 15,
      isOnlineMeeting: teamsMeetingLink ? true : false,
      onlineMeetingProvider: teamsMeetingLink ? "teamsForBusiness" : null,
    };

    if (teamsMeetingLink) {
      eventPayload.onlineMeeting = {
        joinUrl: teamsMeetingLink,
      };
    }

    console.log(`📅 Creating calendar event from organizer for ${hrEmail}...`);
    console.log(`   Event: ${subject}`);
    console.log(`   Time: ${startDateTime} to ${endDateTime}`);

    const response = await axios.post(
      `https://graph.microsoft.com/v1.0/users/${hrEmail}/calendar/events`,
      eventPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: 'outlook.timezone="Asia/Kolkata"',
        },
      }
    );

    console.log(`✅ Calendar event created successfully for ${hrEmail}`);
    console.log(`   Event ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to create calendar event for ${hrEmail}:`);
    console.error(`   Error: ${error.message}`);
    if (error.response?.data) {
      console.error(`   Details: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Failed to create calendar event for ${hrEmail}: ${error.message}`);
  }
};
