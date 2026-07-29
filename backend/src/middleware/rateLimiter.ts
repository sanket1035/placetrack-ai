import rateLimit from "express-rate-limit";
import { audit } from "../lib/audit.js";

/**
 * Rate limiter for POST /api/auth/login
 * Max 10 requests per 15-minute window per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    try {
      await audit(undefined, "RATE_LIMIT_EXCEEDED", "auth", {
        endpoint: "/api/auth/login",
        ip: req.ip
      });
    } catch {
      // Ignore audit logging failures to ensure response is returned
    }
    res.status(429).json({ error: "Too many requests. Please try again later." });
  }
});

/**
 * Rate limiter for POST /api/auth/signup
 * Max 5 requests per 1-hour window per IP
 */
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    try {
      await audit(undefined, "RATE_LIMIT_EXCEEDED", "auth", {
        endpoint: "/api/auth/signup",
        ip: req.ip
      });
    } catch {
      // Ignore audit logging failures to ensure response is returned
    }
    res.status(429).json({ error: "Too many requests. Please try again later." });
  }
});
