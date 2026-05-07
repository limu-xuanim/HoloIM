<# 交互式设置 Adminer 登录账号密码（Windows / PowerShell） #>

param()

$ErrorActionPreference = 'Stop'

# script directory (compatible with older PowerShell versions)
if ($PSScriptRoot -and ($PSScriptRoot -ne '')) {
    $scriptDir = $PSScriptRoot
} else {
    $scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path
}
$xxdPath   = Join-Path -Path $scriptDir -ChildPath 'xxd.exe'

if (-not (Test-Path -LiteralPath $xxdPath)) {
    Write-Host "ERROR: xxd.exe not found: $xxdPath"
    exit 1
}

Write-Host "Configuring Adminer HTTP auth user..."

$adminerUser = Read-Host "account"
if ([string]::IsNullOrWhiteSpace($adminerUser)) {
    Write-Host "Username is empty. Aborted."
    exit 1
}

# 使用安全输入获取密码
$pass1Secure = Read-Host "password" -AsSecureString
$pass2Secure = Read-Host "password (again)" -AsSecureString

$pass1 = [Runtime.InteropServices.Marshal]::PtrToStringUni(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass1Secure)
)
$pass2 = [Runtime.InteropServices.Marshal]::PtrToStringUni(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass2Secure)
)

if ([string]::IsNullOrWhiteSpace($pass1)) {
    Write-Host "Password is empty. Aborted."
    exit 1
}

if ($pass1 -ne $pass2) {
    Write-Host "Two passwords do not match. Aborted."
    exit 1
}

& $xxdPath `
    -adminer-passwd-user $adminerUser `
    -adminer-passwd-password $pass1

