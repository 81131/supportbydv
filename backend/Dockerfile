# Use a lightweight Python image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to run the API using Uvicorn
# --workers 4: allow 4 concurrent requests so a slow file upload never blocks everyone else.
# Adjust based on available CPU cores (formula: 2 * cores + 1).
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]