FROM python:3.10-slim-bullseye

# Install system dependencies including ffmpeg
RUN apt-get update && apt-get install -y \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better Docker caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY inference.py .

# Create models directory
RUN mkdir -p /app/models

# Download Wav2Lip OpenVINO models from HuggingFace
RUN echo "Downloading Wav2Lip models from HuggingFace..." && \
    wget -q https://huggingface.co/RobinMcM/wav2lip-openvino-models/resolve/main/wav2lip.xml -O /app/models/wav2lip.xml && \
    wget -q https://huggingface.co/RobinMcM/wav2lip-openvino-models/resolve/main/wav2lip.bin -O /app/models/wav2lip.bin && \
    echo "Models downloaded successfully" && \
    ls -lh /app/models/

# Expose port (will be overridden by PORT env var)
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5001/health').raise_for_status()"

# Run the Flask app
CMD ["python", "app.py"]
