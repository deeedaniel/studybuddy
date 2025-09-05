import crypto from 'crypto';

export interface SendSmsRequest {
  phone: string;
  message: string;
  sender?: string;
  replyWebhookUrl?: string;
  webhookData?: string;
}

export interface SendSmsResponse {
  success: boolean;
  quotaRemaining?: number;
  textId?: string;
  error?: string;
}

export interface SmsWebhookPayload {
  textId: string;
  fromNumber: string;
  text: string;
  data?: string;
}

export class SmsService {
  private static readonly TEXTBELT_URL = 'https://textbelt.com/text';

  /**
   * Send an SMS using Textbelt API
   */
  static async sendSms(request: SendSmsRequest): Promise<SendSmsResponse> {
    try {
      const apiKey = process.env.TEXTBELT_API_KEY || 'textbelt';
      
      const payload: Record<string, string> = {
        phone: request.phone,
        message: request.message,
        key: apiKey,
      };

      // Add optional fields if provided
      if (request.sender || process.env.SMS_SENDER_NAME) {
        payload.sender = request.sender || process.env.SMS_SENDER_NAME!;
      }

      if (request.replyWebhookUrl) {
        payload.replyWebhookUrl = request.replyWebhookUrl;
      }

      if (request.webhookData) {
        payload.webhookData = request.webhookData;
      }

      const response = await fetch(this.TEXTBELT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SendSmsResponse = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Textbelt API Error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while sending SMS');
    }
  }

  /**
   * Verify webhook signature for security
   */
  static verifyWebhook(
    apiKey: string,
    timestamp: string,
    signature: string,
    payload: string
  ): boolean {
    try {
      const mySignature = crypto
        .createHmac('sha256', apiKey)
        .update(timestamp + payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(mySignature)
      );
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }

  /**
   * Validate SMS configuration
   */
  static validateConfiguration(): boolean {
    return !!process.env.TEXTBELT_API_KEY;
  }

  /**
   * Test SMS configuration without using quota
   */
  static async testConfiguration(): Promise<SendSmsResponse> {
    const testKey = (process.env.TEXTBELT_API_KEY || 'textbelt') + '_test';
    
    return this.sendSms({
      phone: '5555555555',
      message: 'Test message',
    });
  }
}
