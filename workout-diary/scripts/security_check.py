#!/usr/bin/env python3
"""
Automated Security Checker for Fitness Tracker
Scans for common security issues before deployment.
"""

import os
import sys
import re
from pathlib import Path

class SecurityChecker:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.errors = []
        self.warnings = []
        self.info = []
        
    def check_all(self):
        """Run all security checks."""
        print("🔍 Running Security Checks...\n")
        
        self.check_environment_variables()
        self.check_hardcoded_secrets()
        self.check_debug_statements()
        self.check_sql_injection_risks()
        self.check_missing_decorators()
        self.check_gitignore()
        self.check_requirements()
        
        self.print_results()
        return len(self.errors)
    
    def check_environment_variables(self):
        """Check that critical environment variables are set."""
        print("📋 Checking Environment Variables...")
        
        required_vars = [
            'SECRET_KEY',
            'JWT_SECRET_KEY',
            'SQLALCHEMY_DATABASE_URI'
        ]
        
        weak_defaults = [
            'dev_secret_key',
            'dev_jwt_secret',
            'change_in_production',
            'flaskpassword',
            'my-secret-pw'
        ]
        
        for var in required_vars:
            value = os.getenv(var)
            if not value:
                self.warnings.append(f"{var} is not set in environment")
            else:
                # Check for weak values
                for weak in weak_defaults:
                    if weak.lower() in value.lower():
                        self.errors.append(
                            f"{var} contains weak/default value: '{weak}'"
                        )
                        break
                
                # Check length
                if var.endswith('KEY') and len(value) < 32:
                    self.errors.append(
                        f"{var} is too short (min 32 characters, got {len(value)})"
                    )
    
    def check_hardcoded_secrets(self):
        """Scan for hardcoded secrets in code."""
        print("🔑 Scanning for Hardcoded Secrets...")
        
        patterns = [
            (r'password\s*=\s*["\'][^"\']{3,}["\']', 'Hardcoded password'),
            (r'api[_-]?key\s*=\s*["\'][^"\']{3,}["\']', 'Hardcoded API key'),
            (r'secret[_-]?key\s*=\s*["\'][^"\']{3,}["\']', 'Hardcoded secret key'),
            (r'token\s*=\s*["\'][^"\']{10,}["\']', 'Hardcoded token'),
            (r'mysql://[^:]+:[^@]+@', 'Database credentials in code'),
            (r'postgresql://[^:]+:[^@]+@', 'Database credentials in code'),
        ]
        
        # Scan Python files
        py_files = list(self.project_root.glob('app/**/*.py'))
        
        for py_file in py_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for pattern, description in patterns:
                        matches = re.finditer(pattern, content, re.IGNORECASE)
                        for match in matches:
                            # Skip if it's using os.getenv or config
                            if 'getenv' in match.group() or 'config[' in match.group():
                                continue
                            
                            line_num = content[:match.start()].count('\n') + 1
                            self.errors.append(
                                f"{description} found in {py_file.name}:{line_num}"
                            )
            except Exception as e:
                self.warnings.append(f"Could not scan {py_file}: {str(e)}")
    
    def check_debug_statements(self):
        """Check for debug print statements."""
        print("🐛 Checking for Debug Statements...")
        
        py_files = list(self.project_root.glob('app/**/*.py'))
        print_count = 0
        
        for py_file in py_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for i, line in enumerate(lines, 1):
                        # Check for print statements (not in comments)
                        if re.search(r'^\s*print\s*\(', line) and not line.strip().startswith('#'):
                            print_count += 1
                            if print_count <= 5:  # Only show first 5
                                self.warnings.append(
                                    f"print() statement in {py_file.name}:{i}"
                                )
            except Exception as e:
                pass
        
        if print_count > 0:
            self.warnings.append(
                f"Total {print_count} print() statements found. Use logging instead."
            )
    
    def check_sql_injection_risks(self):
        """Check for potential SQL injection risks."""
        print("💉 Checking SQL Injection Risks...")
        
        dangerous_patterns = [
            r'\.execute\s*\([^)]*%s[^)]*\)',
            r'\.execute\s*\([^)]*\+\s*[^)]*\)',
            r'\.execute\s*\([^)]*f["\']',  # f-string in execute
            r'\.execute\s*\([^)]*format\(',
        ]
        
        py_files = list(self.project_root.glob('app/**/*.py'))
        
        for py_file in py_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for pattern in dangerous_patterns:
                        matches = re.finditer(pattern, content)
                        for match in matches:
                            line_num = content[:match.start()].count('\n') + 1
                            self.warnings.append(
                                f"Potential SQL injection risk in {py_file.name}:{line_num}"
                            )
            except Exception as e:
                pass
    
    def check_missing_decorators(self):
        """Check for routes missing @login_required."""
        print("🔒 Checking for Missing @login_required...")
        
        py_files = list(self.project_root.glob('app/**/*.py'))
        
        for py_file in py_files:
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for i in range(len(lines)):
                        # Check for route decorators
                        if re.search(r'@\w+_bp\.route\(', lines[i]):
                            # Skip if it's a public route (login, register, home)
                            route_path = re.search(r'@\w+_bp\.route\(["\']([^"\']+)', lines[i])
                            if route_path:
                                path = route_path.group(1)
                                if any(public in path for public in ['login', 'register', '/', 'home']):
                                    continue
                            
                            # Check if @login_required exists in previous lines (within 5 lines)
                            has_login_required = False
                            for j in range(max(0, i-5), i):
                                if '@login_required' in lines[j]:
                                    has_login_required = True
                                    break
                            
                            if not has_login_required:
                                # Check if method allows POST (more likely to need protection)
                                if 'POST' in lines[i] or 'DELETE' in lines[i] or 'PUT' in lines[i]:
                                    self.warnings.append(
                                        f"Route without @login_required in {py_file.name}:{i+1}"
                                    )
            except Exception as e:
                pass
    
    def check_gitignore(self):
        """Check .gitignore configuration."""
        print("📝 Checking .gitignore...")
        
        gitignore_path = self.project_root / '.gitignore'
        
        if not gitignore_path.exists():
            self.errors.append(".gitignore file not found!")
            return
        
        required_entries = [
            '.env',
            '__pycache__',
            '*.pyc',
            'venv',
            '*.log'
        ]
        
        try:
            with open(gitignore_path, 'r') as f:
                content = f.read()
                for entry in required_entries:
                    if entry not in content:
                        self.warnings.append(
                            f".gitignore missing entry: {entry}"
                        )
        except Exception as e:
            self.errors.append(f"Could not read .gitignore: {str(e)}")
    
    def check_requirements(self):
        """Check requirements.txt for security."""
        print("📦 Checking requirements.txt...")
        
        req_path = self.project_root / 'requirements.txt'
        
        if not req_path.exists():
            self.warnings.append("requirements.txt not found")
            return
        
        try:
            with open(req_path, 'r') as f:
                content = f.read()
                
                # Check if packages are pinned
                unpinned = re.findall(r'^([a-zA-Z0-9_-]+)\s*$', content, re.MULTILINE)
                if unpinned:
                    self.warnings.append(
                        f"Unpinned packages found: {', '.join(unpinned[:3])}"
                    )
                
                # Check for missing security packages
                security_packages = {
                    'Flask-WTF': 'CSRF protection',
                    'Flask-Limiter': 'Rate limiting',
                }
                
                for package, purpose in security_packages.items():
                    if package not in content:
                        self.info.append(
                            f"Consider adding {package} for {purpose}"
                        )
        except Exception as e:
            self.warnings.append(f"Could not read requirements.txt: {str(e)}")
    
    def print_results(self):
        """Print all findings."""
        print("\n" + "="*60)
        print("SECURITY SCAN RESULTS")
        print("="*60 + "\n")
        
        if self.errors:
            print("🔴 CRITICAL ERRORS (Must Fix):")
            for error in self.errors:
                print(f"  ❌ {error}")
            print()
        
        if self.warnings:
            print("⚠️  WARNINGS (Should Fix):")
            for warning in self.warnings:
                print(f"  ⚠️  {warning}")
            print()
        
        if self.info:
            print("ℹ️  RECOMMENDATIONS:")
            for info in self.info:
                print(f"  ℹ️  {info}")
            print()
        
        # Summary
        print("="*60)
        print(f"Errors: {len(self.errors)} | Warnings: {len(self.warnings)} | Info: {len(self.info)}")
        print("="*60)
        
        if len(self.errors) == 0 and len(self.warnings) == 0:
            print("✅ All security checks passed!")
            return 0
        elif len(self.errors) > 0:
            print("❌ Critical errors found. DO NOT deploy to production!")
            return 1
        else:
            print("⚠️  Warnings found. Please review before deployment.")
            return 0


def main():
    """Run security checks."""
    # Get project root (parent of scripts directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    print(f"Scanning project: {project_root}\n")
    
    checker = SecurityChecker(project_root)
    exit_code = checker.check_all()
    
    print("\n💡 Tip: Run 'python scripts/security_check.py' before every commit!")
    print("📚 See SECURITY_AUDIT.md and SECURITY_FIXES.md for details.\n")
    
    sys.exit(exit_code)


if __name__ == '__main__':
    main()

