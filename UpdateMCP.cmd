@echo off
rem UpdateMCP (Windows): bring this nwn-mcp checkout up to date and rebuild it.
rem   UpdateMCP            pull the current branch, install packages, build
rem   UpdateMCP --check    only show whether an update is waiting
rem Afterwards, reconnect the MCP server in your client so it loads the new build.
setlocal
cd /d "%~dp0"

where git >nul 2>nul || (echo UpdateMCP: git is not installed. & exit /b 1)
where npm >nul 2>nul || (echo UpdateMCP: npm ^(Node.js 20+^) is not installed. & exit /b 1)

git fetch --quiet origin || (echo UpdateMCP: could not reach the remote. & exit /b 1)

if "%~1"=="--check" (
  git log --oneline HEAD..@{u}
  echo ^(commits listed above are waiting; none listed means up to date^)
  exit /b 0
)

git diff --quiet && git diff --cached --quiet
if errorlevel 1 (
  echo You have local changes:
  git status --short --untracked-files=no
  echo UpdateMCP: commit or stash them first ^(git stash^), then run UpdateMCP again.
  exit /b 1
)

git pull --ff-only || (echo UpdateMCP: the pull cannot fast-forward; run: git pull --rebase & exit /b 1)
call npm install --no-audit --no-fund --loglevel=error || (echo UpdateMCP: npm install failed. & exit /b 1)
call npm run build --silent || (echo UpdateMCP: the build failed. & exit /b 1)

echo.
echo Updated and rebuilt. Now reconnect the MCP server in your client.
endlocal
