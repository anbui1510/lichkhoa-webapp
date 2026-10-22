export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join('; ');
      return res.status(400).json({ error: message || 'Dữ liệu không hợp lệ.' });
    }
    req.validated = parsed.data;
    return next();
  };
}
