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

# Download and extract Wav2Lip OpenVINO models from HuggingFace (tarball method)
RUN echo "📦 Downloading pre-converted OpenVINO models from HuggingFace..." && \
    mkdir -p models && \
    wget -O openvino_models.tar.gz https://huggingface.co/RobinMcM/wav2lip-openvino-models/resolve/main/openvino_models.tar.gz && \
    echo "📂 Extracting models..." && \
    tar -tzf openvino_models.tar.gz && \
    tar -xzf openvino_models.tar.gz -C models/ && \
    rm openvino_models.tar.gz && \
    echo "✅ Models extracted, checking contents:" && \
    ls -lhR models/

# Expose port (will be overridden by PORT env var)
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5001/health').raise_for_status()"

# Run the Flask app
CMD ["python", "app.py"]
