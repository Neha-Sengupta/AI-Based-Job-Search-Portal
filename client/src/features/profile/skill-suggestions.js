import { SKILLS } from "shared/constants/skills";

// Autocomplete options for skill inputs: the dictionary's display names.
export const SKILL_SUGGESTIONS = Object.freeze(SKILLS.map((skill) => skill.name));
