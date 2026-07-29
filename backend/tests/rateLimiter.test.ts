import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { loginLimiter, signupLimiter } from "../src/middleware/rateLimiter.js";

describe("Rate Limiting Middleware", () => {
  it("exports loginLimiter and signupLimiter middlewares", () => {
    expect(typeof loginLimiter).toBe("function");
    expect(typeof signupLimiter).toBe("function");
  });

  it("returns 429 JSON payload when login rate limit (10) is exceeded", async () => {
    const app = express();
    app.use(express.json());
    app.post("/test-login", loginLimiter, (_req, res) => {
      res.json({ status: "ok" });
    });

    for (let i = 0; i < 10; i++) {
      const res = await request(app).post("/test-login").send({});
      expect(res.status).toBe(200);
    }

    const rateLimitedRes = await request(app).post("/test-login").send({});
    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.body).toEqual({
      error: "Too many requests. Please try again later."
    });
  });

  it("returns 429 JSON payload when signup rate limit (5) is exceeded", async () => {
    const app = express();
    app.use(express.json());
    app.post("/test-signup", signupLimiter, (_req, res) => {
      res.json({ status: "ok" });
    });

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post("/test-signup").send({});
      expect(res.status).toBe(200);
    }

    const rateLimitedRes = await request(app).post("/test-signup").send({});
    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.body).toEqual({
      error: "Too many requests. Please try again later."
    });
  });
});
