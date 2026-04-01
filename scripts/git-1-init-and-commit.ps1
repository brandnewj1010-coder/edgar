# InsightAnalyzer — Git 1단계: init + 첫 커밋
# 사용 전: https://git-scm.com/download/win 에서 Git for Windows 설치 후
# PowerShell에서:  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
# 이 스크립트 위치에서:  .\scripts\git-1-init-and-commit.ps1

$ErrorActionPreference = "Stop"
# scripts\ 상위 = 프로젝트 루트 (insight-analyzer)
$Root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  Write-Host "package.json 을 찾을 수 없습니다. 프로젝트 루트에서 실행하세요." -ForegroundColor Red
  exit 1
}

Set-Location $Root
Write-Host "작업 폴더: $Root" -ForegroundColor Cyan

$gitExe = $null
$cmd = Get-Command git -ErrorAction SilentlyContinue
if ($cmd) { $gitExe = $cmd.Source }
if (-not $gitExe) {
  foreach ($p in @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe"
  )) {
    if (Test-Path $p) { $gitExe = $p; break }
  }
}
if (-not $gitExe) {
  Write-Host "Git이 설치되어 있지 않습니다. https://git-scm.com/download/win 를 설치한 뒤 다시 실행하세요." -ForegroundColor Red
  exit 1
}
& $gitExe --version

if (-not (Test-Path ".git")) {
  & $gitExe init
  & $gitExe branch -M main 2>$null
} else {
  Write-Host "이미 .git 이 있습니다." -ForegroundColor Yellow
}

$name = & $gitExe config user.name 2>$null
if (-not $name) {
  Write-Host "로컬 저장소에만 적용할 사용자 이름/이메일을 설정합니다." -ForegroundColor Yellow
  $n = Read-Host "user.name (예: Hong Gildong)"
  $e = Read-Host "user.email (예: you@example.com)"
  & $gitExe config --local user.name $n
  & $gitExe config --local user.email $e
}

& $gitExe add -A
$status = & $gitExe status --porcelain
if (-not $status) {
  Write-Host "커밋할 변경이 없습니다." -ForegroundColor Yellow
  exit 0
}

& $gitExe commit -m "chore: InsightAnalyzer 초기 커밋"
Write-Host ""
Write-Host "완료: 첫 커밋이 만들어졌습니다." -ForegroundColor Green
Write-Host ""
Write-Host "다음 — GitHub에 올리기:" -ForegroundColor Cyan
Write-Host "  1) github.com 에서 New repository 로 빈 저장소 생성 (README 추가 안 함)"
Write-Host "  2) 아래에 본인 URL 넣어 실행:"
Write-Host "     git remote add origin https://github.com/사용자이름/저장소이름.git"
Write-Host "     git push -u origin main"
Write-Host ""
if ($env:GITHUB_REPO_URL) {
  & $gitExe remote remove origin 2>$null
  & $gitExe remote add origin $env:GITHUB_REPO_URL
  Write-Host "GITHUB_REPO_URL 이 설정되어 있어 origin 을 추가했습니다. git push -u origin main 만 실행하세요." -ForegroundColor Green
}
