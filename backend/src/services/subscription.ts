import fs from "fs";
import path from "path";

export interface Subscription {
  id: string;
  phoneNumber: string;
  apiKey: string;
  canvasUrl?: string;
  daysAhead?: number;
  createdAt: string;
  isActive: boolean;
}

class SubscriptionService {
  private subscriptionsFile = path.join(
    __dirname,
    "../../data/subscriptions.json"
  );

  constructor() {
    this.ensureDataDirectory();
  }

  private ensureDataDirectory() {
    const dataDir = path.dirname(this.subscriptionsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.subscriptionsFile)) {
      fs.writeFileSync(this.subscriptionsFile, JSON.stringify([]));
    }
  }

  private readSubscriptions(): Subscription[] {
    try {
      const data = fs.readFileSync(this.subscriptionsFile, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading subscriptions:", error);
      return [];
    }
  }

  private writeSubscriptions(subscriptions: Subscription[]): void {
    try {
      fs.writeFileSync(
        this.subscriptionsFile,
        JSON.stringify(subscriptions, null, 2)
      );
    } catch (error) {
      console.error("Error writing subscriptions:", error);
      throw error;
    }
  }

  createSubscription(
    data: Omit<Subscription, "id" | "createdAt" | "isActive">
  ): Subscription {
    const subscriptions = this.readSubscriptions();

    // Check if phone number already exists
    const existing = subscriptions.find(
      (sub) => sub.phoneNumber === data.phoneNumber
    );
    if (existing) {
      throw new Error("Phone number already subscribed");
    }

    const subscription: Subscription = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...data,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    subscriptions.push(subscription);
    this.writeSubscriptions(subscriptions);
    return subscription;
  }

  getActiveSubscriptions(): Subscription[] {
    return this.readSubscriptions().filter((sub) => sub.isActive);
  }

  unsubscribe(phoneNumber: string): boolean {
    const subscriptions = this.readSubscriptions();
    const index = subscriptions.findIndex(
      (sub) => sub.phoneNumber === phoneNumber
    );

    if (index === -1) {
      return false;
    }

    subscriptions[index].isActive = false;
    this.writeSubscriptions(subscriptions);
    return true;
  }

  deleteSubscription(phoneNumber: string): boolean {
    const subscriptions = this.readSubscriptions();
    const filtered = subscriptions.filter(
      (sub) => sub.phoneNumber !== phoneNumber
    );

    if (filtered.length === subscriptions.length) {
      return false; // No subscription found
    }

    this.writeSubscriptions(filtered);
    return true;
  }

  getSubscription(phoneNumber: string): Subscription | null {
    const subscriptions = this.readSubscriptions();
    return subscriptions.find((sub) => sub.phoneNumber === phoneNumber) || null;
  }
}

export default new SubscriptionService();
