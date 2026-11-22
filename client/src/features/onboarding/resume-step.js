// Where a returning user continues onboarding (F2.12): after the last step they saved.
// Only the step NAME is kept in localStorage (no personal data).
import { FORM_STEPS } from "./store";

const KEY = "onboarding:last-saved-step";

export function rememberSavedStep(step) {
  try {
    window.localStorage.setItem(KEY, step);
  } catch {
    // Storage can be unavailable (private mode); resuming then falls back to the profile's contents.
  }
}

function lastSavedStep() {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function resumeStep(profile) {
  if (!profile) return "start";
  const saved = lastSavedStep();
  const index = FORM_STEPS.indexOf(saved);
  if (index >= 0) return FORM_STEPS[index + 1] ?? "done";
  // No record (another device): the first section that's still empty.
  if (!profile.experience?.length && !profile.education?.length) return "experience";
  if (!profile.skills?.length) return "skills";
  if (!profile.preferences?.roles?.length) return "preferences";
  return "done";
}
