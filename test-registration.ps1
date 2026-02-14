PowerShell test script to validate registration endpoint

# Test data
$body = @{
    nom = "Clara"
    prenom = "Dupont"
    email = "clara.dupont@testmail.fr"
    motDePasse = "SecurePass2024!"
    telephone = "0612345678"
    organisation = "DarkTest Corp"
} | ConvertTo-Json

Write-Host "=== Testing Registration Endpoint ===" -ForegroundColor Cyan
Write-Host "URL: http://localhost:5000/api/auth/register" -ForegroundColor Yellow
Write-Host "Data:" -ForegroundColor Yellow
Write-Host $body

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "User created successfully!" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 3 | Write-Host
    
} catch {
    Write-Host "`n❌ ERROR!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "`nError Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message
    }
}
