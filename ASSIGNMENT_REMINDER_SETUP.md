# StudyBuddy Assignment Reminder Setup

## Overview

StudyBuddy now integrates Canvas API, OpenAI, and SMS services to send friendly assignment reminders to students. When a user enters their Canvas API key and phone number in the frontend, the system will:

1. **Fetch assignments** from Canvas API (upcoming assignments in the next 7 days)
2. **Generate friendly text** using OpenAI as if it was a friend reminding about assignments
3. **Send SMS** to the user's phone number with the personalized reminder

## Environment Variables Required

Make sure to set these environment variables in your backend `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# SMS Configuration (Textbelt)
TEXTBELT_API_KEY=your_textbelt_api_key_here
SMS_SENDER_NAME=StudyBuddy
SMS_WEBHOOK_URL=http://your-domain.com/api/v1/sms/webhook
```

## API Endpoints

### New Endpoint: `/api/v1/canvas/send-assignment-reminder`

**Method:** POST  
**Description:** Integrates Canvas → OpenAI → SMS flow

**Request Body:**

```json
{
  "apiKey": "your_canvas_api_key",
  "phoneNumber": "+1234567890",
  "canvasUrl": "https://sjsu.instructure.com", // optional, defaults to SJSU
  "daysAhead": 7 // optional, defaults to 7 days
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Assignment reminder sent successfully!",
  "data": {
    "assignmentsFound": 3,
    "coursesChecked": 5,
    "reminderText": "Hey! You've got 3 assignments due soon. Math homework due tomorrow - you got this! 📚",
    "smsDelivered": true,
    "textId": "12345"
  }
}
```

## Frontend Changes

The frontend now:

- Updates the endpoint to use the new assignment reminder flow
- Shows better loading states and user feedback
- Validates input before sending requests
- Provides clear success/error messages

## How It Works

1. **User Input:** User enters Canvas API key and phone number
2. **Canvas Integration:** System fetches all active courses and upcoming assignments
3. **AI Processing:** OpenAI generates a friendly, casual reminder text (under 160 characters)
4. **SMS Delivery:** Textbelt sends the personalized reminder to the user's phone
5. **Response:** User gets confirmation with details about assignments found and delivery status

## Example AI-Generated Messages

- "Hey! You've got 3 assignments due this week. Math homework tomorrow & history essay Friday. You got this! 📚"
- "Reminder: 2 assignments coming up! CS project due Wed & bio lab Thu. Time to crush it! 💪"
- "No assignments due this week - you're all caught up! Enjoy your free time! 🎉"

## Error Handling

The system provides specific error messages for:

- Invalid Canvas API keys
- Network issues with Canvas API
- OpenAI API failures
- SMS delivery problems
- Invalid phone numbers

## Testing

To test the complete flow:

1. Get a valid Canvas API key from your institution
2. Set up environment variables (OpenAI + Textbelt)
3. Run the backend: `npm run dev`
4. Run the frontend: `npm run dev`
5. Enter your Canvas API key and phone number
6. Click "Send Assignment Reminder"
7. Check your phone for the SMS!

## Canvas API Key Setup

To get your Canvas API key:

1. Log into your Canvas account
2. Go to Account → Settings
3. Scroll down to "Approved Integrations"
4. Click "+ New Access Token"
5. Enter a purpose (e.g., "StudyBuddy App")
6. Copy the generated token

**Note:** Keep your API key secure and never share it publicly.
