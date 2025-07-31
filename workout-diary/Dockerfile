FROM python:3.9-slim-buster

# Set work directory
WORKDIR /app

# Copy your entire application directory (workout-diary/app) into the /app directory in the container
# Assuming your Dockerfile is in the 'workout-diary' directory,
# this will copy 'app' folder, 'requirements.txt' etc.
COPY . .

# Install dependencies
RUN pip install --upgrade pip && pip install -r requirements.txt

# Set environment variables
# FLASK_APP is not strictly necessary if you're using `python -m app` and __main__.py
# but it doesn't hurt to keep it if you have other Flask CLI commands.
ENV FLASK_APP=app
ENV FLASK_RUN_HOST=0.0.0.0

# Expose port
EXPOSE 5000

# Run Flask by executing the 'app' package as a module
CMD ["python", "-m", "app"]