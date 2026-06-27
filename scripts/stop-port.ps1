param(
  [Parameter(Mandatory = $true, Position = 0)]
  [int]$Port
)

if ($Port -lt 1 -or $Port -gt 65535) {
  Write-Error "Port must be between 1 and 65535."
  exit 1
}

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
  Where-Object { $_.OwningProcess -gt 0 } |
  Select-Object -ExpandProperty OwningProcess -Unique

if (-not $connections) {
  Write-Host "No process is listening on port $Port."
  exit 0
}

foreach ($processId in $connections) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

  if (-not $process) {
    continue
  }

  Write-Host "Stopping PID $processId ($($process.ProcessName)) on port $Port..."
  Stop-Process -Id $processId -Force
}

Write-Host "Port $Port is free."
