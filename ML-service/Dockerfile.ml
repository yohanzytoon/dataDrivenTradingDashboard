FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . .

# Create directories for model storage
RUN mkdir -p models scalers history

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=5002
ENV HOST=0.0.0.0
ENV ENVIRONMENT=production

# Define health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

# Expose port
EXPOSE 5002

# Run app
CMD ["python", "main.py"]