# Switch to Modular JavaScript Architecture
# This script helps migrate from monolithic viewProgress.js to modular structure
#
# Usage: .\switch-to-modular-js.ps1 [test|apply|rollback]
#

param(
    [Parameter(Position=0)]
    [ValidateSet('test', 'apply', 'rollback', 'help')]
    [string]$Action = 'test'
)

$ScriptDir = $PSScriptRoot
$StaticDir = Join-Path $ScriptDir "static"
$TemplatesDir = Join-Path $ScriptDir "templates"
$BackupDir = Join-Path $ScriptDir "backups\js"

function Print-Header {
    param([string]$Message)
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Create-Backup {
    Print-Header "Creating Backup"
    
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    
    $oldJs = Join-Path $StaticDir "viewProgress.js"
    if (Test-Path $oldJs) {
        $backupJs = Join-Path $BackupDir "viewProgress_$timestamp.js"
        Copy-Item $oldJs $backupJs
        Print-Success "Backed up viewProgress.js"
    }
    
    $oldHtml = Join-Path $TemplatesDir "viewProgress.html"
    if (Test-Path $oldHtml) {
        $backupHtml = Join-Path $BackupDir "viewProgress_$timestamp.html"
        Copy-Item $oldHtml $backupHtml
        Print-Success "Backed up viewProgress.html"
    }
    
    Write-Host ""
}

function Check-Files {
    Print-Header "Checking Files"
    
    $allExist = $true
    
    # Check new modules
    $modules = @("progressUtils.js", "mainLiftsTab.js", "recordsTab.js", "balanceTab.js")
    foreach ($module in $modules) {
        $path = Join-Path $StaticDir "modules\$module"
        if (Test-Path $path) {
            Print-Success "$module exists"
        } else {
            Print-Error "$module NOT FOUND"
            $allExist = $false
        }
    }
    
    # Check orchestrator
    $orchestrator = Join-Path $StaticDir "viewProgress_modular.js"
    if (Test-Path $orchestrator) {
        Print-Success "viewProgress_modular.js exists"
    } else {
        Print-Error "viewProgress_modular.js NOT FOUND"
        $allExist = $false
    }
    
    Write-Host ""
    
    if (-not $allExist) {
        Print-Error "Some files are missing. Cannot proceed."
        exit 1
    }
    
    return $true
}

function Test-Mode {
    Print-Header "Test Mode"
    Print-Warning "Checking if all files are present without making changes"
    Write-Host ""
    
    Check-Files
    
    Print-Success "All required files present!"
    Write-Host ""
    Print-Warning "To apply changes, run: .\switch-to-modular-js.ps1 apply"
}

function Apply-Changes {
    Print-Header "Applying Modular JavaScript"
    
    # Create backup first
    Create-Backup
    
    # Check files
    Check-Files
    
    # Archive old viewProgress.js
    $oldJs = Join-Path $StaticDir "viewProgress.js"
    if (Test-Path $oldJs) {
        $archivedJs = Join-Path $StaticDir "viewProgress_OLD.js"
        Move-Item $oldJs $archivedJs -Force
        Print-Success "Archived viewProgress.js → viewProgress_OLD.js"
    }
    
    Write-Host ""
    Print-Header "Migration Complete!"
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Green
    Write-Host "1. Test your application"
    Write-Host "2. Open Progress page and check:"
    Write-Host "   - Main Lifts tab"
    Write-Host "   - Records tab"
    Write-Host "   - Balance tab"
    Write-Host "   - Analytics tab"
    Write-Host "3. Check browser console for errors"
    Write-Host "4. Test on mobile devices"
    Write-Host ""
    Write-Host "If issues occur:"
    Write-Host "  .\switch-to-modular-js.ps1 rollback" -ForegroundColor Yellow
    Write-Host ""
}

function Rollback-Changes {
    Print-Header "Rolling Back"
    
    $archivedJs = Join-Path $StaticDir "viewProgress_OLD.js"
    $currentJs = Join-Path $StaticDir "viewProgress.js"
    
    if (Test-Path $archivedJs) {
        Move-Item $archivedJs $currentJs -Force
        Print-Success "Restored viewProgress.js from viewProgress_OLD.js"
    } else {
        Print-Warning "No OLD file found. Check backups\js\ directory"
        
        # Find latest backup
        $backups = Get-ChildItem -Path $BackupDir -Filter "viewProgress_*.js" -ErrorAction SilentlyContinue | 
                   Sort-Object LastWriteTime -Descending | 
                   Select-Object -First 1
        
        if ($backups) {
            Print-Warning "Latest backup: $($backups.FullName)"
            Write-Host "Restore with: Copy-Item `"$($backups.FullName)`" `"$currentJs`""
        }
    }
    
    Write-Host ""
    Print-Success "Rollback complete!"
}

function Show-Help {
    Write-Host "Usage: .\switch-to-modular-js.ps1 [test|apply|rollback]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  test      - Check if all required files exist (no changes)"
    Write-Host "  apply     - Apply modular JavaScript architecture"
    Write-Host "  rollback  - Revert to old viewProgress.js"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\switch-to-modular-js.ps1 test       # Check files"
    Write-Host "  .\switch-to-modular-js.ps1 apply      # Apply changes"
    Write-Host "  .\switch-to-modular-js.ps1 rollback   # Undo changes"
    Write-Host ""
}

# Main execution
switch ($Action) {
    'test' {
        Test-Mode
    }
    'apply' {
        Apply-Changes
    }
    'rollback' {
        Rollback-Changes
    }
    'help' {
        Show-Help
    }
    default {
        Print-Error "Unknown command: $Action"
        Show-Help
        exit 1
    }
}




