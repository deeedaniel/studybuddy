import { Router } from "express";
import { z } from "zod";
import { AIService, AIGenerateRequest } from "../services/ai";
import { SmsService, SendSmsRequest, SmsWebhookPayload } from "../services/sms";

const router = Router();

// AI Generate endpoint
router.post("/ai/generate", async (req, res, next) => {
  try {
    // Validate OpenAI configuration
    if (!AIService.validateConfiguration()) {
      return next({ 
        status: 500, 
        message: "OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables." 
      });
    }

    // Validate request body
    const schema = z.object({
      message: z.string().min(1, "Message is required"),
      model: z.string().optional(),
      maxTokens: z.number().min(1).max(4000).optional(),
      temperature: z.number().min(0).max(2).optional()
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next({ 
        status: 400, 
        message: "Invalid request body",
        details: parsed.error.errors
      });
    }

    // Generate AI response
    const aiRequest: AIGenerateRequest = {
      message: parsed.data.message,
      model: parsed.data.model,
      maxTokens: parsed.data.maxTokens,
      temperature: parsed.data.temperature
    };

    const result = await AIService.generateResponse(aiRequest);
    res.json(result);

  } catch (error) {
    console.error('AI Generation Error:', error);
    next({ 
      status: 500, 
      message: error instanceof Error ? error.message : "Failed to generate AI response" 
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
      webhookData: z.string().max(100).optional()
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next({ 
        status: 400, 
        message: "Invalid request body",
        details: parsed.error.errors
      });
    }

    // Send SMS
    const smsRequest: SendSmsRequest = {
      phone: parsed.data.phone,
      message: parsed.data.message,
      sender: parsed.data.sender,
      replyWebhookUrl: parsed.data.replyWebhookUrl,
      webhookData: parsed.data.webhookData
    };

    const result = await SmsService.sendSms(smsRequest);
    res.json(result);

  } catch (error) {
    console.error('SMS Send Error:', error);
    next({ 
      status: 500, 
      message: error instanceof Error ? error.message : "Failed to send SMS" 
    });
  }
});

// SMS Webhook endpoint (for receiving replies)
router.post("/sms/webhook", async (req, res, next) => {
  try {
    const signature = req.headers['x-textbelt-signature'] as string;
    const timestamp = req.headers['x-textbelt-timestamp'] as string;
    const payload = JSON.stringify(req.body);
    const apiKey = process.env.TEXTBELT_API_KEY || 'textbelt';

    // Verify webhook signature
    if (signature && timestamp) {
      const isValid = SmsService.verifyWebhook(apiKey, timestamp, signature, payload);
      if (!isValid) {
        return next({ status: 401, message: "Invalid webhook signature" });
      }

      // Check timestamp (not more than 15 minutes old)
      const timestampSeconds = parseInt(timestamp);
      const now = Math.floor(Date.now() / 1000);
      if (now - timestampSeconds > 900) { // 15 minutes
        return next({ status: 401, message: "Webhook timestamp too old" });
      }
    }

    // Process the webhook payload
    const webhookData: SmsWebhookPayload = req.body;
    
    // Log the received reply (you can expand this to handle the reply)
    console.log('Received SMS reply:', {
      textId: webhookData.textId,
      fromNumber: webhookData.fromNumber,
      text: webhookData.text,
      data: webhookData.data
    });

    // Handle SMS replies with AI responses
    if (webhookData.text.toLowerCase().includes('stop')) {
      // User wants to opt out - don't respond
      res.json({ success: true, message: "User opted out" });
      return;
    }

    // Generate AI response to their question
    try {
      const aiResponse = await AIService.generateResponse({
        message: `You are a helpful study assistant. Answer this question briefly (under 160 characters): ${webhookData.text}`,
        maxTokens: 50,
        temperature: 0.7
      });

      // Send AI response back via SMS
      await SmsService.sendSms({
        phone: webhookData.fromNumber,
        message: `StudyBuddy: ${aiResponse.response}`,
        replyWebhookUrl: process.env.SMS_WEBHOOK_URL
      });

      console.log(`Sent AI reply to ${webhookData.fromNumber}: ${aiResponse.response}`);
    } catch (error) {
      console.error('Failed to generate/send AI response:', error);
      
      // Send fallback message
      await SmsService.sendSms({
        phone: webhookData.fromNumber,
        message: "Sorry, I couldn't process your question right now. Please try again later!"
      });
    }

    res.json({ success: true, message: "Reply processed and sent" });

  } catch (error) {
    console.error('SMS Webhook Error:', error);
    next({ 
      status: 500, 
      message: error instanceof Error ? error.message : "Failed to process webhook" 
    });
  }
});

// SMS Test endpoint
router.get("/sms/test", async (req, res, next) => {
  try {
    const result = await SmsService.testConfiguration();
    res.json({ 
      configured: SmsService.validateConfiguration(),
      test: result 
    });
  } catch (error) {
    console.error('SMS Test Error:', error);
    next({ 
      status: 500, 
      message: error instanceof Error ? error.message : "Failed to test SMS configuration" 
    });
  }
});

export default router;
