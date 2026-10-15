@echo off
title Manifold - BAI503 Machine Learning
cd /d "%~dp0manifold"
if not exist node_modules (
  echo Installing dependencies for the first run, this takes a minute...
  call npm install
)
echo Starting Manifold at http://localhost:5173 ...
call npm run dev -- --open --port 5173
