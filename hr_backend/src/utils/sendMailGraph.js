import axios from "axios";
import { getGraphAccessToken } from "./msGraphAuth.js";

export const sendMailViaGraph = async ({
  to,
  cc = [],
  subject,
  html,
  attachments = [], 
}) => {
  const token = await getGraphAccessToken();
  const toList = Array.isArray(to) ? to : [to];
  const normalizedTo = [...new Set(toList.filter(Boolean))];
  const normalizedCc = [...new Set(cc.filter(Boolean))];

  const message = {
    subject,
    body: {
      contentType: "HTML",
      content: html,
    },
    toRecipients: normalizedTo.map(email => ({
      emailAddress: {
        address: email,
      },
    })),
    ccRecipients: normalizedCc.map(email => ({
      emailAddress: { address: email },
    })),
    ...(attachments.length ? { attachments } : {}),
  };

  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${process.env.TEAMS_ORGANIZER_EMAIL}/sendMail`,
    {
      message,
      saveToSentItems: true,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
};

// import axios from "axios";
// import { getGraphAccessToken } from "./msGraphAuth.js";

// export const sendMailViaGraph = async ({ to, subject, html }) => {
//   const token = await getGraphAccessToken();

//   const url = `https://graph.microsoft.com/v1.0/users/${process.env.MS_MAIL_SENDER}/sendMail`;

//   const payload = {
//     message: {
//       subject,
//       body: {
//         contentType: "HTML",
//         content: html,
//       },
//       toRecipients: [
//         {
//           emailAddress: { address: to },
//         },
//       ],
//     },
//     saveToSentItems: true,
//   };

//   await axios.post(url, payload, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/json",
//     },
//   });
// };
