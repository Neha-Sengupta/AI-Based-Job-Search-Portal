# AI-Based Job Search Portal

A job search website for India. You build one profile (fill in a form or upload your CV), see how well you fit each job with a fit score, generate a CV tailored to a job from ready-made templates, and track your applications in one place.

## Features

- Sign up and sign in with email and password
- Profile from a form or from an uploaded CV (PDF or DOCX), with a completeness score and tips
- Job search across India with a fit score per job: matching skills and missing ones
- Tailored CVs per job, downloadable as PDF
- Application tracker
- AI-drafted answers for application questions (optional)
- Account settings and full account deletion

## Tech stack

- Frontend: Next.js, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form + Zod
- Backend: Express 5, Better Auth, MongoDB with Mongoose (GridFS for files), Puppeteer + Handlebars for PDFs
- Shared: Zod schemas and the fit score logic, used by both client and server
- Tests: Vitest and Supertest

## Quick start

Requirements: Node 24 and a MongoDB database (MongoDB Community installed locally, or a free MongoDB Atlas cluster).

```bash
npm run setup      # installs dependencies, creates the .env files, prepares the database
npm run dev        # API on http://localhost:4000, site on http://localhost:3000
```

Open http://localhost:3000 and sign in with `demo@jobportal.local` / `demo-password-123`, or create a new account.

`npm run setup` can be run again at any time. It keeps your existing `.env` values and skips data that already exists.

AI answers are optional. To turn them on, set `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL` in `server/.env` (a Groq API key, or Ollama running locally).

## Manual setup

```bash
npm install
cp server/.env.example server/.env        # fill BETTER_AUTH_SECRET and INTERNAL_API_KEY (openssl rand -base64 32)
(cd server && npm run db:indexes && npm run db:seed)
(cd server && npm run db:demo)             # optional demo account
cp client/.env.example client/.env.local
npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the API and the website |
| `npm test` | Run the tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run build` | Production build |
