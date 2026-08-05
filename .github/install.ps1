#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

$PiPackage = "@earendil-works/pi-coding-agent"
$ConfigRepository = "https://github.com/ovftank/pi-config.git"
$AgentPath = Join-Path $env:USERPROFILE ".pi\agent"
$PiEsc = [char]27
$script:PiVirtualTerminalEnabled = $null
$script:PiStep = 0

function Test-InstallerInteractiveOutput {
  return (-not [Console]::IsOutputRedirected) -and ($env:TERM -ne "dumb")
}

function Enable-VirtualTerminalOutput {
  if (-not (Test-InstallerInteractiveOutput)) {
    return $false
  }

  if ($null -ne $script:PiVirtualTerminalEnabled) {
    return $script:PiVirtualTerminalEnabled
  }

  if (-not ("PiInstaller.ConsoleMethods" -as [Type])) {
    Add-Type -Namespace PiInstaller -Name ConsoleMethods -MemberDefinition @"
[DllImport("kernel32.dll", SetLastError = true)]
public static extern System.IntPtr GetStdHandle(int nStdHandle);

[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool GetConsoleMode(System.IntPtr hConsoleHandle, out uint lpMode);

[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool SetConsoleMode(System.IntPtr hConsoleHandle, uint dwMode);
"@
  }

  $stdOutputHandle = -11
  $enableVirtualTerminalProcessing = 0x0004
  $handle = [PiInstaller.ConsoleMethods]::GetStdHandle($stdOutputHandle)
  $mode = [uint32]0
  $script:PiVirtualTerminalEnabled = [PiInstaller.ConsoleMethods]::GetConsoleMode($handle, [ref]$mode) -and [PiInstaller.ConsoleMethods]::SetConsoleMode($handle, ($mode -bor $enableVirtualTerminalProcessing))
  return $script:PiVirtualTerminalEnabled
}

function Test-InstallerAnsiOutput {
  return Enable-VirtualTerminalOutput
}

function Test-TerminalSupportsUnicode {
  $locale = "$env:LC_ALL$env:LC_CTYPE$env:LANG"
  if ($locale -match "(?i)utf-?8") {
    return $true
  }

  if ($env:TERM_PROGRAM -in @("vscode", "WezTerm", "Windows_Terminal")) {
    return $true
  }

  if ($env:WT_SESSION -or $env:TERMINAL_EMULATOR) {
    return $true
  }

  return $false
}

function Write-InstallerTitle {
  $reset = "${PiEsc}[0m"
  $dim = "${PiEsc}[2m"
  $purple = "${PiEsc}[38;2;189;147;249m"

  if (Test-InstallerAnsiOutput) {
    [Console]::Write("`n${purple}  Pi OpenCode Style${reset}`n${dim}  latest npm release - clean global config - truecolor shell${reset}`n`n")
  } else {
    Write-Host ""
    Write-Host "  Pi OpenCode Style"
    Write-Host "  latest npm release - clean global config - truecolor shell"
    Write-Host ""
  }
}

function Write-PiAsciiLogo {
  $block = if (Test-TerminalSupportsUnicode) { [string][char]0x2588 } else { "#" }
  $wide = ($block * 6) -join ""
  $double = ($block * 2) -join ""
  $logo = @(
    "  $wide  $double",
    "  $double  $double  $double",
    "  $wide  $double",
    "  $double      $double",
    "  $double      $double",
    "  $double      $double"
  )

  if (Test-InstallerAnsiOutput) {
    $reset = "${PiEsc}[0m"
    $colors = @(
      "${PiEsc}[38;2;189;147;249m",
      "${PiEsc}[38;2;139;233;253m",
      "${PiEsc}[38;2;80;250;123m"
    )

    $index = 0
    foreach ($line in $logo) {
      $color = $colors[$index % $colors.Count]
      [Console]::Write("$color$line$reset`n")
      $index += 1
    }
    [Console]::Write("`n")
  } else {
    foreach ($line in $logo) {
      Write-Host $line -ForegroundColor Cyan
    }
    Write-Host ""
  }
}

function Test-InCells {
  param([int]$Y, [int]$X, [string]$Cells)
  foreach ($item in ($Cells -split " ")) { if ($item -eq "$Y,$X") { return $true } }
  return $false
}

function Test-InPiece {
  param([int]$Y, [int]$X, [int]$PieceY, [int]$PieceX, [string]$Cells)
  foreach ($item in ($Cells -split " ")) {
    $parts = $item -split ","
    if (($Y -eq ($PieceY + [int]$parts[0])) -and ($X -eq ($PieceX + [int]$parts[1]))) { return $true }
  }
  return $false
}

function Get-LogoCellColor {
  param([int]$Phase, [string]$Active, [int]$ActiveX, [int]$ActiveY, [int]$Flash, [int]$White, [int]$Y, [int]$X)
  if ($White -eq 1) {
    if (Test-InCells $Y $X "3,2 3,3 3,4 4,2 4,4 5,2 5,3 5,5 6,2 6,5") { return "white" }
    return "panel"
  }
  if (($Flash -eq 1) -and ($Y -eq 6) -and ($X -ge 1) -and ($X -le 6)) { return "flash" }
  if (($Active -eq "left") -and (Test-InPiece $Y $X $ActiveY $ActiveX "0,0 1,0 1,1 2,0")) { return "red" }
  if (($Active -eq "top") -and (Test-InPiece $Y $X $ActiveY $ActiveX "0,0 0,1 0,2 1,2")) { return "cyan" }
  if (($Active -eq "right") -and (Test-InPiece $Y $X $ActiveY $ActiveX "0,0 1,0 2,0 2,1")) { return "green" }
  if ($Phase -eq 4) {
    if (Test-InCells $Y $X "2,2 2,3 2,4 3,4") { return "cyan" }
    if (Test-InCells $Y $X "3,2 4,2 4,3 5,2") { return "red" }
    if (Test-InCells $Y $X "4,5 5,5") { return "green" }
    return "panel"
  }
  if ($Phase -ge 5) {
    if (Test-InCells $Y $X "3,2 3,3 3,4 4,4") { return "cyan" }
    if (Test-InCells $Y $X "4,2 5,2 5,3 6,2") { return "red" }
    if (Test-InCells $Y $X "5,5 6,5") { return "green" }
    return "panel"
  }
  if (($Phase -le 3) -and (Test-InCells $Y $X "6,1 6,2 6,3 6,4")) { return "orange" }
  if (($Phase -ge 2) -and (Test-InCells $Y $X "2,2 2,3 2,4 3,4")) { return "cyan" }
  if (($Phase -ge 1) -and (Test-InCells $Y $X "3,2 4,2 4,3 5,2")) { return "red" }
  if (($Phase -ge 3) -and (Test-InCells $Y $X "4,5 5,5 6,5 6,6")) { return "green" }
  return "panel"
}

function Write-LogoFrame {
  param([string]$Clear, [string]$Reset, [int]$Phase, [string]$Active, [int]$ActiveX, [int]$ActiveY, [int]$Flash, [int]$White)
  $blockCell = ([string][char]0x2588) * 2
  $cells = @{ panel = "$Reset  "; cyan = "${PiEsc}[36m$blockCell"; red = "${PiEsc}[31m$blockCell"; green = "${PiEsc}[32m$blockCell"; orange = "${PiEsc}[33m$blockCell"; white = "${PiEsc}[39m$blockCell"; flash = "${PiEsc}[33m$blockCell" }
  $frame = $Clear
  foreach ($y in 0..8) { foreach ($x in 1..8) { $frame += $cells[(Get-LogoCellColor $Phase $Active $ActiveX $ActiveY $Flash $White $y $x)] }; $frame += "$Reset`n" }
  [Console]::Write($frame)
}

function Show-PiLogoAnimation {
  if (-not (Test-InstallerAnsiOutput)) { Write-PiAsciiLogo; return }
  $esc = "${PiEsc}["; $reset = "${PiEsc}[0m"; $clear = "${esc}H"
  [Console]::Write("${esc}?25l${esc}2J${esc}H")
  foreach ($y in 0..3) { Write-LogoFrame $clear $reset 0 "left" 2 $y 0 0; Start-Sleep -Milliseconds 75 }
  foreach ($y in 0..2) { Write-LogoFrame $clear $reset 1 "top" 2 $y 0 0; Start-Sleep -Milliseconds 75 }
  foreach ($y in 0..4) { Write-LogoFrame $clear $reset 2 "right" 5 $y 0 0; Start-Sleep -Milliseconds 75 }
  Write-LogoFrame $clear $reset 3 "none" 0 0 0 0; Start-Sleep -Milliseconds 250
  Write-LogoFrame $clear $reset 3 "none" 0 0 1 0; Start-Sleep -Milliseconds 80
  Write-LogoFrame $clear $reset 3 "none" 0 0 0 0; Start-Sleep -Milliseconds 80
  Write-LogoFrame $clear $reset 3 "none" 0 0 1 0; Start-Sleep -Milliseconds 80
  Write-LogoFrame $clear $reset 4 "none" 0 0 0 0; Start-Sleep -Milliseconds 100
  Write-LogoFrame $clear $reset 5 "none" 0 0 0 0; Start-Sleep -Milliseconds 450
  Write-LogoFrame $clear $reset 5 "none" 0 0 0 1; Start-Sleep -Milliseconds 120
  Write-LogoFrame $clear $reset 5 "none" 0 0 0 0; Start-Sleep -Milliseconds 120
  Write-LogoFrame $clear $reset 5 "none" 0 0 0 1; Start-Sleep -Milliseconds 450
  [Console]::Write("$reset${esc}?25h`n")
}

function Get-SpinnerFrame {
  param([int]$Step)

  switch ($Step % 4) {
    0 { return "-" }
    1 { return "\\" }
    2 { return "|" }
    default { return "/" }
  }
}

function Write-Step {
  param([string]$Message)

  $frame = Get-SpinnerFrame $script:PiStep
  $script:PiStep += 1

  if (Test-InstallerAnsiOutput) {
    $reset = "${PiEsc}[0m"
    $cyan = "${PiEsc}[38;2;139;233;253m"
    $bold = "${PiEsc}[1m"
    [Console]::Write("`n${cyan}  $frame${reset} ${bold}$Message${reset}`n")
  } else {
    Write-Host "`n  [$frame] $Message" -ForegroundColor Cyan
  }
}

function Set-PiTrueColor {
  $script:PiColorScope = "Machine + User"

  try {
    [System.Environment]::SetEnvironmentVariable(
      "COLORTERM",
      "truecolor",
      [System.EnvironmentVariableTarget]::Machine
    )
  } catch {
    $script:PiColorScope = "User"
  }

  [System.Environment]::SetEnvironmentVariable(
    "COLORTERM",
    "truecolor",
    [System.EnvironmentVariableTarget]::User
  )
  $env:COLORTERM = "truecolor"
}

function Invoke-ExternalCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,

    [Parameter(Mandatory = $false)]
    [string[]]$Arguments = @()
  )

  & $Command @Arguments
  $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
  if ($exitCode -ne 0) {
    throw "Command failed with exit code $exitCode`: $Command $($Arguments -join ' ')"
  }
}

function Get-WindowsArch {
  if ([Environment]::Is64BitOperatingSystem) { return "x64" }
  throw "Automatic dependency installation requires 64-bit Windows."
}

function Invoke-DownloadFile {
  param([string]$Url, [string]$OutFile)
  Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
}

function Refresh-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

function Install-NodeStandalone {
  $baseDir = Join-Path $env:LOCALAPPDATA "pi-node"
  $tmpDir = Join-Path ([IO.Path]::GetTempPath()) "pi-node-$PID"
  New-Item -ItemType Directory -Force -Path $tmpDir, $baseDir | Out-Null
  try {
    $checksums = Join-Path $tmpDir "SHASUMS256.txt"
    Invoke-DownloadFile "https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt" $checksums
    $nodeFile = Get-Content $checksums | ForEach-Object { if ($_ -match "\\s+(node-v.+-win-x64\\.zip)$") { $Matches[1] } } | Select-Object -First 1
    if (-not $nodeFile) { throw "Could not resolve the Node.js Windows x64 archive." }
    $zip = Join-Path $tmpDir $nodeFile
    Write-Host "  Downloading Node.js $($nodeFile -replace '\\.zip$','')"
    Invoke-DownloadFile "https://nodejs.org/dist/latest-v22.x/$nodeFile" $zip
    $line = Get-Content $checksums | Where-Object { $_ -match "^([a-fA-F0-9]+)\\s+$([regex]::Escape($nodeFile))$" } | Select-Object -First 1
    $expected = ([regex]::Match($line, "^([a-fA-F0-9]+)")).Groups[1].Value
    $actual = (Get-FileHash $zip -Algorithm SHA256).Hash
    if ($actual -ine $expected) { throw "Node.js download checksum verification failed." }
    Expand-Archive $zip $tmpDir -Force
    $current = Join-Path $baseDir "current"
    Remove-Item $current -Recurse -Force -ErrorAction SilentlyContinue
    Move-Item (Join-Path $tmpDir ($nodeFile -replace '\\.zip$','')) $current -Force
    [Environment]::SetEnvironmentVariable("Path", "$current;" + [Environment]::GetEnvironmentVariable("Path", "User"), "User")
    $env:Path = "$current;$env:Path"
  } finally { Remove-Item $tmpDir -Recurse -Force -ErrorAction SilentlyContinue }
}

function Install-GitAutomatically {
  if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    throw "Git is missing and winget.exe is unavailable. Install Git for Windows, then rerun this installer."
  }
  Write-Host "  Installing Git for Windows with winget..."
  & winget.exe install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw "Git for Windows installation failed with exit code $LASTEXITCODE." }
  Refresh-ProcessPath
}

function Invoke-PreflightChecks {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Install-GitAutomatically }
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  $nodeOk = $false
  if ($nodeCommand) {
    try { $nodeOk = ([version]((& node --version).TrimStart("v"))) -ge [version]"22.19.0" } catch { $nodeOk = $false }
  }
  if (-not $nodeOk -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "  Node.js 22.19.0+ and npm are required; installing standalone Node.js..."
    Install-NodeStandalone
  }
  Refresh-ProcessPath
  $errors = @()
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { $errors += "Git is still unavailable after installation." }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $errors += "Node.js is still unavailable after installation." }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { $errors += "npm is still unavailable after installation." }
  if ($errors.Count -gt 0) { throw ($errors -join [Environment]::NewLine) }
}

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command not found: $Name" }
}

try {
  Set-PiTrueColor
  Show-PiLogoAnimation
  Write-InstallerTitle
  Invoke-PreflightChecks
  Write-Host "  This will remove the current Pi package and install the latest npm release." -ForegroundColor Yellow
  Write-Host "  COLORTERM scope: $script:PiColorScope" -ForegroundColor DarkGray

  Require-Command "git"
  Require-Command "npm"
  Require-Command "node"

  Write-Step "Removing the current global Pi package"
  Invoke-ExternalCommand "npm" @("uninstall", "-g", $PiPackage)

  Write-Step "Installing the latest global Pi package"
  Invoke-ExternalCommand "npm" @("install", "-g", "${PiPackage}@latest")

  Write-Step "Cloning pi-config into $AgentPath"
  if (Test-Path -LiteralPath $AgentPath) {
    Remove-Item -LiteralPath $AgentPath -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $AgentPath) | Out-Null
  Invoke-ExternalCommand "git" @("clone", "--branch", "main", "--single-branch", $ConfigRepository, $AgentPath)

  Write-Step "Verifying the installation"
  Invoke-ExternalCommand "pi" @("--help")

  $reset = "${PiEsc}[0m"
  $green = "${PiEsc}[38;2;80;250;123m"
  if (Test-InstallerAnsiOutput) {
    [Console]::Write("`n${green}  Installation complete.${reset}`n")
  } else {
    Write-Host "`n  Installation complete." -ForegroundColor Green
  }
  Write-Host "  Configuration: $AgentPath" -ForegroundColor Green
  Write-Host "  COLORTERM: $env:COLORTERM" -ForegroundColor Green
} catch {
  Write-Error "Installation failed: $($_.Exception.Message)"
  exit 1
}
