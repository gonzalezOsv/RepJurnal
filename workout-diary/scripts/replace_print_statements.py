#!/usr/bin/env python3
"""
Script to find all print() statements in Python files and show what needs to be replaced.
This helps identify remaining print() statements that need to be converted to logging.

Usage:
    python scripts/replace_print_statements.py
"""

import os
import re
from pathlib import Path


def find_print_statements(directory):
    """
    Find all print statements in Python files.
    
    Args:
        directory: Directory to search
    
    Returns:
        dict: {file_path: [(line_number, line_content), ...]}
    """
    print_statements = {}
    
    # Find all Python files
    for py_file in Path(directory).rglob('*.py'):
        # Skip virtual environment and migrations
        if 'venv' in str(py_file) or 'migrations' in str(py_file):
            continue
        
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            file_prints = []
            for i, line in enumerate(lines, 1):
                # Look for print statements (not in comments)
                if re.search(r'^\s*print\s*\(', line) and not line.strip().startswith('#'):
                    file_prints.append((i, line.rstrip()))
            
            if file_prints:
                print_statements[str(py_file)] = file_prints
        
        except Exception as e:
            print(f"Error reading {py_file}: {e}")
    
    return print_statements


def generate_replacement_suggestions(print_statements):
    """
    Generate suggestions for replacing print() with logging.
    
    Args:
        print_statements: Output from find_print_statements()
    """
    print("=" * 80)
    print("PRINT STATEMENTS TO REPLACE")
    print("=" * 80)
    print()
    
    total_count = sum(len(prints) for prints in print_statements.values())
    
    if total_count == 0:
        print("✅ No print() statements found! Great job!")
        return
    
    print(f"Found {total_count} print() statements in {len(print_statements)} files:\n")
    
    for file_path, prints in sorted(print_statements.items()):
        print(f"\n📄 {file_path}")
        print(f"   {len(prints)} print statements found:\n")
        
        for line_num, line_content in prints:
            print(f"   Line {line_num}: {line_content}")
            
            # Suggest replacement
            suggestion = suggest_logging_replacement(line_content)
            if suggestion:
                print(f"   → Suggested: {suggestion}")
        
        print()
    
    print("=" * 80)
    print(f"TOTAL: {total_count} print statements need to be replaced")
    print("=" * 80)
    print("\n📚 REPLACEMENT GUIDE:")
    print("\n1. Import current_app at the top:")
    print("   from flask import current_app")
    print("\n2. Replace print() based on context:")
    print("   • Debug info:    print('text') → current_app.logger.debug('text')")
    print("   • General info:  print('text') → current_app.logger.info('text')")
    print("   • Warnings:      print('warning') → current_app.logger.warning('text')")
    print("   • Errors:        print('error') → current_app.logger.error('text')")
    print("\n3. For security events, use:")
    print("   current_app.security_logger.info('Event: event_type | User: X | IP: Y')")


def suggest_logging_replacement(line_content):
    """
    Suggest appropriate logging replacement for a print statement.
    
    Args:
        line_content: The line containing print()
    
    Returns:
        str: Suggested replacement
    """
    line_lower = line_content.lower()
    
    # Extract the print content
    match = re.search(r'print\s*\((.*?)\)', line_content)
    if not match:
        return None
    
    print_content = match.group(1)
    indent = len(line_content) - len(line_content.lstrip())
    indent_str = ' ' * indent
    
    # Determine appropriate log level
    if any(word in line_lower for word in ['error', 'failed', 'exception']):
        return f"{indent_str}current_app.logger.error({print_content})"
    elif any(word in line_lower for word in ['warning', 'warn', 'invalid']):
        return f"{indent_str}current_app.logger.warning({print_content})"
    elif any(word in line_lower for word in ['loading', 'start', 'done', 'end']):
        return f"{indent_str}current_app.logger.debug({print_content})"
    else:
        return f"{indent_str}current_app.logger.info({print_content})"


def main():
    """Main function."""
    # Get the project root (parent of scripts/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    app_dir = project_root / 'app'
    
    print(f"Searching for print() statements in: {app_dir}\n")
    
    print_statements = find_print_statements(app_dir)
    generate_replacement_suggestions(print_statements)


if __name__ == '__main__':
    main()

