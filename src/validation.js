// Mirrors server/lib.js so the form can explain the rules before the server has to.
export const PASSWORD_RULES = [
  ["At least 8 characters", (p) => p.length >= 8],
  ["One capital letter", (p) => /[A-Z]/.test(p)],
  ["One number", (p) => /\d/.test(p)],
  ["One symbol (e.g. ! @ # $ %)", (p) => /[^A-Za-z0-9\s]/.test(p)],
];
export const passwordOk = (p) => PASSWORD_RULES.every(([, ok]) => ok(p));
export const passwordProblem = (p) => {
  const bad = PASSWORD_RULES.filter(([, ok]) => !ok(p)).map(([t]) => t.toLowerCase());
  return bad.length ? `Password needs: ${bad.join(", ")}.` : null;
};

export const NAME_RE = /^[\p{L}][\p{L}\s.'’-]*$/u;
export const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
// Returns an error message, or null when the name parts are fine.
export function nameProblem({ firstName, lastName, middleName = "", suffix = "" }) {
  const need = (v, label) => !v.trim() ? `Please enter your ${label}.` : !NAME_RE.test(v.trim()) ? `${label[0].toUpperCase() + label.slice(1)} can only contain letters, spaces, hyphens, apostrophes and periods.` : null;
  const opt = (v, label) => v.trim() && !NAME_RE.test(v.trim()) ? `${label[0].toUpperCase() + label.slice(1)} can only contain letters, spaces, hyphens, apostrophes and periods.` : null;
  return need(firstName, "first name") || need(lastName, "last name") || opt(middleName, "middle name") || opt(suffix, "suffix");
}
export const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V"];
