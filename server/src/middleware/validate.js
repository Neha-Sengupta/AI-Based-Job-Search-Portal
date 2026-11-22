// Route handlers read only req.valid.*, never req.body directly.
// A ZodError is thrown on bad input; the error handler turns it into 400 VALIDATION_ERROR.
export const validate = (schemas) => (req, _res, next) => {
  for (const key of ["params", "query", "body"]) {
    if (schemas[key]) req.valid = { ...req.valid, [key]: schemas[key].parse(req[key]) };
  }
  next();
};
