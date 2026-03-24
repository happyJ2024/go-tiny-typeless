[CmdletBinding()]
param(
    [ValidateSet("all", "windows", "mac")]
    [string]$Target = "all",

    [switch]$NoPackage,

    [switch]$SkipFrontend,

    [switch]$Clean,

    [switch]$UpdateWailsVersion,

    [switch]$VerboseBuild
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

function Remove-LegacyManualBuildArtifacts {
    $legacyWindowsDir = Join-Path $scriptDir "build\windows\amd64"

    if (Test-Path $legacyWindowsDir) {
        Write-Host "Found legacy manual-build output at build/windows/amd64. Removing it to avoid running the wrong executable." -ForegroundColor Yellow
        Remove-Item -Path $legacyWindowsDir -Recurse -Force
    }
}

function Invoke-WailsBuild {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Platform,

        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    $arguments = @("build", "-platform", $Platform)

    if ($NoPackage) {
        $arguments += "-nopackage"
    }

    if ($SkipFrontend) {
        $arguments += "-s"
    }

    if ($Clean) {
        $arguments += "-clean"
    }

    if ($UpdateWailsVersion) {
        $arguments += "-u"
    }

    if ($VerboseBuild) {
        $arguments += @("-v", "2")
    }

    Write-Host "" 
    Write-Host ("==> Building {0} ({1}) with wails build" -f $Label, $Platform) -ForegroundColor Cyan
    Write-Host (("wails {0}") -f ($arguments -join " ")) -ForegroundColor DarkGray

    & wails @arguments
    if ($LASTEXITCODE -ne 0) {
        throw ("Wails build failed for {0} ({1})" -f $Label, $Platform)
    }

    Write-Host ("OK: {0} build completed" -f $Label) -ForegroundColor Green
}

Write-Host "Tiny Typeless build script" -ForegroundColor Green
Write-Host ("Project directory: {0}" -f $scriptDir) -ForegroundColor DarkGray

if (-not (Get-Command wails -ErrorAction SilentlyContinue)) {
    throw "The 'wails' CLI was not found in PATH. Install it with: go install github.com/wailsapp/wails/v2/cmd/wails@v2.11.0"
}

Remove-LegacyManualBuildArtifacts

if ($Target -eq "windows" -or $Target -eq "all") {
    Invoke-WailsBuild -Platform "windows/amd64" -Label "Windows"
}

if ($Target -eq "mac" -or $Target -eq "all") {
    Write-Host "" 
    Write-Host "Note: macOS packaging usually needs to run on macOS or a configured cross-compilation environment." -ForegroundColor Yellow
    Invoke-WailsBuild -Platform "darwin/universal" -Label "macOS"
}

Write-Host "" 
Write-Host "Build finished." -ForegroundColor Green
Write-Host "Windows executable: build/bin/tiny-typeless.exe" -ForegroundColor DarkGray
Write-Host "Do not run old files from build/windows/amd64. That path was created by the previous manual go build workaround." -ForegroundColor DarkGray
Write-Host "Wails already adds the required production tags automatically when using wails build." -ForegroundColor DarkGray
