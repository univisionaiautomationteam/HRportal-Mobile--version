import axios from "axios";
import { getGraphAccessToken } from "./msGraphAuth.js";
import { toUTCISOStringFromKolkata } from "./interviewDateTime.js";

const normalize = (value = "") => String(value).trim();

export const findTeamsEventForInterview = async ({
  organizerEmail,
  meetingLink,
  subject,
  scheduledDate,
}) => {
  if (!organizerEmail) {
    throw new Error("Missing organizerEmail for meeting cancellation");
  }

  const token = await getGraphAccessToken();
  const referenceDate = scheduledDate
    ? new Date(toUTCISOStringFromKolkata(scheduledDate))
    : new Date();

  const startDateTime = new Date(referenceDate.getTime() - 8 * 60 * 60 * 1000).toISOString();
  const endDateTime = new Date(referenceDate.getTime() + 8 * 60 * 60 * 1000).toISOString();

  const response = await axios.get(
    `https://graph.microsoft.com/v1.0/users/${organizerEmail}/calendarView`,
    {
      params: {
        startDateTime,
        endDateTime,
        $select: "id,subject,start,end,onlineMeeting",
        $top: 100,
      },
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: 'outlook.timezone="Asia/Kolkata"',
      },
    }
  );

  const events = Array.isArray(response.data?.value) ? response.data.value : [];
  const normalizedMeetingLink = normalize(meetingLink);
  const normalizedSubject = normalize(subject);

  return (
    events.find((event) => {
      const eventJoinUrl = normalize(event.onlineMeeting?.joinUrl);
      const eventSubject = normalize(event.subject);

      if (normalizedMeetingLink && eventJoinUrl === normalizedMeetingLink) {
        return true;
      }

      if (normalizedSubject && eventSubject === normalizedSubject) {
        return true;
      }

      return false;
    }) || null
  );
};

export const cancelTeamsMeeting = async ({
  organizerEmail,
  eventId,
  meetingLink,
  subject,
  scheduledDate,
}) => {
  const token = await getGraphAccessToken();
  let resolvedEvent = eventId ? { id: eventId } : null;

  if (!resolvedEvent?.id) {
    resolvedEvent = await findTeamsEventForInterview({
      organizerEmail,
      meetingLink,
      subject,
      scheduledDate,
    });
  }

  if (!resolvedEvent?.id) {
    throw new Error("Meeting event not found in organizer calendar");
  }

  await axios.post(
    `https://graph.microsoft.com/v1.0/users/${organizerEmail}/events/${resolvedEvent.id}/cancel`,
    {
      comment: "Interview cancelled from HR Portal.",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return { eventId: resolvedEvent.id };
};
