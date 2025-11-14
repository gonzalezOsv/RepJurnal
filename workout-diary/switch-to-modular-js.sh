#!/bin/bash
#
# Switch to Modular JavaScript Architecture
# This script helps migrate from monolithic viewProgress.js to modular structure
#
# Usage: ./switch-to-modular-js.sh [test|apply|rollback]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATIC_DIR="$SCRIPT_DIR/static"
TEMPLATES_DIR="$SCRIPT_DIR/templates"
BACKUP_DIR="$SCRIPT_DIR/backups/js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

create_backup() {
    print_header "Creating Backup"
    
    mkdir -p "$BACKUP_DIR"
    timestamp=$(date +%Y%m%d_%H%M%S)
    
    if [ -f "$STATIC_DIR/viewProgress.js" ]; then
        cp "$STATIC_DIR/viewProgress.js" "$BACKUP_DIR/viewProgress_${timestamp}.js"
        print_success "Backed up viewProgress.js to backups/js/"
    fi
    
    if [ -f "$TEMPLATES_DIR/viewProgress.html" ]; then
        cp "$TEMPLATES_DIR/viewProgress.html" "$BACKUP_DIR/viewProgress_${timestamp}.html"
        print_success "Backed up viewProgress.html to backups/js/"
    fi
    
    echo ""
}

check_files() {
    print_header "Checking Files"
    
    local all_exist=true
    
    # Check new modules exist
    local modules=("progressUtils.js" "mainLiftsTab.js" "recordsTab.js" "balanceTab.js")
    for module in "${modules[@]}"; do
        if [ -f "$STATIC_DIR/modules/$module" ]; then
            print_success "$module exists"
        else
            print_error "$module NOT FOUND"
            all_exist=false
        fi
    done
    
    # Check orchestrator exists
    if [ -f "$STATIC_DIR/viewProgress_modular.js" ]; then
        print_success "viewProgress_modular.js exists"
    else
        print_error "viewProgress_modular.js NOT FOUND"
        all_exist=false
    fi
    
    echo ""
    
    if [ "$all_exist" = false ]; then
        print_error "Some files are missing. Cannot proceed."
        exit 1
    fi
    
    return 0
}

test_mode() {
    print_header "Test Mode"
    print_warning "This will check if all files are present without making changes"
    echo ""
    
    check_files
    
    print_success "All required files present!"
    echo ""
    print_warning "To apply changes, run: ./switch-to-modular-js.sh apply"
}

apply_changes() {
    print_header "Applying Modular JavaScript"
    
    # Create backup first
    create_backup
    
    # Check files
    check_files
    
    # Archive old viewProgress.js
    if [ -f "$STATIC_DIR/viewProgress.js" ]; then
        mv "$STATIC_DIR/viewProgress.js" "$STATIC_DIR/viewProgress_OLD.js"
        print_success "Archived viewProgress.js → viewProgress_OLD.js"
    fi
    
    # Rename modular version to main (optional)
    # cp "$STATIC_DIR/viewProgress_modular.js" "$STATIC_DIR/viewProgress.js"
    # print_success "Copied viewProgress_modular.js → viewProgress.js"
    
    echo ""
    print_header "Migration Complete!"
    
    echo -e "${GREEN}Next steps:${NC}"
    echo "1. Test your application"
    echo "2. Open Progress page and check:"
    echo "   - Main Lifts tab"
    echo "   - Records tab"
    echo "   - Balance tab"
    echo "   - Analytics tab"
    echo "3. Check browser console for errors"
    echo "4. Test on mobile devices"
    echo ""
    echo "If issues occur:"
    echo "  ./switch-to-modular-js.sh rollback"
    echo ""
}

rollback() {
    print_header "Rolling Back"
    
    if [ -f "$STATIC_DIR/viewProgress_OLD.js" ]; then
        mv "$STATIC_DIR/viewProgress_OLD.js" "$STATIC_DIR/viewProgress.js"
        print_success "Restored viewProgress.js from viewProgress_OLD.js"
    else
        print_warning "No OLD file found. Check backups/js/ directory"
        
        # Find latest backup
        latest_backup=$(ls -t "$BACKUP_DIR"/viewProgress_*.js 2>/dev/null | head -1)
        if [ -n "$latest_backup" ]; then
            print_warning "Latest backup: $latest_backup"
            echo "Restore with: cp \"$latest_backup\" \"$STATIC_DIR/viewProgress.js\""
        fi
    fi
    
    echo ""
    print_success "Rollback complete!"
}

show_help() {
    echo "Usage: $0 [test|apply|rollback]"
    echo ""
    echo "Commands:"
    echo "  test      - Check if all required files exist (no changes)"
    echo "  apply     - Apply modular JavaScript architecture"
    echo "  rollback  - Revert to old viewProgress.js"
    echo ""
    echo "Examples:"
    echo "  $0 test       # Check files"
    echo "  $0 apply      # Apply changes"
    echo "  $0 rollback   # Undo changes"
    echo ""
}

# Main execution
case "${1:-test}" in
    test)
        test_mode
        ;;
    apply)
        apply_changes
        ;;
    rollback)
        rollback
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac




