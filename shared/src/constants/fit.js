// Fit score weights and bands. Weights add up to 100.
export const FIT_WEIGHTS = Object.freeze({
  mustHave: 50,
  experience: 20,
  niceToHave: 15,
  education: 10,
  location: 5,
});

export const FIT_BANDS = Object.freeze({ strong: 75, partial: 50 });

export const FIT_VERDICTS = Object.freeze(["strong", "partial", "not_fit"]);

export const FIT_VERDICT_LABELS = Object.freeze({
  strong: "Strong fit",
  partial: "Partial fit",
  not_fit: "Not a fit",
});

export const FIT_VERDICT_SENTENCES = Object.freeze({
  strong: "You are a strong fit for this role.",
  partial: "You are a partial fit for this role.",
  not_fit: "This role isn't a good fit yet.",
});

export const FIT_STATUS = Object.freeze({
  profileIncomplete: "profile_incomplete",
  requirementsPending: "requirements_pending",
});

// How many missing items a job card shows (the detail page shows them all).
export const FIT_CARD_MISSING = 3;
