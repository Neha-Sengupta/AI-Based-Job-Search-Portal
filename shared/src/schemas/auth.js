import { z } from "zod";
import { NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../constants/auth.js";
import { email, requiredString } from "./fields.js";

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `At most ${PASSWORD_MAX_LENGTH} characters`);

export const signUpSchema = z.object({
  name: requiredString(NAME_MAX_LENGTH),
  email: email(),
  password,
});

export const signInSchema = z.object({
  email: email(),
  password: z.string().min(1, "Required").max(PASSWORD_MAX_LENGTH),
});
