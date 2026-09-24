Option Explicit
Dim shell, fso, scriptDir, command, exitCode
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & scriptDir & "\install-graphify.ps1"""
exitCode = shell.Run(command, 0, True)
WScript.Quit exitCode
