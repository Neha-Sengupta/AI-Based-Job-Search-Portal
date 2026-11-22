// Profile (API) → form default values. Inputs need "" rather than null/undefined.
const text = (value) => value ?? "";

export function basicsValues(profile = {}) {
  return {
    fullName: text(profile.fullName),
    headline: text(profile.headline),
    contactEmail: text(profile.contactEmail),
    phone: text(profile.phone),
    location: { city: text(profile.location?.city), country: profile.location?.country ?? "IN" },
    links: {
      linkedin: text(profile.links?.linkedin),
      github: text(profile.links?.github),
      portfolio: text(profile.links?.portfolio),
    },
    summary: text(profile.summary),
  };
}

export const emptyExperience = () => ({
  title: "",
  company: "",
  location: "",
  startDate: null,
  endDate: null,
  current: false,
  bullets: [],
});

export const emptyEducation = () => ({
  institution: "",
  degree: "",
  field: "",
  level: "bachelor",
  startDate: null,
  endDate: null,
  current: false,
  grade: "",
});

export const emptyProject = () => ({ name: "", description: "", bullets: [], skills: [], url: "" });
export const emptyCertification = () => ({ name: "", issuer: "", date: null, url: "" });

export function experienceValues(profile = {}) {
  return {
    experience: (profile.experience ?? []).map((item) => ({
      ...emptyExperience(),
      ...item,
      location: text(item.location),
    })),
  };
}

export function educationValues(profile = {}) {
  return {
    education: (profile.education ?? []).map((item) => ({
      ...emptyEducation(),
      ...item,
      degree: text(item.degree),
      field: text(item.field),
      grade: text(item.grade),
    })),
  };
}

export function skillsValues(profile = {}) {
  return {
    skills: profile.skills ?? [],
    projects: (profile.projects ?? []).map((item) => ({
      ...emptyProject(),
      ...item,
      description: text(item.description),
      url: text(item.url),
    })),
    certifications: (profile.certifications ?? []).map((item) => ({
      ...emptyCertification(),
      ...item,
      issuer: text(item.issuer),
      url: text(item.url),
    })),
  };
}

export function preferencesValues(profile = {}) {
  const preferences = profile.preferences ?? {};
  return {
    preferences: {
      roles: preferences.roles ?? [],
      workModels: preferences.workModels ?? [],
      jobTypes: preferences.jobTypes ?? [],
      countries: preferences.countries?.length ? preferences.countries : ["IN"],
      minSalary: preferences.minSalary ?? null,
    },
  };
}
