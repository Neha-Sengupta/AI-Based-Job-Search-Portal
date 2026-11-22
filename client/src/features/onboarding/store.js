// UI state only: the current step and the unsaved CV draft.
// The draft is NOT server data yet: nothing is saved until the user saves a step (F2.3).
import { create } from "zustand";

export const STEPS = Object.freeze([
  "start",
  "upload",
  "basics",
  "experience",
  "education",
  "skills",
  "preferences",
  "done",
]);

// The numbered form steps shown in the progress bar (steps 3–7).
export const FORM_STEPS = Object.freeze([
  "basics",
  "experience",
  "education",
  "skills",
  "preferences",
]);

export const useOnboardingStore = create((set) => ({
  step: null,
  cvDraft: null,
  uploadedCvFileId: null,
  setStep: (step) => set({ step }),
  setCvDraft: ({ draft, uploadedCvFileId }) => set({ cvDraft: draft, uploadedCvFileId }),
  clearCvDraft: () => set({ cvDraft: null, uploadedCvFileId: null }),
}));
