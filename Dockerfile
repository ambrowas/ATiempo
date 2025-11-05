# Use an official Python runtime as the parent image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application source code
COPY . .

# Cloud Run sets the PORT environment variable; your app must listen on it
# ... (all the other lines from your Dockerfile) ...

# Run the application using a robust server
CMD gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app