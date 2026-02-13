import express, { Request, Response } from "express";
import { debugVerifyEmail, verifyEmail } from "./verify.js";

const app = express();
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post("/verify", async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "");
  const options = req.body?.options ?? undefined;
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  try {
    const result = await verifyEmail(email, options);
    res.json(result);
  } catch (err) {
    console.error("verify error", err);
    res.status(500).json({
      error: String(err),
      stack: (err as Error)?.stack ?? "no stack"
    });
  }
});

app.post("/verify/debug", async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? "");
  const options = req.body?.options ?? undefined;
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  try {
    const result = await debugVerifyEmail(email, options);
    res.json(result);
  } catch (err) {
    console.error("verify debug error", err);
    res.status(500).json({
      error: String(err),
      stack: (err as Error)?.stack ?? "no stack"
    });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`pm-email-validator API listening on http://localhost:${port}`);
});
