@echo off

REM Array of all shadcn component names
set components=accordion alert alert-dialog aspect-ratio avatar badge button calendar card carousel checkbox collapsible command context-menu dialog drawer dropdown-menu form hover-card input label menubar navigation-menu popover progress radio-group scroll-area select separator sheet skeleton slider switch table tabs textarea toast toggle tooltip

REM Function to install a component
:install_component
    echo Installing %1...
    npx shadcn@latest add %1
    goto :eof

REM Main installation loop
for %%C in (%components%) do (
    call :install_component %%C
)

echo All shadcn components have been installed successfully!
pause
