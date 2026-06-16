const normalizeRole = (value) => String(value || "").trim().toLowerCase();

export const requireHrManager = (req, res, next) => {
  if (normalizeRole(req.user?.role) !== "hr manager") {
    return res.status(403).json({
      message: "HR Manager access required"
    });
  }

  next();
};
