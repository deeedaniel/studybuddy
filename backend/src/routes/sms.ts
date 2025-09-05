import { Router } from "express";
import { z } from "zod";
import { twilioClient } from "../twilioClient";

const router = Router();

const schema = z.object({
  to: z.string().regex(/^\+\d{8,15}$/, "Use E.164 like +14085551234"),
  body: z.string().min(1).max(1600),
});

router.post("/send", async (req, res, next) => {
  try {
    console.log("📩 Incoming request body:", req.body);

    const { to, body } = schema.parse(req.body);

    console.log(`➡️ Sending SMS to ${to} with body: "${body}"`);

    const msg = await twilioClient.messages.create({
      to,
      ...(process.env.TWILIO_MESSAGING_SERVICE_SID
        ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
        : { from: process.env.TWILIO_PHONE_NUMBER }),
      body,
    });

    console.log("✅ Twilio accepted message:", {
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
    });

    res.json({ sid: msg.sid, status: msg.status });
  } catch (err: any) {
    console.error("❌ Error sending SMS:", err);
    next({ status: 400, message: err.message ?? "Bad Request" });
  }
});

export default router;
