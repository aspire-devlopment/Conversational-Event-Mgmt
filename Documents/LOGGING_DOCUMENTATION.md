# Comprehensive Logging - Gemini AI Chat

## What's Being Logged

I've added comprehensive logging throughout the entire chat flow so you can see exactly what's happening at every step.

## 📋 Log Output Examples

### 1. **Server Startup**
```
LLM Configuration: provider=gemini, model=gemini-2.0-flash
```

### 2. **Create Session Request**
```
CREATE SESSION REQUEST
  userId: 17
  language: en

Generating greeting from Gemini AI
🔔 GENERATING GREETING
  language: en
  greetingRequest: Generate a brief, friendly greeting...
  
✅ GREETING GENERATED
  greetingMessage: "Hi! I can help you create an event..."
  greetingLength: 65
  intent: clarify
  confidence: 0.7

Chat session created successfully
```

### 3. **Send Message Request**
```
SEND MESSAGE REQUEST
  sessionId: abc-123
  messageLength: 45
  messagePreview: "Create an event called Team Meeting..."

📨 PROCESS MESSAGE REQUEST
  userMessage: "Create an event called Team Meeting..."
  historyLength: 1
  language: en
  currentEventDraft: { title: null, dateTime: null, ... }
  
📤 SENDING TO GEMINI API
  userMessage: "Create an event called Team Meeting..."
  conversationHistory: [...]

Making Gemini API Request (attempt 1/3)
Making Gemini API Request
  hostname: generativelanguage.googleapis.com
  path: /v1beta/models/gemini-2.0-flash:generateContent
  model: gemini-2.0-flash
  messageCount: 3

📥 GEMINI RESPONSE RECEIVED
  responseStatus: success
  responseCode: 200
  fullResponse: {"candidates": [...]}
  
✅ GEMINI RESPONSE CONTENT
  contentLength: 180
  contentPreview: "{\"intent\":\"provide_date\",\"message\":\"Sure, I can help you create an event...\"}"
  fullContent: "{\"intent\":\"provide_date\",\"message\":\"Sure, I can help you create an event...\",\"extractedData\":{\"title\":\"Team Meeting\",...}}"

✅ SUCCESS - Parsed LLM response
  intent: provide_date
  confidence: 0.95
  extractedData: { title: "Team Meeting", ... }
  message: "Sure, I can help you create an event..."
  
✅ MESSAGE PROCESSED SUCCESSFULLY
  intent: provide_date
  confidence: 0.95

Bot response added to history
Send message completed successfully
```

### 4. **Error Scenarios**

**Invalid API Key:**
```
❌ GEMINI API ERROR RESPONSE
  errorStatus: 400
  errorDetails: {"error": {"message": "Invalid API key provided"}}
  errorMessage: "Invalid API key provided"
```

**Network Error:**
```
❌ Gemini API REQUEST FAILED
  error: connect ECONNREFUSED
  errorName: Error
  errorStack: Error: connect ECONNREFUSED
```

**Parse Error:**
```
❌ PARSE ERROR - Failed to parse Gemini response
  error: Unexpected token } in JSON
  rawData: "{invalid json...}"
```

## 🔍 What to Look For

### ✅ Success Indicators
- `"✅ GEMINI RESPONSE CONTENT"`
- `"✅ SUCCESS - Parsed LLM response"`
- `"✅ MESSAGE PROCESSED SUCCESSFULLY"`
- `"✅ GREETING GENERATED"`

### ❌ Error Indicators
- `"❌ GEMINI API ERROR RESPONSE"`
- `"❌ Gemini API REQUEST FAILED"`
- `"❌ PARSE ERROR"`
- `"❌ ERROR PROCESSING MESSAGE"`
- `"❌ FAILED TO GENERATE GREETING"`

## 📝 Detailed Log Fields

Each log entry includes:

### Request Logs
- `userMessage` - What the user typed
- `messageLength` - Length of message
- `language` - Current language
- `conversationHistory` - Previous messages
- `systemPrompt` - The prompt being used
- `contextMessage` - Context sent to AI
- `messagesCount` - Number of messages in request

### Response Logs
- `responseStatus` - "success" or "error"
- `responseCode` - HTTP status code (200, 400, etc.)
- `fullResponse` - Complete API response (formatted JSON)
- `contentLength` - Length of AI response
- `contentPreview` - First 200 characters
- `fullContent` - Complete AI response text

### Error Logs
- `error` - Error message
- `errorName` - Type of error
- `errorStack` - Full stack trace
- `timestamp` - Exact time of error
- `rawResponse` - Raw API response
- `requestPayload` - What was sent

## 📂 Where to Find Logs

1. **Backend Console** - Real-time output in terminal
2. **Log File** - `backend/logs/YYYY-MM-DD.log`

## 🔧 How to Test

### 1. Restart Backend
```batch
cd backend
taskkill /F /IM node.exe
node server.js
```

### 2. Open Browser
- Go to `http://localhost:3000`
- Login as admin
- Go to Admin Chat page

### 3. Send Test Message
```
"Create an event called Team Meeting tomorrow at 3 PM"
```

### 4. Watch Backend Console

Look for these patterns:

**Success:**
```
📥 GEMINI RESPONSE RECEIVED
✅ GEMINI RESPONSE CONTENT
✅ SUCCESS - Parsed LLM response
```

**Errors:**
```
❌ GEMINI API ERROR RESPONSE
❌ Gemini API REQUEST FAILED
❌ PARSE ERROR
```

## 🎯 Quick Debugging Guide

### Issue: "Invalid API key"
**Look for:**
```
❌ GEMINI API ERROR RESPONSE
  errorMessage: "Invalid API key provided"
```
**Solution:** Check your `GEMINI_API_KEY` in `.env`

### Issue: "Rate limit exceeded"
**Look for:**
```
Rate limited, retrying in 1500ms
```
**Solution:** Wait and try again, or increase `GEMINI_RATE_LIMIT`

### Issue: "No content in response"
**Look for:**
```
❌ NO CONTENT in Gemini response
  candidates: undefined
```
**Solution:** Check if Gemini API returned valid data

### Issue: "Parse error"
**Look for:**
```
❌ PARSE ERROR - Failed to parse Gemini response
  rawData: "{invalid...}"
```
**Solution:** Check if AI returned proper JSON format

## 📊 Sample Success Log Flow

1. `📨 PROCESS MESSAGE REQUEST`
2. `📤 SENDING TO GEMINI API`
3. `Making Gemini API Request`
4. `📥 GEMINI RESPONSE RECEIVED`
5. `✅ GEMINI RESPONSE CONTENT`
6. `✅ SUCCESS - Parsed LLM response`
7. `✅ MESSAGE PROCESSED SUCCESSFULLY`

## 💡 Tips

- Watch the console in real-time
- Use `JSON.stringify(obj, null, 2)` to see formatted JSON
- Check timestamps to track performance
- Look for the emojis (📨📤📥✅❌) to quickly spot log types
