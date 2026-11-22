// Every /api/v1 router. 🔐 = requireAuth; routes without it are public.
import { Router } from "express";
import { requireAuth } from "./middleware/auth.js";
import { profileRouter } from "./modules/profile/routes.js";
import { jobsRouter } from "./modules/jobs/routes.js";
import { cvsRouter } from "./modules/cvs/routes.js";
import { applicationsRouter } from "./modules/applications/routes.js";
import { accountRouter } from "./modules/account/routes.js";

export const apiRouter = Router();

apiRouter.use("/profile", requireAuth, profileRouter);
apiRouter.use("/jobs", jobsRouter);
apiRouter.use("/cvs", requireAuth, cvsRouter);
apiRouter.use("/applications", requireAuth, applicationsRouter);
apiRouter.use(["/usage", "/account"], requireAuth);
apiRouter.use(accountRouter);
