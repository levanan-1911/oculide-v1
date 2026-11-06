# ==============================================================================
# scripts/init_db.ps1
# Script khoi tao CSDL ExamSystem (21 bang ERD v2) cho Oculide
# ==============================================================================

param(
    [string]$Server = ".",
    [string]$User = "sa",
    [string]$Password = "YourStrong@Passw0rd",
    [switch]$Docker,
    [switch]$Local
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  OCULIDE v2 - KHOI TAO CO SO DU LIEU EXAMSYSTEM            " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Kiem tra SQL Server tren Windows
$localSqlServer = Get-Service -Name "MSSQLSERVER" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }

if ($Local -or ($localSqlServer -and -not $Docker)) {
    Write-Host "[*] Phat hien SQL Server Windows (MSSQLSERVER) dang chay." -ForegroundColor Green
    Write-Host "[*] Dang thuc thi database/schema.sql vao SQL Server Windows..." -ForegroundColor Yellow
    
    sqlcmd -S "." -E -C -i database/schema.sql
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[THANH CONG] Da xa CSDL ExamSystem (21 bang) vao SQL Server Windows!" -ForegroundColor Green
        Write-Host "[*] Mo SSMS, chuot phai vao Tables va bam F5 de xem ket qua." -ForegroundColor Cyan
    } else {
        Write-Host "`n[LOI] Thuc thi that bai tren SQL Server Windows." -ForegroundColor Red
    }
}

# 2. Kiem tra Docker container exam-sqlserver
$dockerRunning = $false
try {
    $c = docker inspect -f '{{.State.Running}}' exam-sqlserver 2>$null
    if ($c -eq "true") { $dockerRunning = $true }
} catch {}

if ($dockerRunning -or $Docker) {
    Write-Host "`n[*] Phat hien Docker container 'exam-sqlserver' dang chay." -ForegroundColor Green
    Write-Host "[*] Dang xa database/schema.sql vao Docker container..." -ForegroundColor Yellow
    
    docker exec -i exam-sqlserver /opt/mssql-tools18/bin/sqlcmd `
        -S localhost -U sa -P "YourStrong@Passw0rd" -No -i /schema.sql
        
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[THANH CONG] Da xa CSDL vao Docker container exam-sqlserver!" -ForegroundColor Green
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
