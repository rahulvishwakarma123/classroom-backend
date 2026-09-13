import { Request, Response, NextFunction } from "express";
import { aj } from "../config/arcjet.js";
import { ArcjetNodeRequest, slidingWindow } from "@arcjet/node";
import { auth } from "../lib/auth.js";

type RateLimitRole = "admin" | "teacher" | "student" | "guest";

const securityMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (process.env.NODE_ENV === "test") return next();

  try {
    // Verify session to get user role
    let role: RateLimitRole = "guest";

    try {
      const session = await auth.api.getSession({
        headers: req.headers,
      });

      if (session && session.user) {
        role = (session.user.role as RateLimitRole) || "guest";
      }
    } catch (error) {
      // If session verification fails, treat as guest
      console.log("Session verification failed, treating as guest:", error);
    }

    let limit: number;
    let message: string;
    let retryAfter: number;

    switch (role) {
      case "admin":
        limit = 20;
        message = "Admin request limit exceeded (20 per minute). Slow down.";
        retryAfter = 30; // 30 seconds for admins
        break;
      case "teacher":
        limit = 10;
        message =
          "Teacher request limit exceeded (10 per minute). Please wait.";
        retryAfter = 45; // 45 seconds for teachers
        break;
      case "student":
        limit = 10;
        message =
          "Student request limit exceeded (10 per minute). Please wait.";
        retryAfter = 60; // 60 seconds for students
        break;
      default:
        limit = 5;
        message =
          "Guest request limit exceeded (5 per minute). Please sign up for greater limits.";
        retryAfter = 90; // 90 seconds for guests
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: "LIVE",
        interval: "1m",
        max: limit,
      }),
    );

    const arcjetRequest: ArcjetNodeRequest = {
      headers: req.headers,
      method: req.method,
      url: req.originalUrl ?? req.url,
      socket: {
        remoteAddress: req.socket.remoteAddress ?? req.ip ?? "0.0.0.0",
      },
    };

    const decision = await client.protect(arcjetRequest);

    if (decision.isDenied()) {
      if (decision.reason.isBot()) {
        return res.status(403).json({
          error: "Forbidden",
          message: "auto requests are not allowed",
        });
      }

      if (decision.reason.isRateLimit()) {
        return res.status(429).json({
          error: "Too Many Requests",
          message: message,
          retryAfter: retryAfter,
        });
      }

      if (decision.reason.isShield()) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Request blocked by security policy.",
        });
      }
    }

    next();
  } catch (error) {
    console.log(`arcjet middleware error`, error);
    res.status(500).json({
      error: "Internal Error",
      message: "Something went wrong with security middleware",
    });
  }
};

export default securityMiddleware;
