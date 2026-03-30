# Test Registration and Login Flow

$BaseUrl = "http://localhost:5000/api/auth"
$Email = "testuser@test.com"
$Password = "SecurePass123!"

# Test 1: Register User
Write-Host "=== Test 1: Registering User ===" -ForegroundColor Cyan
$regBody = @{
    firstName = "Test"
    lastName = "User"
    email = $Email
    phone = "555-123-4567"
    password = $Password
    role = "Manager"
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri "$BaseUrl/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $regBody `
        -ErrorAction Stop
    Write-Host "Registration Successful (HTTP 201)" -ForegroundColor Green
    Write-Host ("User ID: " + $regResponse.id) -ForegroundColor Green
} catch {
    Write-Host "Registration Failed" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode
    exit 1
}

# Test 2: Login with Correct Password
Write-Host "`n=== Test 2: Login with Correct Password ===" -ForegroundColor Cyan
$loginBody = @{
    email = $Email
    password = $Password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop
    Write-Host "Login Successful (HTTP 200)" -ForegroundColor Green
    $token = $loginResponse.token
    $tokenPreview = $token.Substring(0, 20)
    Write-Host ("Token received: " + $tokenPreview + "...") -ForegroundColor Green
} catch {
    Write-Host "Login Failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Test 3: Login with Wrong Password
Write-Host "`n=== Test 3: Login with Wrong Password ===" -ForegroundColor Cyan
$wrongLoginBody = @{
    email = $Email
    password = "WrongPassword123!"
} | ConvertTo-Json

try {
    $wrongLoginResponse = Invoke-RestMethod -Uri "$BaseUrl/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $wrongLoginBody `
        -ErrorAction Stop
    Write-Host "Error: Should have failed but didn't!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Success: Correctly rejected (HTTP 401)" -ForegroundColor Green
        Write-Host "Error message: Invalid email or password" -ForegroundColor Green
    } else {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Error: Wrong error code: $statusCode" -ForegroundColor Red
    }
}
