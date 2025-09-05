import { Router } from "express";
import { z } from "zod";
import axios from "axios";
import { CanvasService } from "../services/canvas";
import { AIService } from "../services/ai";
import { SmsService } from "../services/sms";

const router = Router();

const canvasRequestSchema = z.object({
  apiKey: z.string().min(1),
  phoneNumber: z.string().min(1),
});

router.post("/courses", async (req, res, next) => {
  const parsed = canvasRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return next({ status: 400, message: "Invalid body" });
  }

  const { apiKey } = parsed.data;

  try {
    const coursesResponse = await axios.get(
      "https://sjsu.instructure.com/api/v1/courses",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    res.json({ courses: coursesResponse.data });
  } catch (error) {
    console.error("Error fetching from Canvas API:", error);
    next({ status: 500, message: "Failed to fetch from Canvas API" });
  }
});

// Assignment reminder endpoint - integrates Canvas API -> OpenAI -> SMS
router.post("/send-assignment-reminder", async (req, res, next) => {
  try {
    // Validate request body
    const schema = z.object({
      apiKey: z.string().min(1, "Canvas API key is required"),
      phoneNumber: z.string().min(10, "Phone number is required"),
      canvasUrl: z.string().url().optional(),
      daysAhead: z.number().min(1).max(30).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next({
        status: 400,
        message: "Invalid request body",
        details: parsed.error.format(),
      });
    }

    const { apiKey, phoneNumber, canvasUrl, daysAhead = 7 } = parsed.data;

    // Validate AI configuration
    if (!AIService.validateConfiguration()) {
      return next({
        status: 500,
        message:
          "OpenAI API key not configured. Please set OPENAI_API_KEY in environment variables.",
      });
    }

    // Step 1: Fetch assignments from Canvas
    console.log("Fetching assignments from Canvas...");
    const canvasData = await CanvasService.getUpcomingAssignments(
      apiKey,
      canvasUrl,
      daysAhead
    );

    // Step 2: Format assignments for AI processing
    const assignmentText = CanvasService.formatAssignmentsForAI(
      canvasData.assignments
    );

    console.log("Assignment text:", assignmentText);

    // Step 3: Generate friendly reminder text with OpenAI
    console.log("Generating friendly reminder with OpenAI...");

    const aiPrompt = `You are a friendly study buddy helping a college student. Based on their upcoming assignments, write a casual, encouraging text message reminder (under 160 characters) as if you're their friend. Be supportive and motivating, but keep it brief for SMS. Be specific with the assignment & due dates and name them.

Assignments:
${assignmentText}

Write a friendly reminder text:`;

    const aiResponse = await AIService.generateResponse({
      message: aiPrompt,
      maxTokens: 100,
      temperature: 0.8,
    });

    // Step 4: Send SMS with the friendly reminder
    console.log("Sending SMS reminder...");
    const smsResponse = await SmsService.sendSms({
      phone: phoneNumber,
      message: aiResponse.response,
      sender: "StudyBuddy",
      replyWebhookUrl: process.env.SMS_WEBHOOK_URL,
    });

    // Return success response with details
    res.json({
      success: true,
      message: "Assignment reminder sent successfully!",
      data: {
        assignmentsFound: canvasData.assignments.length,
        coursesChecked: canvasData.courses.length,
        reminderText: aiResponse.response,
        smsDelivered: smsResponse.success,
        textId: smsResponse.textId,
      },
    });
  } catch (error) {
    console.error("Assignment Reminder Error:", error);

    // Provide specific error messages based on the error type
    let errorMessage = "Failed to send assignment reminder";
    if (error instanceof Error) {
      if (error.message.includes("Canvas API Error")) {
        errorMessage =
          "Failed to fetch assignments from Canvas. Please check your API key and permissions.";
      } else if (error.message.includes("OpenAI API Error")) {
        errorMessage = "Failed to generate reminder text. Please try again.";
      } else if (error.message.includes("Textbelt API Error")) {
        errorMessage =
          "Failed to send SMS. Please check the phone number and try again.";
      } else {
        errorMessage = error.message;
      }
    }

    next({
      status: 500,
      message: errorMessage,
    });
  }
});

export default router;
