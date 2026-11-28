export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_POLICY_HINT =
  "Use at least 12 characters with uppercase, lowercase, a number and a special character";

export function getPasswordPolicyError(password) {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Use at least 12 characters with uppercase, lowercase, a number and a special character.";
  }
  if (!/[a-z]/.test(password)) {
    return "Add at least one lowercase letter to your password.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Add at least one uppercase letter to your password.";
  }
  if (!/[0-9]/.test(password)) {
    return "Add at least one number to your password.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Add at least one special character (for example: !, @, # or _).";
  }
  return null;
}
