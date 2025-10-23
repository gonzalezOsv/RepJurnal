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
ENV FLASK_APP=app
ENV FLASK_RUN_HOST=0.0.0.0

# Railway provides PORT environment variable, default to 5000 for local development
ENV PORT=5000

# Expose port (Railway will override this)
EXPOSE 5000

# Run Flask by executing the 'app' package as a module
CMD ["python", "-m", "app"]