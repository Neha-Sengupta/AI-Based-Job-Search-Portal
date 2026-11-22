import { describe, expect, it } from "vitest";
import { extractRequirements } from "./requirements.js";

describe("extractRequirements", () => {
  it.each([
    [
      "backend engineer",
      "Backend Engineer (Node.js). Bengaluru. You have 3+ years building REST APIs with Node.js and Express, strong MongoDB skills and experience with Docker. Nice to have: Kubernetes, AWS. B.Tech/B.E. in CS or related.",
      {
        mustHave: ["Node.js", "REST", "Express", "MongoDB", "Docker"],
        niceToHave: ["Kubernetes", "AWS"],
        minYears: 3,
        education: "bachelor",
      },
    ],
    [
      "frontend intern",
      "Frontend Intern, remote (India). Students in their final year of a bachelor's degree. Must know HTML, CSS, JavaScript and React. Bonus: Tailwind, TypeScript.",
      {
        mustHave: ["HTML", "CSS", "JavaScript", "React"],
        niceToHave: ["Tailwind CSS", "TypeScript"],
        minYears: null,
        education: "bachelor",
      },
    ],
    [
      "data scientist",
      "Data Scientist, Pune. Master's in statistics or CS preferred. 2-4 years with Python, pandas, scikit-learn and SQL. Experience with PyTorch is a plus.",
      {
        mustHave: ["Python", "pandas", "scikit-learn", "SQL"],
        niceToHave: ["PyTorch"],
        minYears: 2,
        education: "master",
      },
    ],
    [
      "customer support",
      "Customer Support Executive, Mumbai. 12th pass or graduate. Good spoken English and Hindi. 1 year in a call centre preferred. Basic MS Excel.",
      { mustHave: ["Excel"], niceToHave: [], minYears: 1, education: "high_school" },
    ],
    [
      "bulleted sections",
      "Requirements:\n• Java, Spring Boot\n• Minimum 4 years of experience\nGood to have:\n• Kafka\n• Redis\nBenefits\n• Health insurance\nFreshers can also apply.",
      {
        mustHave: ["Java", "Spring Boot"],
        niceToHave: ["Apache Kafka", "Redis"],
        minYears: 0,
        education: null,
      },
    ],
    [
      "skill in both parts",
      "Strong Python.\nNice to have:\n- Python\n- Docker",
      { mustHave: ["Python"], niceToHave: ["Docker"], minYears: null, education: null },
    ],
  ])("%s", (_label, text, expected) => {
    expect(extractRequirements(text)).toEqual(expected);
  });

  it.each([
    ["3+ years of experience", 3],
    ["2-5 yrs experience", 2],
    ["2 to 4 years in sales", 2],
    ["minimum 4 years", 4],
    ["at least 1 year", 1],
    ["1 year of experience", 1],
    ["1.5 years of experience", 1.5],
    ["0-1 years", 0],
    ["Freshers welcome", 0],
    ["5+ years or 3+ years with a master's", 3],
    ["30+ years of experience", null],
    ["a 5 years old company", null],
    ["aged 18-25 years old", null],
  ])("minYears for %j → %j", (text, expected) => {
    expect(extractRequirements(`${text}. Python.`).minYears).toBe(expected);
  });

  it("caps each list", () => {
    const many =
      "Python, Java, Go, Rust, Kotlin, Swift, PHP, Ruby, Scala, Perl, Haskell, Elixir, Lua, Dart, Julia, Erlang, Clojure";
    const result = extractRequirements(
      `${many}.\nNice to have: React, Vue, Angular, Svelte, Redux, MobX, RxJS, Vite, Webpack, Babel, ESLint, npm, pnpm, Storybook, Preact, Astro`,
    );
    expect(result.mustHave).toHaveLength(15);
    expect(result.niceToHave).toHaveLength(15);
  });

  it.each(["We are a friendly team. Join us and grow with the best people around.", "", undefined])(
    "returns null when nothing is found: %j",
    (text) => {
      expect(extractRequirements(text)).toBeNull();
    },
  );
});

describe("extractRequirements: company and benefits sections", () => {
  it("ignores skills named in About us / Benefits, until the next heading", () => {
    const text = [
      "About Us: Acme integrates with Salesforce, ServiceNow and SAP for Fortune 500 brands.",
      "We grew 300% last year.",
      "Requirements:",
      "• 3+ years with React and TypeScript",
      "Benefits",
      "• Free Slack and Notion licences",
    ].join("\n");
    expect(extractRequirements(text)).toMatchObject({
      mustHave: ["React", "TypeScript"],
      minYears: 3,
    });
  });
});
