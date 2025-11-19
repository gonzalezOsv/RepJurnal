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
# When Railway uses this Dockerfile, it's already in the workout-diary context
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV FLASK_APP=app
ENV FLASK_RUN_HOST=0.0.0.0

# Railway provides PORT environment variable, default to 5000 for local development
ENV PORT=5000

# Expose port (Railway will override this)
EXPOSE 5000

# Run with Gunicorn for production (recommended)
# Fallback to Flask dev server if Gunicorn not available (development)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 4 --threads 2 --timeout 120 --access-logfile - --error-logfile - --log-level info 'app:create_app()' || python -m app"]