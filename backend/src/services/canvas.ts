import axios from "axios";

export interface Assignment {
  id: number;
  name: string;
  description?: string;
  due_at?: string;
  points_possible?: number;
  course_id: number;
  html_url: string;
}

export interface Course {
  id: number;
  name: string;
  course_code: string;
}

export interface CanvasAssignmentRequest {
  apiKey: string;
  canvasUrl?: string; // defaults to SJSU
}

export interface CanvasAssignmentResponse {
  assignments: Assignment[];
  courses: Course[];
}

export class CanvasService {
  private static readonly DEFAULT_CANVAS_URL = "https://sjsu.instructure.com";

  /**
   * Fetch all courses for a user
   */
  static async getCourses(
    apiKey: string,
    canvasUrl = this.DEFAULT_CANVAS_URL
  ): Promise<Course[]> {
    try {
      const response = await axios.get(`${canvasUrl}/api/v1/courses`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        params: {
          enrollment_state: "active",
          per_page: 100,
        },
      });

      return response.data.filter(
        (course: any) => course.name && !course.access_restricted_by_date
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Canvas API Error: ${error.response?.data?.message || error.message}`
        );
      }
      throw new Error(
        "Unknown error occurred while fetching courses from Canvas"
      );
    }
  }

  /**
   * Fetch assignments for a specific course
   */
  static async getCourseAssignments(
    apiKey: string,
    courseId: number,
    canvasUrl = this.DEFAULT_CANVAS_URL
  ): Promise<Assignment[]> {
    try {
      const response = await axios.get(
        `${canvasUrl}/api/v1/courses/${courseId}/assignments`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          params: {
            per_page: 100,
            order_by: "due_at",
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Canvas API Error: ${error.response?.data?.message || error.message}`
        );
      }
      throw new Error(
        "Unknown error occurred while fetching assignments from Canvas"
      );
    }
  }

  /**
   * Fetch all upcoming assignments across all courses
   */
  static async getUpcomingAssignments(
    apiKey: string,
    canvasUrl = this.DEFAULT_CANVAS_URL,
    daysAhead = 7
  ): Promise<CanvasAssignmentResponse> {
    try {
      // Get all active courses
      const courses = await this.getCourses(apiKey, canvasUrl);

      // Get assignments for each course
      const assignmentPromises = courses.map(async (course) => {
        try {
          const assignments = await this.getCourseAssignments(
            apiKey,
            course.id,
            canvasUrl
          );
          return assignments.map((assignment) => ({
            ...assignment,
            courseName: course.name,
            courseCode: course.course_code,
          }));
        } catch (error) {
          console.warn(
            `Failed to fetch assignments for course ${course.name}:`,
            error
          );
          return [];
        }
      });

      const allAssignments = (await Promise.all(assignmentPromises)).flat();

      // Filter for upcoming assignments
      const now = new Date();
      const futureDate = new Date(
        now.getTime() + daysAhead * 24 * 60 * 60 * 1000
      );

      const upcomingAssignments = allAssignments.filter((assignment) => {
        if (!assignment.due_at) return false;
        const dueDate = new Date(assignment.due_at);
        return dueDate >= now && dueDate <= futureDate;
      });

      // Sort by due date
      upcomingAssignments.sort((a, b) => {
        if (!a.due_at || !b.due_at) return 0;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });

      return {
        assignments: upcomingAssignments,
        courses,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Canvas Service Error: ${error.message}`);
      }
      throw new Error("Unknown error occurred while fetching Canvas data");
    }
  }

  /**
   * Format assignments for AI processing
   */
  static formatAssignmentsForAI(assignments: Assignment[]): string {
    if (assignments.length === 0) {
      return "You have no upcoming assignments in the next 7 days. Great job staying on top of your work!";
    }

    const assignmentTexts = assignments
      .map((assignment) => {
        const dueDate = assignment.due_at
          ? new Date(assignment.due_at).toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "No due date";

        const courseName = (assignment as any).courseName || "Unknown Course";
        const points = assignment.points_possible
          ? ` (${assignment.points_possible} points)`
          : "";

        return `• ${assignment.name} for ${courseName}${points} - Due: ${dueDate}`;
      })
      .join("\n");

    return `Here are your upcoming assignments:\n\n${assignmentTexts}`;
  }
}
