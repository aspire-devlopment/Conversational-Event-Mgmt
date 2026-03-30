# JWT Authentication Implementation

## Overview
This application uses **JWT (JSON Web Tokens)** for secure authentication. JWTs are digitally signed tokens that cannot be forged or modified without the secret key.

## JWT Configuration

### Environment Variables
```env
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
JWT_EXPIRATION=7d
```

**Important:** Change `JWT_SECRET` in production to a strong, random 32+ character string.

## How It Works

### 1. **Token Generation** (Login/Register)
- User provides credentials
- Backend validates and creates a JWT token
- Token contains: `id`, `email`, `firstName`, `lastName`, `role`
- Token is signed with `JWT_SECRET` using HS256 algorithm
- Token expires after `JWT_EXPIRATION` time

### 2. **Token Transmission**
- Client stores token in localStorage
- Client sends token in `Authorization` header: `Bearer <token>`
- Header format must be exact: `Authorization: Bearer eyJhbGciOiJIUzI1NiIs...`

### 3. **Token Verification** (Protected Routes)
- Middleware `verifyJWTToken` extracts and validates token
- Signature is verified using `JWT_SECRET`
- Expiration is checked
- User info is attached to `req.user`
- Invalid/expired tokens are rejected with 401 Unauthorized

## API Endpoints

### Public Endpoints (No Auth Required)
```
POST /api/auth/login
POST /api/auth/register
```

### Protected Endpoints (JWT Required)
```
GET /api/auth/me          - Get current user profile
POST /api/auth/logout     - Logout (invalidate token)
```

## JWT Token Structure

A JWT has three parts separated by dots:
```
header.payload.signature
```

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "Manager",
  "iat": 1711600000,
  "exp": 1712204800
}
```

- `iat`: Issued at (Unix timestamp)
- `exp`: Expiration time (Unix timestamp)

### Signature
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

## Usage Examples

### Frontend (Login & Store Token)
```javascript
const response = await authAPI.login(email, password);
localStorage.setItem('authToken', response.data.token);
```

### Frontend (Send Token in Requests)
```javascript
const token = localStorage.getItem('authToken');
const config = {
  headers: {
    'Authorization': `Bearer ${token}`
  }
};
fetch('/api/auth/me', config);
```

### Backend (Access User Info)
```javascript
app.get('/api/auth/me', verifyJWTToken, (req, res) => {
  console.log(req.user); // { id: 1, email: '...', role: '...', ... }
});
```

## Token Expiration & Refresh

### Current Setup
- Tokens expire after **7 days** (configurable via `JWT_EXPIRATION`)
- Expired tokens are rejected with `Token has expired` error
- User must login again to get a new token

### Future Enhancement (Refresh Token)
For better security, implement a refresh token mechanism:
1. Issue short-lived access token (15 min)
2. Issue long-lived refresh token (7 days)
3. Use refresh token to get new access token
4. Blacklist revoked tokens

## Security Best Practices

### ✅ Implemented
- HS256 algorithm (HMAC with SHA-256)
- Signature verification required
- Token expiration enforcement
- Role-based authorization support

### ⚠️ To Implement (Production)
1. **Stronger Secret**: Use 32+ character random string
2. **HTTPS Only**: Always use HTTPS in production
3. **Secure Storage**: Store tokens in HttpOnly cookies (not localStorage)
4. **Token Blacklist**: Maintain blacklist for revoked tokens
5. **Password Hashing**: Hash passwords with bcrypt before storing
6. **Refresh Tokens**: Implement refresh token mechanism
7. **Rate Limiting**: Limit login attempts
8. **CORS**: Properly configure CORS origins

## Troubleshooting

### "Authorization header is missing"
- Token not sent in `Authorization` header
- Solution: Include `Authorization: Bearer <token>`

### "Invalid token signature"
- Token was tampered with or signed with different secret
- Solution: Verify token format and JWT_SECRET

### "Token has expired"
- Token's expiration time has passed
- Solution: User needs to login again to get new token

### "Invalid authorization header format"
- Wrong format like `Bearer token` (missing prefix) or `Bearer token1 token2`
- Solution: Use exact format: `Bearer <token>`

## Dependencies
- `jsonwebtoken`: ^9.1.2 - For JWT generation and verification

## File Structure
```
backend/
├── utils/
│   └── jwtToken.js           # JWT token service
├── middleware/
│   └── authMiddleware.js      # JWT verification middleware
├── routes/
│   └── authRoutes.js          # Auth endpoints
├── services/
│   └── authService.js         # Auth business logic
├── controllers/
│   └── authController.js      # Auth request handlers
└── .env                       # JWT configuration
```
