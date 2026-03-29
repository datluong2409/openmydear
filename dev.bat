@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64
set PATH=C:\Users\dat.luong\.cargo\bin;%PATH%
cd /d D:\PROJECTS\OpenMyDear
npx tauri dev
