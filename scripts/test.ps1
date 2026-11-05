Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Running Relay Test Suites               " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Running Core API Backend Tests..." -ForegroundColor Yellow
python -m pytest services/core-api -v

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nBackend tests failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`n[2/2] Running Web Frontend Typecheck & Build..." -ForegroundColor Yellow
npm run build --prefix apps/web

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nFrontend build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`nAll Relay tests and builds passed successfully!" -ForegroundColor Green
