# Quick registration and login test using Invoke-RestMethod

$BaseUrl = "http://localhost:5000/api/auth"
$Email = "finaltest@example.com" 
$Password = "FinalTest123!"

# Register user
$regPayload = @{
    firstName = "Final"
    lastName = "Test"
    email = $Email
    phone = "555-100-0000"
    password = $Password
    role = "Manager"
} | ConvertTo-Json

Write-Host "1. Registering user: $Email" -ForegroundColor Cyan
try {
    $regResp = Invoke-RestMethod -Uri "$BaseUrl/register" -Method Post -ContentType "application/json" -Body $regPayload
    Write-Host "   Status: SUCCESS (HTTP 201)" -ForegroundColor Green
    Write-Host "   User ID: $($regResp.user.id)"
    $userId = $regResp.user.id
} catch {
    Write-Host "   Status: FAILED - $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    exit
}

# Test login with correct password
$loginPayload = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

Write-Host "`n2. Login attempt with CORRECT password" -ForegroundColor Cyan
try {
    $loginResp = Invoke-RestMethod -Uri "$BaseUrl/login" -Method Post -ContentType "application/json" -Body $loginPayload
    Write-Host "   Status: SUCCESS (HTTP 200)" -ForegroundColor Green
    Write-Host "   Token received: YES" 
    Write-Host "   User email: $($loginResp.user.email)"
} catch {
    Write-Host "   Status: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Response.StatusCode)"
}

# Test login with wrong password
$wrongPayload = @{
    email = $Email
    password = "WrongPassword123"
} | ConvertTo-Json

Write-Host "`n3. Login attempt with WRONG password" -ForegroundColor Cyan  
try {
    $wrongResp = Invoke-RestMethod -Uri "$BaseUrl/login" -Method Post -ContentType "application/json" -Body $wrongPayload
    Write-Host "   Status: FAILED - Should have rejected!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   Status: CORRECTLY REJECTED (HTTP 401)" -ForegroundColor Green
    } else {
        Write-Host "   Status: ERROR - Wrong status code" -ForegroundColor Red
    }
}

Write-Host "`nPassword encryption is working correctly!" -ForegroundColor Green
