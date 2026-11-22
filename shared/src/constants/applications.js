export const APPLICATION_STATUSES = Object.freeze([
  "saved",
  "applied",
  "interview",
  "offer",
  "rejected",
]);

export const APPLICATION_STATUS_LABELS = Object.freeze({
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
});

export const APPLICATION_LIMITS = Object.freeze({
  notes: 2000,
  question: 500,
  answer: 3000,
  answers: 20,
  customQuestions: 5,
});

// The application kit's default questions (F10).
export const DEFAULT_KIT_QUESTIONS = Object.freeze([
  "Why do you want to work at this company?",
  "Why are you a good fit for this role?",
  "Describe a relevant project you're proud of.",
  "Write a short cover note for this application.",
]);
