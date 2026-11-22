// Job source adapters by the name used in the JOB_SOURCES env var.
// Each exports `name` and `fetchJobs({ maxJobs, companiesFile, logger })` → `{ jobs, skipped }`.
import * as arbeitnow from "./arbeitnow.js";
import * as ashby from "./ashby.js";
import * as careers from "./careers.js";
import * as fixtures from "./fixtures.js";
import * as greenhouse from "./greenhouse.js";
import * as lever from "./lever.js";

export const SOURCES = Object.freeze({ fixtures, arbeitnow, greenhouse, lever, ashby, careers });
