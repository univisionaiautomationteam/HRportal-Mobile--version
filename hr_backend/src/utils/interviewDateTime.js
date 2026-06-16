const KOLKATA_TIME_ZONE = "Asia/Kolkata";
const KOLKATA_OFFSET_MINUTES = 330;
const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i;
const NAIVE_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;

const pad = (value) => String(value).padStart(2, "0");

const formatParts = ({ year, month, day, hour, minute, second = "00" }) =>
  `${year}-${month}-${day}T${hour}:${minute}:${second}`;

const formatDateInKolkata = (date) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOLKATA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return formatParts(parts);
};

const parseNaiveDateTime = (value) => {
  const match = String(value).trim().match(NAIVE_DATE_TIME_PATTERN);
  if (!match) {
    throw new Error(`Unsupported scheduled_date format: ${value}`);
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  return { year, month, day, hour, minute, second };
};

export const toKolkataDateTimeString = (value) => {
  if (value instanceof Date) {
    return formatDateInKolkata(value);
  }

  const normalized = String(value).trim();
  if (EXPLICIT_TIME_ZONE_PATTERN.test(normalized)) {
    return formatDateInKolkata(new Date(normalized));
  }

  return formatParts(parseNaiveDateTime(normalized));
};

export const addMinutesToKolkataDateTimeString = (value, minutes) => {
  const localDateTime = toKolkataDateTimeString(value);
  const { year, month, day, hour, minute, second } =
    parseNaiveDateTime(localDateTime);
  const utcMillis =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) +
    minutes * 60 * 1000;
  const utcDate = new Date(utcMillis);

  return formatParts({
    year: utcDate.getUTCFullYear(),
    month: pad(utcDate.getUTCMonth() + 1),
    day: pad(utcDate.getUTCDate()),
    hour: pad(utcDate.getUTCHours()),
    minute: pad(utcDate.getUTCMinutes()),
    second: pad(utcDate.getUTCSeconds()),
  });
};

export const toUTCISOStringFromKolkata = (value) => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const normalized = String(value).trim();
  if (EXPLICIT_TIME_ZONE_PATTERN.test(normalized)) {
    return new Date(normalized).toISOString();
  }

  const { year, month, day, hour, minute, second } =
    parseNaiveDateTime(normalized);
  const utcMillis =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) -
    KOLKATA_OFFSET_MINUTES * 60 * 1000;

  return new Date(utcMillis).toISOString();
};
