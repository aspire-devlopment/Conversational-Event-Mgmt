# Google Gemini AI Setup Guide

## Quick Setup for Dynamic Configuration

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Click "Get API Key"
4. Copy your API key

### 2. Configure Environment Variables

Copy the provided `.env.gemini` file to `.env`:

```bash
cp .env.gemini .env
```

Edit `.env` and replace:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Available Gemini Models

#### Free Tier Models:
- `gemini-1.5-flash` - Fast, lightweight (Recommended)
- `gemini-1.5-flash-8b` - Experimental, very fast
- `gemini-1.0-pro` - Stable version

#### Pro Models (may have costs):
- `gemini-1.5-pro` - Advanced capabilities

### 4. Dynamic Configuration

The system is fully dynamic. Change these values in `.env` to switch models:

```env
# Change model
GEMINI_MODEL=gemini-1.5-pro

# Change API endpoint (if using proxy)
GEMINI_HOSTNAME=your-proxy-domain.com
GEMINI_PORT=443

# Change API version
GEMINI_API_VERSION=v1beta

# Adjust parameters
GEMINI_TEMPERATURE=0.8
GEMINI_TOP_P=0.95
```

### 5. Test the Configuration

Start your server:
```bash
npm run dev
```

Test the chat:
```bash
curl -X POST http://localhost:5000/api/chat/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"userId": "test", "language": "en"}'
```

### 6. Future Model Changes

To change to a different model in the future:

1. Update `.env`:
   ```env
   GEMINI_MODEL=new-model-name
   ```

2. Restart the server:
   ```bash
   npm run dev
   ```

No code changes required!

### 7. Environment Variable Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Your Gemini API key | Required |
| `GEMINI_MODEL` | Model name | `gemini-1.5-flash` |
| `GEMINI_HOSTNAME` | API hostname | `generativelanguage.googleapis.com` |
| `GEMINI_PORT` | API port | `443` |
| `GEMINI_PROTOCOL` | HTTP/HTTPS | `https` |
| `GEMINI_API_VERSION` | API version | `v1beta` |
| `GEMINI_TEMPERATURE` | Response randomness | `0.7` |
| `GEMINI_TOP_P` | Nucleus sampling | `0.9` |
| `GEMINI_TOP_K` | Token sampling | `40` |
| `GEMINI_RATE_LIMIT` | Requests per minute | `60` |

### 8. Troubleshooting

#### Common Issues:

**API Key Error:**
```
Error: GEMINI_API_KEY or LLM_API_KEY is required
```
- Check your API key in `.env`
- Ensure no extra spaces

**Model Not Found:**
```
Error: Model not-found
```
- Verify model name spelling
- Check if model is available in your region

**Rate Limit:**
```
Error: Gemini rate limit exceeded
```
- Wait for rate limit reset (1 minute)
- Reduce `GEMINI_RATE_LIMIT` value

#### Debug Mode:
```env
LOG_LEVEL=debug
```

### 9. Production Tips

1. **Use environment-specific configs**
2. **Monitor rate limits and usage**
3. **Implement caching for common responses**
4. **Set up monitoring and alerting**
5. **Use API keys with appropriate permissions**

Your setup is now fully dynamic - just change environment variables to switch models or configurations!
