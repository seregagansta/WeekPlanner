param(
    [switch]$NoBrowser,
    [ValidateRange(1024, 65535)][int]$Port = 5173
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$appUrl = "http://127.0.0.1:$Port/"
$logDirectory = Join-Path $projectRoot 'work\launcher'
$mutex = New-Object System.Threading.Mutex($false, "Local\WeekPlannerLauncher-$Port")
$hasLock = $false
$startedProcess = $null

function Get-PlannerState {
    try {
        $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 2
        if ($response.Content -match '<title>\s*WeekPlanner\b') { return 'ready' }
        return 'occupied'
    } catch {
        if ($null -ne $_.Exception.Response) { return 'occupied' }
        return 'stopped'
    }
}

try {
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $hasLock = $mutex.WaitOne(20000)
    if (-not $hasLock) { throw 'Планировщик уже запускается. Подождите несколько секунд и попробуйте снова.' }

    $state = Get-PlannerState
    if ($state -eq 'occupied') { throw "Порт $Port занят другим приложением. WeekPlanner не будет закрывать его автоматически." }

    if ($state -ne 'ready') {
        $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
        $nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:ProgramFiles 'nodejs\node.exe' }
        if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Не найден Node.js. Установите Node.js LTS и повторите запуск.' }
        $vitePath = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
        if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Не найдены зависимости WeekPlanner. Папка node_modules должна оставаться внутри проекта.' }

        $stdout = Join-Path $logDirectory "server-$Port.log"
        $stderr = Join-Path $logDirectory "server-$Port.error.log"
        $nodeArguments = '"{0}" --host 127.0.0.1 --port {1} --strictPort' -f $vitePath, $Port
        $startedProcess = Start-Process -FilePath $nodePath -ArgumentList $nodeArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru

        $deadline = [DateTime]::UtcNow.AddSeconds(30)
        do {
            $state = Get-PlannerState
            if ($state -eq 'ready') { break }
            $startedProcess.Refresh()
            if ($startedProcess.HasExited) {
                $details = if (Test-Path -LiteralPath $stderr) { (Get-Content -LiteralPath $stderr -Tail 8) -join "`n" } else { '' }
                throw "Не удалось запустить сервер WeekPlanner. $details"
            }
            Start-Sleep -Milliseconds 250
        } while ([DateTime]::UtcNow -lt $deadline)

        if ($state -ne 'ready') {
            if (-not $startedProcess.HasExited) { $startedProcess.Kill() }
            throw 'Сервер не ответил за 30 секунд. Повторите запуск.'
        }
        [pscustomobject]@{ ProcessId = $startedProcess.Id; Port = $Port; Url = $appUrl; StartedAt = [DateTime]::UtcNow.ToString('o') } |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logDirectory "server-$Port.json") -Encoding UTF8
    }

    if (-not $NoBrowser) {
        # Opening the URL is intentional: the user launches the app to use it.
        Start-Process -FilePath $appUrl
    }
    Write-Output "WeekPlanner ready: $appUrl"
} catch {
    $message = $_.Exception.Message
    try { "$(Get-Date -Format o) $message" | Add-Content -LiteralPath (Join-Path $logDirectory 'launcher.error.log') -Encoding UTF8 } catch { }
    if (-not $NoBrowser) {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($message, 'WeekPlanner', 'OK', 'Error') | Out-Null
    }
    Write-Error -Message $message -ErrorAction Continue
    exit 1
} finally {
    if ($hasLock) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
