# Script para organizar fotos de Selvaggio
# Uso: .\organizar-fotos.ps1

Write-Host "`n📸 ORGANIZADOR DE FOTOS - SELVAGGIO`n" -ForegroundColor Cyan

$publicPath = ".\public"
$fotos = Get-ChildItem -Path $publicPath -Filter "WhatsApp Image*.jpeg"

Write-Host "Fotos encontradas: $($fotos.Count)`n" -ForegroundColor Green

# Mostrar lista numerada
$index = 1
foreach ($foto in $fotos) {
    Write-Host "$index. $($foto.Name)"
    $index++
}

Write-Host "`n📁 CATEGORÍAS SUGERIDAS:" -ForegroundColor Yellow
Write-Host "  hero          - Foto principal/hero del sitio"
Write-Host "  galeria       - Galería general"
Write-Host "  productos     - Productos (quesos, fiambres, tablas)"
Write-Host "  ambiente      - Ambiente del local"
Write-Host "  vinos         - Vinos y botellas"
Write-Host "  eventos       - Eventos y gente"
Write-Host "  og-image      - Para Open Graph (1200x630)"
Write-Host "`n"

Write-Host "💡 INSTRUCCIONES:" -ForegroundColor Cyan
Write-Host "1. Abre las fotos en /public para verlas"
Write-Host "2. Anota qué número corresponde a qué categoría"
Write-Host "3. Ejecuta los comandos de renombrado"
Write-Host "`n"

Write-Host "🔧 COMANDOS DE EJEMPLO:" -ForegroundColor Magenta
Write-Host "Renombrar foto 1 como hero:"
Write-Host '  Rename-Item ".\public\WhatsApp Image 2025-12-05 at 14.33.46.jpeg" "selvaggio-hero-principal.jpeg"'
Write-Host "`nRenombrar foto 2 como producto:"
Write-Host '  Rename-Item ".\public\WhatsApp Image 2025-12-05 at 14.33.47.jpeg" "selvaggio-productos-tabla-quesos.jpeg"'
Write-Host "`n"

Write-Host "⚡ SUGERENCIA RÁPIDA:" -ForegroundColor Yellow
Write-Host "Si querés, mandame un mensaje diciendo qué es cada foto y yo te armo los comandos completos`n"
