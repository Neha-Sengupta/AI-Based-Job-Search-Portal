// Builds the synthetic CV fixtures for the CV parser tests.
// Run from server/: node scripts/make-cv-fixtures.js
// PDFs come from HTML through Puppeteer (bullets typed as "•": Chrome draws <li> markers as shapes, not text); DOCX files are hand-written WordprocessingML zipped with the system `zip`.
// Then step 1 (read-pdf / read-docx) runs on each file and its output is saved as JSON next to it.
// Every person, company and number here is made up.
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { readDocx } from "../src/modules/profile/cv-parser/read-docx.js";
import { readPdf } from "../src/modules/profile/cv-parser/read-pdf.js";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/modules/profile/cv-parser/__fixtures__",
);

const BASE_CSS = `
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.35; margin: 0; color: #111; }
  h1 { font-size: 24px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 14px 0 4px; border-bottom: 1px solid #999; }
  p { margin: 0; }
  .li { padding-left: 16px; text-indent: -9px; }
  .row { display: flex; justify-content: space-between; }
  .entry { margin-top: 8px; }
`;

const PDFS = {
  "fresher-btech": `
    <h1>Aarav Mehta</h1>
    <p>Aspiring Software Developer</p>
    <p>aarav.mehta@example.com | +91 98765 43210 | Pune, Maharashtra</p>
    <p>linkedin.com/in/aarav-mehta | github.com/aaravmehta</p>
    <h2>Career Objective</h2>
    <p>Motivated computer science graduate looking for an entry-level software developer role where I can
    build reliable web applications and keep learning from an experienced team.</p>
    <h2>Education</h2>
    <div class="entry"><div class="row"><b>XYZ Institute of Technology, Pune</b><span>2019 – 2023</span></div>
    <p>B.Tech in Computer Science and Engineering, CGPA: 8.4/10</p></div>
    <div class="entry"><div class="row"><b>Shri Vidya Junior College, Nashik</b><span>2017 – 2019</span></div>
    <p>12th (HSC), Science, 86.5%</p></div>
    <h2>Technical Skills</h2>
    <p>Languages: Java, Python, JavaScript, C++</p>
    <p>Web: HTML, CSS, React, Node.js, Express</p>
    <p>Databases &amp; Tools: MySQL, MongoDB, Git, Postman</p>
    <h2>Projects</h2>
    <div class="entry"><b>Smart Attendance System | React, Node.js, MongoDB</b>
    <p class="li">• Built a web app that marks attendance with QR codes for more than 200 students.</p>
    <p class="li">• Added role-based login for teachers and admins using JWT.</p></div>
    <div class="entry"><b>Library Management Portal</b>
    <p>Source: https://github.com/aaravmehta/library-portal</p>
    <p class="li">• Designed a Java desktop app with MySQL for issuing and returning books.</p></div>
    <h2>Internship</h2>
    <div class="entry"><div class="row"><b>Web Development Intern</b><span>Jun 2022 – Aug 2022</span></div>
    <p>Bright Pixel Technologies Pvt Ltd, Pune</p>
    <p class="li">• Developed five responsive landing pages with React and Tailwind CSS.</p>
    <p class="li">• Fixed bugs in the REST API written in Node.js and Express, which reduced reported errors by about
    thirty percent over the length of the internship and made releases calmer for the team.</p></div>
    <h2>Certifications</h2>
    <p class="li">• Python for Everybody – Coursera (2021)</p>
    <p class="li">• AWS Certified Cloud Practitioner – Amazon Web Services (2023)</p>
    <h2>Personal Details</h2>
    <p>Date of Birth: 14/08/2001</p>
    <p>Father's Name: Rajesh Mehta</p>
    <p>Marital Status: Single</p>
    <p>Languages Known: English, Hindi, Marathi</p>
    <h2>Declaration</h2>
    <p>I hereby declare that the above information is true to the best of my knowledge.</p>
    <p>Place: Pune</p>`,

  "experienced-dev": `
    <h1>ROHAN IYER</h1>
    <p>Senior Software Engineer</p>
    <p>Bengaluru, Karnataka • rohan.iyer@example.com • 09876543210</p>
    <p>https://rohaniyer.dev • linkedin.com/in/rohan-iyer</p>
    <h2>Professional Summary</h2>
    <p>Backend-focused software engineer with nine years of experience building payment and logistics
    platforms. Comfortable owning services end to end, from design reviews to on-call.</p>
    <h2>Work Experience</h2>
    <div class="entry"><div class="row"><b>Senior Software Engineer | Nimbus Cloud Solutions Pvt Ltd | Bengaluru</b><span>Apr 2021 – Present</span></div>
    <p class="li">• Led a team of four engineers building a payments reconciliation service in Node.js.</p>
    <p class="li">• Cut p95 API latency from 900 ms to 250 ms by adding Redis caching.</p>
    <p class="li">• Moved 30 services to Kubernetes on AWS with zero downtime.</p>
    <p class="li">• Mentored six junior developers through code reviews and pairing.</p></div>
    <div class="entry"><div class="row"><b>Software Engineer | Infosys Ltd | Mysuru</b><span>Jul 2017 – Mar 2021</span></div>
    <p class="li">• Built REST and GraphQL APIs for a logistics client using TypeScript and PostgreSQL.</p>
    <p class="li">• Wrote integration tests that raised coverage from 40% to 85%.</p>
    <p class="li">• Automated deployments with Jenkins and Docker.</p></div>
    <div class="entry"><div class="row"><b>Associate Developer | Cognizant Technology Solutions | Chennai</b><span>Jan 2016 – Jun 2017</span></div>
    <p class="li">• Maintained Java batch jobs for a banking client.</p></div>
    <h2 style="page-break-before: always">Education</h2>
    <div class="entry"><div class="row"><b>Vellore Institute of Technology</b><span>2013 – 2016</span></div>
    <p>MCA in Computer Applications</p></div>
    <div class="entry"><div class="row"><b>St. Joseph's College, Bengaluru</b><span>2010 – 2013</span></div>
    <p>BCA, 78%</p></div>
    <h2>Skills</h2>
    <p>JavaScript | TypeScript | Node.js | React | AWS | Docker | Kubernetes | PostgreSQL | Redis | GraphQL | CI/CD</p>
    <h2>Certifications</h2>
    <p>AWS Certified Solutions Architect | Amazon Web Services | 2022</p>
    <p>Certified Kubernetes Application Developer | CNCF | 2021</p>
    <h2>Hobbies</h2>
    <p>Cricket, trekking, reading</p>`,

  "two-column": `
    <style>
      .grid { display: flex; gap: 28px; }
      .side { width: 30%; }
      .main { width: 70%; }
      h2 { text-transform: uppercase; }
    </style>
    <div class="grid">
      <div class="side">
        <h2>Contact</h2>
        <p>kavya.nair@example.com</p>
        <p>98765-43210</p>
        <p>Kochi, Kerala</p>
        <p>linkedin.com/in/kavya-nair</p>
        <h2>Skills</h2>
        <p>Figma</p><p>Adobe XD</p><p>User Research</p><p>Wireframing</p><p>Prototyping</p><p>HTML / CSS</p>
        <h2>Languages Known</h2>
        <p>English, Malayalam, Hindi</p>
        <h2>Certifications</h2>
        <p>Google UX Certificate (2020)</p>
      </div>
      <div class="main">
        <h1>Kavya Nair</h1>
        <p>UI/UX Designer</p>
        <h2>Profile</h2>
        <p>Product designer with four years of experience designing mobile banking and e-commerce apps,
        from user research to high-fidelity prototypes.</p>
        <h2>Experience</h2>
        <div class="entry"><b>UI/UX Designer</b>
        <p>Pixelcraft Studios LLP • Mar 2022 – Present</p>
        <p class="li">• Redesigned the onboarding flow of a banking app, raising sign-ups by 18%.</p>
        <p class="li">• Built and maintained the team's Figma design system.</p></div>
        <div class="entry"><b>Junior Graphic Designer</b>
        <p>Lumen Media Pvt Ltd • Jun 2020 – Feb 2022</p>
        <p class="li">• Designed social media creatives and landing pages for retail brands.</p></div>
        <h2>Education</h2>
        <div class="entry"><b>St. Teresa's College, Kochi</b>
        <p>B.Sc in Visual Communication, 2016 – 2019</p></div>
      </div>
    </div>`,

  "caps-headings": `
    <style>
      body { font-family: "Times New Roman", Times, serif; font-size: 12px; }
      h1, h2, b { font-weight: normal; }
      h1 { font-size: 20px; }
      h2 { font-size: 12px; border: 0; margin-top: 12px; }
      .entry { margin-top: 10px; }
    </style>
    <h1>Sneha Kulkarni</h1>
    <p>Data Analyst</p>
    <p>sneha.k@example.com, +91-9123456789, Hyderabad, Telangana</p>
    <h2>SUMMARY</h2>
    <p>Data analyst with three years of experience turning sales and operations data into dashboards
    and clear recommendations.</p>
    <h2>EXPERIENCE</h2>
    <div class="entry"><p>Data Analyst</p>
    <p>Quantiva Analytics Pvt. Ltd., Hyderabad</p>
    <p>Aug 2021 - Till date</p>
    <p>- Built Power BI dashboards used by 40 regional sales managers.</p>
    <p>- Automated weekly reports with Python and SQL, saving 6 hours a week.</p></div>
    <div class="entry"><p>Business Analyst Intern</p>
    <p>Tata Consultancy Services</p>
    <p>01/2021 - 07/2021</p>
    <p>- Cleaned and analysed customer churn data in Excel.</p></div>
    <h2>EDUCATION</h2>
    <div class="entry"><p>M.Sc Statistics, Osmania University</p>
    <p>2019 - 2021 | 8.1 CGPA</p></div>
    <div class="entry"><p>B.Sc Mathematics, St. Francis College for Women</p>
    <p>2016 - 2019 | 82%</p></div>
    <h2>SKILLS</h2>
    <p>SQL, Python, Power BI, Tableau, Excel, Pandas, Statistics</p>
    <h2>DECLARATION</h2>
    <p>I hereby declare that all the details given above are correct.</p>`,

  // Stands in for a scanned CV: a page with no text at all.
  "no-text": `<div style="width: 300px; height: 400px; background: #555"></div>`,
};

// --- DOCX -----------------------------------------------------------------------------------------
const escapeXml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const run = (text, { bold = false } = {}) =>
  `<w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;

// One paragraph: plain text, { bold }, { heading } (Heading 1 style) or { bullet } (a real Word list item).
const paragraph = (text, { bold = false, heading = false, bullet = false } = {}) => {
  const props = heading
    ? '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'
    : bullet
      ? '<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>'
      : "";
  return `<w:p>${props}${run(text, { bold })}</w:p>`;
};

const DOCX_PARTS = {
  "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`,
  "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`,
  "word/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/></w:style>
</w:styles>`,
  "word/numbering.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`,
};

const documentXml = (paragraphs) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${paragraphs.join("\n")}
</w:body></w:document>`;

const B = { bold: true };
const H = { heading: true };
const L = { bullet: true };

const DOCXS = {
  // Heading 1 styles for sections and real Word bullet lists.
  "fresher-word": [
    paragraph("Ishita Banerjee", B),
    paragraph("Junior Web Developer"),
    paragraph("ishita.banerjee@example.com | 8765432109 | Kolkata, West Bengal"),
    paragraph("github.com/ishitab"),
    paragraph("Objective", H),
    paragraph(
      "To begin my career as a web developer in a team that values clean, accessible design.",
    ),
    paragraph("Educational Qualifications", H),
    paragraph("Heritage Institute of Technology, Kolkata", B),
    paragraph("BCA, 2020 – 2023, CGPA 8.9/10"),
    paragraph("Kendriya Vidyalaya, Salt Lake", B),
    paragraph("12th (CBSE), 2020, 91%"),
    paragraph("Skills", H),
    paragraph("JavaScript, React, HTML5, CSS3", L),
    paragraph("Git, Figma, Bootstrap", L),
    paragraph("Projects", H),
    paragraph("Weather Dashboard", B),
    paragraph("Built a weather dashboard with React and the OpenWeather API.", L),
    paragraph("Added a seven-day forecast chart and city search.", L),
    paragraph("Portfolio Website", B),
    paragraph("Personal site built with HTML, CSS and JavaScript: https://ishitab.github.io", L),
    paragraph("Hobbies", H),
    paragraph("Painting, chess"),
    paragraph("Declaration", H),
    paragraph("I hereby declare that the information above is true to the best of my knowledge."),
  ],
  // No heading styles: bold ALL CAPS paragraphs as section titles and "•" typed as text.
  "experienced-word": [
    paragraph("Vikram Rathore", B),
    paragraph("Project Manager"),
    paragraph("Mobile: +91 99887 76655 | Email: vikram.rathore@example.com | Gurugram, Haryana"),
    paragraph("linkedin.com/in/vikram-rathore"),
    paragraph("PROFILE SUMMARY", B),
    paragraph(
      "Project manager with eleven years of experience delivering ERP and supply-chain software for manufacturing clients.",
    ),
    paragraph("EMPLOYMENT HISTORY", B),
    paragraph("Zentrix Technologies Pvt Ltd", B),
    paragraph("Project Manager | Jan 2019 – Present"),
    paragraph("• Run delivery for three ERP programmes with a combined team of 35 people."),
    paragraph("• Introduced Scrum ceremonies and cut release slippage by half."),
    paragraph("Orbit Infosystems Ltd", B),
    paragraph("Senior Business Analyst | June 2014 – December 2018"),
    paragraph("• Gathered requirements from plant managers and wrote functional specifications."),
    paragraph("EDUCATION", B),
    paragraph("MBA (Operations), Symbiosis Institute of Business Management, Pune | 2012 – 2014"),
    paragraph("B.E. Mechanical Engineering, Rajasthan Technical University | 2008 – 2012 | 72%"),
    paragraph("KEY SKILLS", B),
    paragraph("Agile, Scrum, JIRA, Stakeholder Management, Risk Management, MS Project"),
    paragraph("CERTIFICATIONS", B),
    paragraph("PMP – Project Management Institute (2018)"),
    paragraph("Certified ScrumMaster – Scrum Alliance (2016)"),
    paragraph("PERSONAL INFORMATION", B),
    paragraph("Date of Birth: 02/03/1990"),
    paragraph("Marital Status: Married"),
    paragraph("Gender: Male"),
  ],
};

async function makePdfs() {
  const browser = await puppeteer.launch({ headless: "shell" });
  try {
    for (const [name, body] of Object.entries(PDFS)) {
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setContent(
        `<!doctype html><html><head><style>${BASE_CSS}</style></head><body>${body}</body></html>`,
      );
      await page.pdf({
        path: join(OUT_DIR, `${name}.pdf`),
        format: "A4",
        margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function makeDocx(name, paragraphs) {
  const dir = await mkdtemp(join(tmpdir(), "cv-docx-"));
  try {
    const parts = { ...DOCX_PARTS, "word/document.xml": documentXml(paragraphs) };
    for (const [path, content] of Object.entries(parts)) {
      await mkdir(dirname(join(dir, path)), { recursive: true });
      await writeFile(join(dir, path), content);
    }
    const out = join(OUT_DIR, `${name}.docx`);
    await rm(out, { force: true });
    execFileSync("zip", ["-X", "-q", "-r", out, "."], { cwd: dir });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const toJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

await mkdir(OUT_DIR, { recursive: true });
await makePdfs();
for (const [name, paragraphs] of Object.entries(DOCXS)) await makeDocx(name, paragraphs);

for (const name of Object.keys(PDFS).filter((name) => name !== "no-text")) {
  const items = await readPdf(await readFile(join(OUT_DIR, `${name}.pdf`)));
  await writeFile(join(OUT_DIR, `${name}.items.json`), toJson(items));
}
for (const name of Object.keys(DOCXS)) {
  const lines = await readDocx(await readFile(join(OUT_DIR, `${name}.docx`)));
  await writeFile(join(OUT_DIR, `${name}.lines.json`), toJson(lines));
}
