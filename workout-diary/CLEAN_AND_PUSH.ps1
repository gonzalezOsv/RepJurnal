# ===================================
# CLEAN AND PUSH TO GITHUB SCRIPT
# ===================================
# This script helps you clean up your Git repository and push to GitHub
# Run with: .\CLEAN_AND_PUSH.ps1

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "FITNESS DIARY - CLEAN GIT PUSH SCRIPT" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
$projectRoot = "c:\Users\1212\Documents\Projects\fitnesDiary"
Set-Location $projectRoot

Write-Host "Step 1: Checking current Git status..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "Step 2: Security Check - Looking for sensitive files..." -ForegroundColor Yellow

$sensitiveFiles = @()

# Check for .env files
$envFiles = git ls-files | Select-String "\.env$"
if ($envFiles) {
    Write-Host "  ⚠️  WARNING: .env files found in Git!" -ForegroundColor Red
    $sensitiveFiles += ".env files"
}

# Check for log files
$logFiles = git ls-files | Select-String "\.log$"
if ($logFiles) {
    Write-Host "  ⚠️  WARNING: Log files found in Git!" -ForegroundColor Red
    $sensitiveFiles += "log files"
}

# Check for venv
$venvFiles = git ls-files | Select-String "venv/"
if ($venvFiles) {
    Write-Host "  ⚠️  WARNING: venv folder found in Git!" -ForegroundColor Red
    $sensitiveFiles += "venv folder"
}

# Check for node_modules
$nodeModules = git ls-files | Select-String "node_modules/"
if ($nodeModules) {
    Write-Host "  ⚠️  WARNING: node_modules folder found in Git!" -ForegroundColor Red
    $sensitiveFiles += "node_modules folder"
}

# Check for __pycache__
$pycache = git ls-files | Select-String "__pycache__"
if ($pycache) {
    Write-Host "  ⚠️  WARNING: __pycache__ folders found in Git!" -ForegroundColor Red
    $sensitiveFiles += "__pycache__ folders"
}

if ($sensitiveFiles.Count -eq 0) {
    Write-Host "  ✅ No sensitive files detected!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "SENSITIVE FILES DETECTED:" -ForegroundColor Red
    foreach ($file in $sensitiveFiles) {
        Write-Host "  - $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "CHOOSE YOUR OPTION:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "1. FRESH START - Clean history with one commit (RECOMMENDED)" -ForegroundColor White
Write-Host "2. CLEAN UP - Remove unwanted files, keep history" -ForegroundColor White
Write-Host "3. CHECK ONLY - Just show what would be committed" -ForegroundColor White
Write-Host "4. EXIT - Do nothing" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "⚠️  WARNING: This will create a fresh history!" -ForegroundColor Red
        Write-Host "This is DESTRUCTIVE and will rewrite your GitHub history." -ForegroundColor Red
        Write-Host ""
        $confirm = Read-Host "Are you sure? Type 'YES' to continue"
        
        if ($confirm -eq "YES") {
            Write-Host ""
            Write-Host "Step 3: Removing all files from Git tracking..." -ForegroundColor Yellow
            git rm -r --cached .
            
            Write-Host ""
            Write-Host "Step 4: Adding files back (respecting .gitignore)..." -ForegroundColor Yellow
            git add .
            
            Write-Host ""
            Write-Host "Step 5: Creating clean commit..." -ForegroundColor Yellow
            git commit -m "feat: Clean project structure with proper gitignore and security"
            
            Write-Host ""
            Write-Host "Step 6: Files that will be pushed:" -ForegroundColor Yellow
            git ls-files
            
            Write-Host ""
            Write-Host "Ready to push to GitHub!" -ForegroundColor Green
            Write-Host "Run these commands manually:" -ForegroundColor Yellow
            Write-Host "  git push origin main --force" -ForegroundColor Cyan
            Write-Host "OR" -ForegroundColor Yellow
            Write-Host "  git push origin master --force" -ForegroundColor Cyan
        } else {
            Write-Host "Cancelled." -ForegroundColor Yellow
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "Step 3: Removing unwanted files from tracking..." -ForegroundColor Yellow
        
        # Remove common unwanted files
        git rm -r --cached workout-diary/venv/ 2>$null
        git rm -r --cached workout-diary/node_modules/ 2>$null
        git rm -r --cached workout-diary/logs/ 2>$null
        git rm --cached workout-diary/.env 2>$null
        git rm -r --cached workout-diary/__pycache__/ 2>$null
        git rm -r --cached workout-diary/app/__pycache__/ 2>$null
        git rm -r --cached workout-diary/tests/__pycache__/ 2>$null
        git rm -r --cached workout-diary/client/node_modules/ 2>$null
        
        Write-Host ""
        Write-Host "Step 4: Adding .gitignore and clean files..." -ForegroundColor Yellow
        git add .gitignore
        git add workout-diary/.gitignore
        git add .
        
        Write-Host ""
        Write-Host "Step 5: Checking what will be committed..." -ForegroundColor Yellow
        git status
        
        Write-Host ""
        Write-Host "Ready to commit!" -ForegroundColor Green
        Write-Host "Run these commands manually:" -ForegroundColor Yellow
        Write-Host "  git commit -m 'chore: Remove unnecessary files and add proper gitignore'" -ForegroundColor Cyan
        Write-Host "  git push origin main" -ForegroundColor Cyan
    }
    
    "3" {
        Write-Host ""
        Write-Host "Files that would be committed:" -ForegroundColor Yellow
        git status
        Write-Host ""
        Write-Host "Files currently tracked:" -ForegroundColor Yellow
        git ls-files
    }
    
    "4" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit
    }
    
    default {
        Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "IMPORTANT REMINDERS:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ .env file should NOT be in Git" -ForegroundColor White
Write-Host "✅ venv/ folder should NOT be in Git" -ForegroundColor White
Write-Host "✅ node_modules/ folder should NOT be in Git" -ForegroundColor White
Write-Host "✅ logs/ folder should NOT be in Git" -ForegroundColor White
Write-Host "✅ env.example SHOULD be in Git (with placeholders)" -ForegroundColor White
Write-Host ""
Write-Host "Done! Check GIT_DEPLOYMENT_GUIDE.md for detailed instructions." -ForegroundColor Green

