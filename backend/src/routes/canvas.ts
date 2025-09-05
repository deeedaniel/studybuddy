import { Router } from "express";
import { z } from "zod";
import axios from "axios";

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

export default router;
