# Script para generar favicon.ico desde favicon.svg
# Requiere tener instalado ImageMagick o usar un servicio online

Write-Host "📸 Para generar el favicon.ico:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opción 1 - Online (Recomendado):" -ForegroundColor Yellow
Write-Host "  1. Ve a https://convertio.co/es/svg-ico/" -ForegroundColor White
Write-Host "  2. Sube el archivo public/favicon.svg" -ForegroundColor White
Write-Host "  3. Descarga el favicon.ico generado" -ForegroundColor White
Write-Host "  4. Ponelo en public/favicon.ico" -ForegroundColor White
Write-Host ""
Write-Host "Opción 2 - Con ImageMagick:" -ForegroundColor Yellow
Write-Host "  magick convert favicon.svg -define icon:auto-resize=64,48,32,16 favicon.ico" -ForegroundColor White
Write-Host ""
Write-Host "Por ahora, el favicon.svg ya funciona en navegadores modernos!" -ForegroundColor Green
