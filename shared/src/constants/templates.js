// CV templates are a constant, not an API. Preview images live in client/public/templates/.
export const TEMPLATES = Object.freeze([
  {
    id: "classic",
    name: "Classic",
    description: "Traditional single column with clear section rules.",
    supportsPhoto: false,
    previewImage: "/templates/classic.png",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Clean layout with an accent colour and an optional photo.",
    supportsPhoto: true,
    previewImage: "/templates/modern.png",
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter spacing to fit more on one page.",
    supportsPhoto: false,
    previewImage: "/templates/compact.png",
  },
]);

export const TEMPLATE_IDS = Object.freeze(TEMPLATES.map((template) => template.id));
