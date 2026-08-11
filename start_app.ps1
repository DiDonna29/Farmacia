param (
    [string]$BackendIP = "",
    [string]$BackendPort = "",
    [string]$FrontendHost = "",
    [string]$FrontendPort = "",
    [switch]$ForceInstall = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "      Iniciando Sistema Farmacia-DEM     " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = $PSScriptRoot
$backendDir = Join-Path $baseDir "backend"
$frontendDir = Join-Path $baseDir "frontend"
$venvDir = Join-Path $baseDir ".venv"

# Intentar leer de frontend/.env si no se pasaron por parámetro
$envFilePath = Join-Path $frontendDir ".env"
if (Test-Path $envFilePath) {
    $envContent = Get-Content $envFilePath
    foreach ($line in $envContent) {
        if ($line -match "^API_URL_DEV\s*=\s*https?://([^/:]+):?(\d*)/api") {
            if (-not $BackendIP) { $BackendIP = $Matches[1].Trim() }
            if (-not $BackendPort) { 
                $BackendPort = $Matches[2].Trim()
                if (-not $BackendPort) { $BackendPort = "80" }
            }
        }
        if ($line -match "^FRONTEND_HOST\s*=\s*(.+)") {
            if (-not $FrontendHost) { $FrontendHost = $Matches[1].Trim() }
        }
        if ($line -match "^FRONTEND_PORT\s*=\s*(.+)") {
            if (-not $FrontendPort) { $FrontendPort = $Matches[1].Trim() }
        }
    }
}

# Valores por defecto de respaldo
if (-not $BackendIP) { $BackendIP = "172.26.98.30" }
if (-not $BackendPort) { $BackendPort = "8005" }
if (-not $FrontendHost) { $FrontendHost = "172.26.98.30" }
if (-not $FrontendPort) { $FrontendPort = "1005" }

# 1. Configurar Entorno Virtual (Backend)
if (-not (Test-Path $venvDir) -or $ForceInstall) {
    Write-Host "=> Creando Entorno Virtual (.venv) desde cero..." -ForegroundColor Yellow
    if (Test-Path $venvDir) { Remove-Item -Recurse -Force $venvDir }
    python -m venv $venvDir
}

# Siempre activar y asegurar dependencias
$venvPython = Join-Path $venvDir "Scripts\python.exe"
Write-Host "=> Verificando e instalando dependencias de Django..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip -q
& $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt") -q
Write-Host "=> Dependencias Backend listas." -ForegroundColor Green

# 2. Configurar Base de Datos y Crear Administrador Inicial
Write-Host "=> Ejecutando migraciones y configurando base de datos..." -ForegroundColor Yellow
Set-Location $backendDir
& $venvPython scripts/run_migrations.py
Write-Host "=> Asegurando existencia del usuario administrador (12.345.678)..." -ForegroundColor Yellow
& $venvPython scripts/create_admin.py
Set-Location $baseDir

# 3. Configurar Node Modules (Frontend)
$nodeModulesDir = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModulesDir) -or $ForceInstall) {
    Write-Host "=> Instalando dependencias de Angular (node_modules)..." -ForegroundColor Yellow
    Set-Location $frontendDir
    npm install
    Set-Location $baseDir
    Write-Host "=> Dependencias Frontend listas." -ForegroundColor Green
} else {
    Write-Host "=> node_modules detectado. Saltando instalacion profunda." -ForegroundColor Green
}

# 4. Configurar IPs Dinamicamente en Angular
Write-Host "=> Actualizando URLs de conexion al Backend en Angular..." -ForegroundColor Yellow
Set-Location $frontendDir
node scripts/set-env.js --mode development --dev-url "http://$BackendIP`:$BackendPort/api"
Set-Location $baseDir

# 5. Lanzar Servidores en ventanas independientes

# Comando para Backend
$cmdBackend = "cd `"$backendDir`"; . `"$venvDir\Scripts\Activate.ps1`"; Write-Host 'Iniciando Backend Django...' -ForegroundColor Cyan; python manage.py runserver $BackendIP`:$BackendPort"

# Comando para Frontend
$cmdFrontend = "cd `"$frontendDir`"; Write-Host 'Iniciando Frontend Angular...' -ForegroundColor Cyan; npm run start -- --host $FrontendHost --port $FrontendPort"

Write-Host "=> Levantando Servidor Backend (${BackendIP}:${BackendPort})..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit -Command `"$cmdBackend`""

Write-Host "=> Levantando Servidor Frontend (${FrontendHost}:${FrontendPort})..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit -Command `"$cmdFrontend`""

Write-Host ""
Write-Host "¡Todo listo! Las terminales se abrieron en ventanas separadas." -ForegroundColor Green
Write-Host "Para forzar una reinstalacion limpia total usa: .\start_app.ps1 -ForceInstall" -ForegroundColor Yellow
