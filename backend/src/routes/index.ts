import { Router } from "express";
import { z } from "zod";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

router.post("/echo", (req, res, next) => {
  const schema = z.object({ message: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return next({ status: 400, message: "Invalid body" });
  res.json({ echoed: parsed.data.message });
});

export default router;
