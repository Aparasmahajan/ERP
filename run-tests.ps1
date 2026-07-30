# Local Testing Script
# Run this after: npm run dev

param(
    [switch]$Quick = $false
)

$email = $env:SUPERADMIN_EMAIL         # set in .env / .env.local
$password = $env:SUPERADMIN_PASSWORD   # set in .env / .env.local
$baseUrl = "http://localhost:3000"
$cookieFile = "cookies.txt"
$results = @()

function Test-Server {
    Write-Host "🔍 Checking if server is running..." -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest "$baseUrl/login" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Server is running" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "❌ Server not running at $baseUrl" -ForegroundColor Red
        Write-Host "   Run: npm run dev" -ForegroundColor Yellow
        return $false
    }
}

function Test-Login {
    Write-Host "`n📋 Test 1: Login with Valid Credentials" -ForegroundColor Cyan

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
            -Method POST `
            -Headers @{"Content-Type" = "application/json"} `
            -Body (ConvertTo-Json @{
                email = $email
                password = $password
            }) `
            -SessionVariable session

        if ($response.success -eq $true) {
            Write-Host "✅ Login successful" -ForegroundColor Green
            Write-Host "   Email: $($response.email)" -ForegroundColor Gray
            Write-Host "   Role: $($response.role)" -ForegroundColor Gray

            # Save cookies for next tests
            $session | Export-Clixml -Path "session.xml"
            return $true
        } else {
            Write-Host "❌ Login failed: $($response.error)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Login error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-Verify {
    Write-Host "`n🔐 Test 2: Verify Authentication" -ForegroundColor Cyan

    try {
        $session = Import-Clixml -Path "session.xml"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify" `
            -WebSession $session

        if ($response.authenticated -eq $true) {
            Write-Host "✅ Authentication verified" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Auth verification failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Verify error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-CreateTenant {
    Write-Host "`n🏢 Test 3: Create Tenant" -ForegroundColor Cyan

    try {
        $session = Import-Clixml -Path "session.xml"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/tenants/init" `
            -Method POST `
            -Headers @{"Content-Type" = "application/json"} `
            -Body (ConvertTo-Json @{
                tenantName = "Test Store $(Get-Random -Maximum 9999)"
                pack = "ORGANISATION"
                adminEmail = "admin@teststore.com"
                adminName = "Store Manager"
            }) `
            -WebSession $session

        if ($response.success -eq $true) {
            Write-Host "✅ Tenant created" -ForegroundColor Green
            Write-Host "   Tenant ID: $($response.tenantId)" -ForegroundColor Gray
            Write-Host "   Name: $($response.tenantName)" -ForegroundColor Gray

            # Save for next tests
            $response.tenantId | Out-File -FilePath "tenantid.txt"
            $session | Export-Clixml -Path "session.xml"
            return $true
        } else {
            Write-Host "❌ Tenant creation failed: $($response.error)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Tenant creation error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-ReadBranding {
    Write-Host "`n🎨 Test 4: Read Branding" -ForegroundColor Cyan

    try {
        $tenantId = Get-Content -Path "tenantid.txt"
        $session = Import-Clixml -Path "session.xml"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/branding?tenant_id=$tenantId" `
            -WebSession $session

        if ($response.data) {
            Write-Host "✅ Branding retrieved" -ForegroundColor Green
            Write-Host "   Primary Color: $($response.data.primary_color)" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ Branding retrieval failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Branding read error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-UpdateBranding {
    Write-Host "`n🎨 Test 5: Update Branding" -ForegroundColor Cyan

    try {
        $tenantId = Get-Content -Path "tenantid.txt"
        $session = Import-Clixml -Path "session.xml"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/branding" `
            -Method PUT `
            -Headers @{"Content-Type" = "application/json"} `
            -Body (ConvertTo-Json @{
                tenant_id = $tenantId
                branding = @{
                    primary_color = "#dc2626"
                    secondary_color = "#f59e0b"
                }
                actor_id = "test-user"
            }) `
            -WebSession $session

        if ($response.success -eq $true) {
            Write-Host "✅ Branding updated" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Branding update failed: $($response.error)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Branding update error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-ReadFeatures {
    Write-Host "`n⚙️  Test 6: Read Module Features" -ForegroundColor Cyan

    try {
        $tenantId = Get-Content -Path "tenantid.txt"
        $session = Import-Clixml -Path "session.xml"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/module-features?tenant_id=$tenantId" `
            -WebSession $session

        if ($response.data.Count -gt 0) {
            Write-Host "✅ Features retrieved" -ForegroundColor Green
            Write-Host "   Feature count: $($response.data.Count)" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ Features retrieval failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Features read error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-ReadPositions {
    Write-Host "`n📍 Test 7: Read Positions" -ForegroundColor Cyan

    try {
        $tenantId = Get-Content -Path "tenantid.txt"
        $session = Import-Clixml -Path "session.xml"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/positions?tenant_id=$tenantId" `
            -WebSession $session

        if ($response.data -and $response.data.Count -gt 0) {
            Write-Host "✅ Positions retrieved" -ForegroundColor Green
            Write-Host "   Position count: $($response.data.Count)" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ Positions retrieval failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Positions read error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-ReadOrgUnits {
    Write-Host "`n🏢 Test 8: Read Org Units" -ForegroundColor Cyan

    try {
        $tenantId = Get-Content -Path "tenantid.txt"
        $session = Import-Clixml -Path "session.xml"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/org-units?tenant_id=$tenantId" `
            -WebSession $session

        if ($response.data -and $response.data.Count -gt 0) {
            Write-Host "✅ Org units retrieved" -ForegroundColor Green
            Write-Host "   Org unit count: $($response.data.Count)" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "❌ Org units retrieval failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Org units read error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-ReadCapabilities {
    Write-Host "`n🔐 Test 9: Read Capabilities" -ForegroundColor Cyan

    try {
        $tenantId = Get-Content -Path "tenantid.txt"
        $session = Import-Clixml -Path "session.xml"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/capabilities?tenant_id=$tenantId" `
            -WebSession $session

        if ($response.data) {
            Write-Host "✅ Capabilities retrieved" -ForegroundColor Green
            Write-Host "   Capability count: $($response.data.Count)" -ForegroundColor Gray
            return $true
        } else {
            Write-Host "⚠️  No capabilities found (expected for new tenant)" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "❌ Capabilities read error: $_" -ForegroundColor Red
        return $false
    }
}

function Test-Logout {
    Write-Host "`n🚪 Test 10: Logout" -ForegroundColor Cyan

    try {
        $session = Import-Clixml -Path "session.xml"
        $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/logout" `
            -Method POST `
            -WebSession $session

        if ($response.success -eq $true) {
            Write-Host "✅ Logout successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Logout failed" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Logout error: $_" -ForegroundColor Red
        return $false
    }
}

# Main execution
Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   LOCAL TESTING SUITE - AUTOMATED         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check server
if (-not (Test-Server)) {
    exit 1
}

# Run tests
$tests = @(
    @{Name = "Login"; Func = ${function:Test-Login}},
    @{Name = "Verify"; Func = ${function:Test-Verify}},
    @{Name = "CreateTenant"; Func = ${function:Test-CreateTenant}},
    @{Name = "ReadBranding"; Func = ${function:Test-ReadBranding}},
    @{Name = "UpdateBranding"; Func = ${function:Test-UpdateBranding}},
    @{Name = "ReadFeatures"; Func = ${function:Test-ReadFeatures}},
    @{Name = "ReadPositions"; Func = ${function:Test-ReadPositions}},
    @{Name = "ReadOrgUnits"; Func = ${function:Test-ReadOrgUnits}},
    @{Name = "ReadCapabilities"; Func = ${function:Test-ReadCapabilities}},
    @{Name = "Logout"; Func = ${function:Test-Logout}}
)

$passed = 0
$failed = 0

foreach ($test in $tests) {
    if (& $test.Func) {
        $passed++
    } else {
        $failed++
    }
}

# Summary
Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          TEST SUMMARY                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

if ($failed -eq 0) {
    Write-Host "`n🎉 All tests passed! System ready for Week 2!" -ForegroundColor Green
    Write-Host "`n📚 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Review WEEK2_PLAN.md" -ForegroundColor Gray
    Write-Host "   2. Start building UI components" -ForegroundColor Gray
    Write-Host "   3. Build Role Assignment UI" -ForegroundColor Gray
} else {
    Write-Host "`n⚠️  Some tests failed. Check output above." -ForegroundColor Yellow
}

# Cleanup
Remove-Item -Path "session.xml" -ErrorAction SilentlyContinue
Remove-Item -Path "tenantid.txt" -ErrorAction SilentlyContinue
