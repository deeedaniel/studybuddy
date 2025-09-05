import { Router } from "express";
import { z } from "zod";
import { AIService, AIGenerateRequest } from "../services/ai";
import { SmsService, SendSmsRequest, SmsWebhookPayload } from "../services/sms";
import canvasRoutes from "./canvas";

const router = Router();

router.use("/canvas", canvasRoutes);

// AI Generate endpoint
router.post("/ai/generate", async (req, res, next) => {
  try {
    // Validate OpenAI configuration
    if (!AIService.validateConfiguration()) {
      return next({
        status: 500,
        message:
          "OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.",
      });
    }

    // Validate request body
    const schema = z.object({
      message: z.string().min(1, "Message is required"),
      model: z.string().optional(),
      maxTokens: z.number().min(1).max(4000).optional(),
      temperature: z.number().min(0).max(2).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next({
        status: 400,
        message: "Invalid request body",
        details: parsed.error.format(),
      });
    }

    // Generate AI response
    const aiRequest: AIGenerateRequest = {
      message: parsed.data.message,
      model: parsed.data.model,
      maxTokens: parsed.data.maxTokens,
      temperature: parsed.data.temperature,
    };

    const result = await AIService.generateResponse(aiRequest);
    res.json(result);
  } catch (error) {
    console.error("AI Generation Error:", error);
    next({
      status: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to generate AI response",
    });
  }
});

// SMS Send endpoint
router.post("/sms/send", async (req, res, next) => {
  try {
    // Validate request body
    const schema = z.object({
      phone: z.string().min(10, "Phone number is required"),
      message: z.string().min(1, "Message is required"),
      sender: z.string().optional(),
      replyWebhookUrl: z.string().url().optional(),
      webhookData: z.string().max(100).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next({
        status: 400,
        message: "Invalid request body",
        details: parsed.error.format(),
      });
    }

    // Send SMS
    const smsRequest: SendSmsRequest = {
      phone: parsed.data.phone,
      message: parsed.data.message,
      sender: parsed.data.sender,
      replyWebhookUrl: parsed.data.replyWebhookUrl,
      webhookData: parsed.data.webhookData,
    };

    const result = await SmsService.sendSms(smsRequest);
    res.json(result);
  } catch (error) {
    console.error("SMS Send Error:", error);
    next({
      status: 500,
      message: error instanceof Error ? error.message : "Failed to send SMS",
    });
  }
});

// SMS Webhook endpoint (for receiving replies)
router.post("/sms/webhook", async (req, res, next) => {
  try {
    console.log("=== SMS WEBHOOK RECEIVED ===");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("Raw Body:", JSON.stringify(req.body, null, 2));

    const signature = req.headers["x-textbelt-signature"] as string;
    const timestamp = req.headers["x-textbelt-timestamp"] as string;
    const payload = JSON.stringify(req.body);
    const apiKey = process.env.TEXTBELT_API_KEY || "textbelt";

    console.log("Signature:", signature);
    console.log("Timestamp:", timestamp);
    console.log("API Key exists:", !!apiKey);

    // Verify webhook signature
    if (signature && timestamp) {
      const isValid = SmsService.verifyWebhook(
        apiKey,
        timestamp,
        signature,
        payload
      );
      console.log("Signature validation result:", isValid);

      if (!isValid) {
        console.log("❌ Invalid webhook signature");
        return next({ status: 401, message: "Invalid webhook signature" });
      }

      // Check timestamp (not more than 15 minutes old)
      const timestampSeconds = parseInt(timestamp);
      const now = Math.floor(Date.now() / 1000);
      const timeDiff = now - timestampSeconds;
      console.log("Timestamp difference (seconds):", timeDiff);

      if (timeDiff > 900) {
        // 15 minutes
        console.log("❌ Webhook timestamp too old");
        return next({ status: 401, message: "Webhook timestamp too old" });
      }
    } else {
      console.log(
        "⚠️ No signature or timestamp provided - proceeding without verification"
      );
    }

    // Process the webhook payload
    const webhookData: SmsWebhookPayload = req.body;

    // Log the received reply (you can expand this to handle the reply)
    console.log("Received SMS reply:", {
      textId: webhookData.textId,
      fromNumber: webhookData.fromNumber,
      text: webhookData.text,
      data: webhookData.data,
    });

    // Handle SMS replies with AI responses
    if (webhookData.text.toLowerCase().includes("stop")) {
      // User wants to opt out - don't respond
      res.json({ success: true, message: "User opted out" });
      return;
    }

    // Generate AI response to their question
    try {
      const aiResponse = await AIService.generateResponse({
        message: `You are StudyBuddy, a helpful study assistant. Answer this study question concisely and helpfully in under 160 characters. Be encouraging and supportive. Question: ${webhookData.text}`,
        maxTokens: 60,
        temperature: 0.7,
      });

      // Send AI response back via SMS
      await SmsService.sendSms({
        phone: webhookData.fromNumber,
        message: `📚 StudyBuddy: ${aiResponse.response}`,
        replyWebhookUrl: process.env.SMS_WEBHOOK_URL,
      });

      console.log(
        `Sent AI reply to ${webhookData.fromNumber}: ${aiResponse.response}`
      );
    } catch (error) {
      console.error("Failed to generate/send AI response:", error);

      // Send fallback message
      await SmsService.sendSms({
        phone: webhookData.fromNumber,
        message:
          "Sorry, I couldn't process your question right now. Please try again later! 📚",
      });
    }

    res.json({ success: true, message: "Reply processed and sent" });
  } catch (error) {
    console.error("SMS Webhook Error:", error);
    next({
      status: 500,
      message:
        error instanceof Error ? error.message : "Failed to process webhook",
    });
  }
});

// Enable chat for existing subscribers
router.post("/sms/enable-chat", async (req, res, next) => {
  try {
    const schema = z.object({
      phone: z.string().min(10, "Phone number is required"),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next({
        status: 400,
        message: "Invalid request body",
        details: parsed.error.format(),
      });
    }

    const webhookUrl = process.env.SMS_WEBHOOK_URL;
    if (!webhookUrl) {
      return next({
        status: 500,
        message: "SMS webhook not configured",
      });
    }

    // Send welcome chat message
    const result = await SmsService.sendSms({
      phone: parsed.data.phone,
      message:
        "🎓 StudyBuddy Chat Enabled! Reply with any study question and I'll answer with AI! Try asking me something now.",
      replyWebhookUrl: webhookUrl,
    });

    res.json({
      success: true,
      message: "Chat functionality enabled! Check your phone.",
      smsResult: result,
    });
  } catch (error) {
    console.error("Enable Chat Error:", error);
    next({
      status: 500,
      message: error instanceof Error ? error.message : "Failed to enable chat",
    });
  }
});

// SMS Webhook Test endpoint (GET)
router.get("/sms/webhook", (req, res) => {
  console.log("=== SMS WEBHOOK TEST (GET) ===");
  res.json({
    message: "SMS webhook endpoint is reachable",
    timestamp: new Date().toISOString(),
    url: req.originalUrl,
  });
});

// SMS Configuration Check endpoint
router.get("/sms/config", (req, res) => {
  res.json({
    textbeltConfigured: SmsService.validateConfiguration(),
    webhookUrl: process.env.SMS_WEBHOOK_URL || "Not configured",
    environment: {
      TEXTBELT_API_KEY: !!process.env.TEXTBELT_API_KEY,
      SMS_WEBHOOK_URL: !!process.env.SMS_WEBHOOK_URL,
      SMS_SENDER_NAME: process.env.SMS_SENDER_NAME || "Not set",
    },
  });
});

// SMS Test endpoint
router.get("/sms/test", async (req, res, next) => {
  try {
    const result = await SmsService.testConfiguration();
    res.json({
      configured: SmsService.validateConfiguration(),
      test: result,
    });
  } catch (error) {
    console.error("SMS Test Error:", error);
    next({
      status: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to test SMS configuration",
    });
  }
});

export default router;
