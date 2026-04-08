# GitHub 푸시 + Vercel 안내 (본인 PC PowerShell에서 실행)
# 예: .\scripts\2-push-and-vercel.ps1 -GitHubRepoUrl "https://github.com/아이디/저장소.git"

param(
  [string] $GitHubRepoUrl = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root

function Find-Git {
  $cmd = Get-Command git -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($p in @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe"
  )) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

$gitExe = Find-Git
if (-not $gitExe) {
  Write-Host "Git 이 없습니다. https://git-scm.com/download/win 설치 후 터미널을 다시 여세요." -ForegroundColor Red
  exit 1
}

Write-Host "Git: $gitExe" -ForegroundColor Cyan
& $gitExe --version

if (-not (Test-Path ".git")) {
  Write-Host "저장소 초기화 중..." -ForegroundColor Yellow
  & $gitExe init
  & $gitExe branch -M main 2>$null
}

if (-not (& $gitExe config user.name 2>$null)) {
  Write-Host "Git 사용자 정보가 없습니다. 로컬 저장소에만 저장됩니다." -ForegroundColor Yellow
  $n = Read-Host "user.name"
  $e = Read-Host "user.email"
  & $gitExe config --local user.name $n
  & $gitExe config --local user.email $e
}

& $gitExe add -A
$st = & $gitExe status --porcelain
if ($st) {
  & $gitExe commit -m "chore: InsightAnalyzer 업데이트"
  Write-Host "커밋 완료." -ForegroundColor Green
} else {
  Write-Host "변경 사항 없음 (이미 커밋됨)." -ForegroundColor Yellow
}

if (-not $GitHubRepoUrl) {
  Write-Host ""
  Write-Host "GitHub 저장소 URL 이 없어 푸시는 건너뜁니다." -ForegroundColor Yellow
  Write-Host "GitHub 에서 빈 저장소를 만든 뒤:" -ForegroundColor Cyan
  Write-Host '  .\scripts\2-push-and-vercel.ps1 -GitHubRepoUrl "https://github.com/아이디/저장소.git"'
  Write-Host ""
  Write-Host "Vercel:" -ForegroundColor Cyan
  Write-Host "  https://vercel.com/new → GitHub 연결 → 이 저장소 Import"
  Write-Host "  Environment Variables: OPENAI_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"
  exit 0
}

$existing = & $gitExe remote get-url origin 2>$null
if ($existing) {
  if ($existing -ne $GitHubRepoUrl) {
    & $gitExe remote set-url origin $GitHubRepoUrl
    Write-Host "origin 을 $GitHubRepoUrl 로 변경했습니다." -ForegroundColor Yellow
  }
} else {
  & $gitExe remote add origin $GitHubRepoUrl
}

Write-Host "푸시 중... (로그인 창이 뜰 수 있음)" -ForegroundColor Cyan
& $gitExe push -u origin main

Write-Host ""
Write-Host "푸시가 끝나면 Vercel 에서 Import 하세요:" -ForegroundColor Green
Write-Host "  https://vercel.com/new"
Write-Host "  Root Directory: insight-analyzer 가 아니라 저장소 루트가 이 폴더면 그대로"
Write-Host "  환경 변수: OPENAI_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY"
