FROM python:3.11-slim-bullseye

# Set work directory
WORKDIR /app

# Install system dependencies needed for Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
# FLASK_APP is not strictly necessary if you're using `python -m app` and __main__.py
# but it doesn't hurt to keep it if you have other Flask CLI commands.
ENV FLASK_APP=app
ENV FLASK_RUN_HOST=0.0.0.0

# Expose port
EXPOSE 5000

# Run Flask by executing the 'app' package as a module
CMD ["python", "-m", "app"]