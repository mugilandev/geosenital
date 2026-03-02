import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "geosentinel-dev-secret-change-in-prod";

export function authUser(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : req.query?.token;
  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "user") {
      return res.status(403).json({ error: "User token required" });
    }
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function authAdmin(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : req.query?.token;
  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Admin token required" });
    }
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
