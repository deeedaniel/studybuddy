import cron from "node-cron";
import axios from "axios";
import SubscriptionService from "./subscription";

class CronJobService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BASE_URL || "http://localhost:4000";
  }

  startDailyReminderJob() {
    // Run every day at 9:00 AM
    // You can change this to any time you want
    // Format: minute hour day month dayOfWeek
    const cronExpression = "0 9 * * *"; // 9:00 AM every day

    console.log("🔄 Starting daily assignment reminder cron job...");
    console.log("📅 Will run every day at 9:00 AM");

    cron.schedule(
      cronExpression,
      async () => {
        console.log("🚀 Running daily assignment reminder job...");
        await this.sendDailyReminders();
      },
      {
        scheduled: true,
        timezone: "America/Los_Angeles", // Adjust timezone as needed
      }
    );

    // Optional: For testing, you can also run every minute
    // Uncomment the line below and comment the one above for testing
    // cron.schedule('* * * * *', async () => {
    //   console.log('🧪 TEST: Running assignment reminder job...');
    //   await this.sendDailyReminders();
    // });
  }

  private async sendDailyReminders() {
    try {
      const activeSubscriptions = SubscriptionService.getActiveSubscriptions();
      console.log(
        `📱 Found ${activeSubscriptions.length} active subscriptions`
      );

      if (activeSubscriptions.length === 0) {
        console.log("No active subscriptions found");
        return;
      }

      // Send reminders to all active subscribers
      const promises = activeSubscriptions.map(async (subscription) => {
        try {
          console.log(`📤 Sending reminder to ${subscription.phoneNumber}...`);

          const response = await axios.post(
            `${this.baseUrl}/api/v1/canvas/send-assignment-reminder`,
            {
              apiKey: subscription.apiKey,
              phoneNumber: subscription.phoneNumber,
              canvasUrl: subscription.canvasUrl,
              daysAhead: subscription.daysAhead || 7,
            }
          );

          console.log(
            `✅ Reminder sent successfully to ${subscription.phoneNumber}`
          );
          return { phoneNumber: subscription.phoneNumber, success: true };
        } catch (error) {
          console.error(
            `❌ Failed to send reminder to ${subscription.phoneNumber}:`,
            error
          );
          return {
            phoneNumber: subscription.phoneNumber,
            success: false,
            error,
          };
        }
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(
        (r) => r.status === "fulfilled" && r.value.success
      ).length;
      const failed = results.length - successful;

      console.log(
        `📊 Daily reminder job completed: ${successful} successful, ${failed} failed`
      );
    } catch (error) {
      console.error("💥 Error in daily reminder job:", error);
    }
  }

  // Method to manually trigger reminders (useful for testing)
  async triggerManualReminders() {
    console.log("🧪 Manually triggering reminders...");
    await this.sendDailyReminders();
  }
}

export default new CronJobService();
