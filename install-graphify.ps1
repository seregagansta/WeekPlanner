param([switch]$VerifyOnly)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$logPath = Join-Path $env:TEMP 'WeekPlanner-Graphify-install.log'
$codexRoot = Join-Path $env:USERPROFILE '.codex'
$toolRoot = Join-Path $codexRoot 'tools\graphify'
$toolPython = Join-Path $toolRoot 'Scripts\python.exe'
$skillPath = Join-Path $codexRoot 'skills\graphify\SKILL.md'

function Show-Result([string]$message, [string]$icon = 'Information') {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($message, 'Graphify for Codex', 'OK', $icon) | Out-Null
}

function Find-Python {
    $candidates = @(
        (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'),
        (Join-Path $env:ProgramFiles 'Python312\python.exe')
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    $command = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($command -and $command.Source -notlike '*WindowsApps*') { return $command.Source }
    throw 'Python 3.10 or newer was not found. Update Codex or install Python, then retry.'
}

if ($VerifyOnly) {
    [void][scriptblock]::Create((Get-Content -LiteralPath $PSCommandPath -Raw))
    Write-Output 'Installer syntax is valid.'
    exit 0
}

try {
    "$(Get-Date -Format o) Starting Graphify installation" | Set-Content -LiteralPath $logPath -Encoding UTF8
    $basePython = Find-Python
    New-Item -ItemType Directory -Path (Split-Path -Parent $toolRoot) -Force | Out-Null
    if (-not (Test-Path -LiteralPath $toolPython)) {
        & $basePython -m venv $toolRoot *>> $logPath
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the Graphify environment.' }
    }
    & $toolPython -m pip install --disable-pip-version-check --upgrade 'graphifyy[sql]==0.9.67' *>> $logPath
    if ($LASTEXITCODE -ne 0) { throw 'Could not download Graphify.' }
    & $toolPython -m graphify install --platform codex *>> $logPath
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $skillPath)) {
        throw 'Could not register the Graphify skill in Codex.'
    }

    $scriptsPath = Split-Path -Parent $toolPython
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $entries = @($userPath -split ';' | Where-Object { $_ })
    if ($entries -notcontains $scriptsPath) {
        [Environment]::SetEnvironmentVariable('Path', (($entries + $scriptsPath) -join ';'), 'User')
    }

    "$(Get-Date -Format o) Installed Graphify; skill=$skillPath" | Add-Content -LiteralPath $logPath -Encoding UTF8
    Show-Result "Graphify is installed for every Codex project.`n`nRestart Codex once so the new skill appears in the skill list."
} catch {
    "$(Get-Date -Format o) ERROR: $($_.Exception.Message)" | Add-Content -LiteralPath $logPath -Encoding UTF8
    Show-Result "Installation did not finish: $($_.Exception.Message)`n`nLog: $logPath" 'Error'
    exit 1
}
