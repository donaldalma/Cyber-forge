import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import pinoHttp from "pino-http";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const publicDir = path.resolve(__dirname, "../../41m4/dist/public");
app.use(express.static(publicDir));
const PgStore = pgSession(session);

const sessionSecret = process.env.SESSION_SECRET ?? process.env.JWT_SECRET ?? "41m4-dev-secret-change-in-prod";

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SESSION_TTL_HOURS = 24;

pool.query(`CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
)`).catch((err: Error) => logger.warn({ err }, "Session table may already exist"));

app.use(
  session({
    store: new PgStore({ pool, tableName: "session", ttl: SESSION_TTL_HOURS * 3600 }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: SESSION_TTL_HOURS * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

app.use("/api", router);

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
