!macro NSIS_HOOK_POSTINSTALL
  ExecShell "" "$INSTDIR\Quickno.exe"
!macroend
