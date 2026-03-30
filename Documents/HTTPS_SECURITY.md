# HTTPS & Security Configuration Guide

## Overview
The backend now supports both HTTP (development) and HTTPS (production) with comprehensive security features including:
- **Helmet.js**: Security headers protection
- **HSTS**: HTTP Strict Transport Security
- **CSP**: Content Security Policy
- **HTTPS Redirection**: Force HTTPS in production
- **Parameterized Queries**: SQL injection prevention
- **CORS**: Cross-Origin Resource Sharing restrictions
- **Request Logging**: All requests logged with trace IDs

## HTTPS Setup

### Development (HTTP - Default)
In development, the server runs on HTTP without certificates:
```bash
npm start
# Output: Backend API running on http://localhost:5000
```

### Production (HTTPS)
To enable HTTPS in production, you need SSL certificates and must set environment variables:

1. **Get SSL Certificates**
   - **Option A: Let's Encrypt (Recommended)**
     ```bash
     # Using Certbot (https://certbot.eff.org/)
     certbot certonly --standalone -d yourdomain.com
     
     # Certificates will be at:
     # /etc/letsencrypt/live/yourdomain.com/fullchain.pem (certificate)
     # /etc/letsencrypt/live/yourdomain.com/privkey.pem (private key)
     ```
   
   - **Option B: Self-Signed Certificate (Testing Only)**
     ```bash
     openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365
     ```

2. **Set Environment Variables in `.env`**
   ```env
   NODE_ENV=production
   HTTPS_CERT_PATH=/path/to/certificate.pem
   HTTPS_KEY_PATH=/path/to/private-key.pem
   PORT=5000
   ```

3. **Start the Server**
   ```bash
   npm start
   # Output: Secure Backend API running on https://localhost:5000
   ```

## Security Features Explained

### 1. Helmet.js Headers
Automatically sets these security headers:
- **X-Content-Type-Options: nosniff** - Prevents MIME-type sniffing attacks
- **X-Frame-Options: DENY** - Prevents clickjacking by blocking iframe embedding
- **X-XSS-Protection: 1; mode=block** - Legacy XSS protection
- **Strict-Transport-Security** - Forces HTTPS for 1 year (31536000 seconds)
- **Content-Security-Policy** - Restricts which origins can load content

### 2. CORS Protection
- Only allows requests from specified FRONTEND_URLS origins
- Restricts HTTP methods to: GET, POST, PUT, DELETE, OPTIONS
- Restricts headers to: Content-Type, Authorization
- Credentials must match origin

### 3. SQL Injection Prevention
- All database queries use parameterized queries with `$1, $2` placeholders
- User input is never directly interpolated into SQL

### 4. Request Logging & Auditing
- Every request logs: method, path, status code, duration, IP address, user-agent
- Sensitive fields (passwords, tokens) are redacted before logging
- Each request gets a unique trace ID for correlation with error logs
- Logs are persisted to database for auditing

### 5. HTTPS Redirection
- In production, all HTTP requests are automatically redirected to HTTPS
- Status code 301 (permanent redirect)
- Uses x-forwarded-proto header from reverse proxies

## Deployment Checklist

- [ ] Set `NODE_ENV=production` in environment
- [ ] Obtain and configure SSL certificates (HTTPS_CERT_PATH, HTTPS_KEY_PATH)
- [ ] Set FRONTEND_URLS to allowed origins only (no wildcards)
- [ ] Disable console logging in production (optional)
- [ ] Use a reverse proxy (Nginx, Apache) to handle HTTPS termination (optional but recommended)
- [ ] Set secure database credentials in env vars
- [ ] Enable request logging to database for auditing
- [ ] Configure backup and rotation for SSL certificates

## Reverse Proxy Setup (Optional but Recommended)

For production, consider using Nginx as a reverse proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Testing HTTPS Security

### Check Headers with curl
```bash
curl -I https://yourdomain.com/api/health
```

Look for these headers in response:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Content-Security-Policy`

### Check SSL Certificate
```bash
# View certificate info
openssl s_client -connect yourdomain.com:443

# Check expiration date
openssl x509 -in /path/to/cert.pem -noout -dates
```

## Troubleshooting

### "Error loading HTTPS certificates"
- Verify certificate and key file paths are correct
- Check file permissions (certificate files must be readable by Node process)
- Ensure NodeENV=production and HTTPS_CERT_PATH/HTTPS_KEY_PATH are set

### CORS errors
- Check FRONTEND_URLS includes the frontend origin
- Verify origin includes protocol (https:// or http://)
- Check for trailing slashes in origin URL

### Mixed Content Warning
- Ensure frontend is served over HTTPS when backend is HTTPS
- Update FRONTEND_URL to use https://

## Further Reading
- [OWASP Security Best Practices](https://owasp.org/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Let's Encrypt](https://letsencrypt.org/)
- [HTTP Strict Transport Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)