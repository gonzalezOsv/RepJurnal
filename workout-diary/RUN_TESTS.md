# Quick Test Runner Guide

## 🚀 Quick Start

### Option 1: Use the Script (Easiest)

**Windows (PowerShell):**
```powershell
.\run-tests.ps1
```

**Linux/Mac (Bash):**
```bash
./run-tests.sh
```

### Option 2: Direct Command

**From the `workout-diary` directory:**
```bash
pytest tests/ -v
```

**Or:**
```bash
python -m pytest tests/ -v
```

## 📊 Test Results

After running, you'll see:
```
========== 59 passed, 77 warnings in 13.38s ==========
```

## 📁 Test Files

All tests are in the `tests/` directory:
- `test_auth.py` - Authentication tests (13 tests)
- `test_account.py` - Account management tests (23 tests)
- `test_metrics.py` - Metrics & analytics tests (11 tests)
- `test_access_control.py` - Access control tests (12 tests)

## 🔧 Common Commands

### Run All Tests
```bash
pytest tests/ -v
```

### Run Specific Test File
```bash
pytest tests/test_auth.py -v
pytest tests/test_account.py -v
```

### Run Tests Matching Keyword
```bash
pytest tests/ -k login -v
pytest tests/ -k account -v
```

### Run Specific Test
```bash
pytest tests/test_auth.py::TestLogin::test_login_success -v
```

### Run with Coverage Report
```bash
pytest tests/ --cov=app --cov-report=html -v
```

### Run with Less Output
```bash
pytest tests/ --tb=short
```

## 📝 Prerequisites

Make sure pytest is installed:
```bash
pip install pytest pytest-cov
```

Or install all requirements:
```bash
pip install -r requirements.txt
```

