export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

export const normalizeText = (value) => String(value || "").trim();

export const isValidPersonName = (value) => {
  const name = normalizeText(value);

  if (!name) return false;

  // Allow names with spaces, periods, apostrophes, and hyphens,
  // but require at least one letter so numeric-only values are rejected.
  return /^(?=.*[A-Za-z])[A-Za-z][A-Za-z\s.'-]*$/.test(name);
};
