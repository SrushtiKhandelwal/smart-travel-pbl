// Validation rules. Password length, passenger range and date rule are ASSUMPTIONS carried over from SE Lab 7.
export const PASSWORD_MIN = 8; // assumption
export const PASSWORD_MAX = 20; // assumption
export const PASSENGERS_MIN = 1; // assumption
export const PASSENGERS_MAX = 9; // assumption

export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length === 0) return "Password is required";
  if (pw.length < PASSWORD_MIN || pw.length > PASSWORD_MAX)
    return `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters`;
  // BUG-001 fix: Lab 7 says other password rules apply too (assumption: upper, lower, digit, special).
  if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/\d/.test(pw) || !/[^A-Za-z0-9]/.test(pw))
    return "Password needs an uppercase letter, a lowercase letter, a digit and a special character";
  return null;
}

export function validateEmail(email: unknown): string | null {
  if (typeof email !== "string" || email.trim() === "") return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Email format is invalid";
  return null;
}

export function validatePassengers(n: unknown): string | null {
  if (typeof n !== "number" || !Number.isInteger(n)) return "Passenger count must be a whole number";
  if (n < PASSENGERS_MIN || n > PASSENGERS_MAX)
    return `Passengers must be between ${PASSENGERS_MIN} and ${PASSENGERS_MAX}`;
  return null;
}

// Departure date must be today or later (assumption). `today` is injectable for tests.
export function validateTravelDate(dateStr: unknown, today: Date = new Date()): string | null {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "Travel date must be YYYY-MM-DD";
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dateStr) return "Travel date is invalid";
  const t = today.toISOString().slice(0, 10);
  if (dateStr < t) return "Travel date cannot be in the past";
  return null;
}
