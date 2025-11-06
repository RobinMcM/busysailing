FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Download Wav2Lip repository and models
RUN echo "Downloading Wav2Lip repository..." && \
    git clone https://github.com/Rudrabha/Wav2Lip.git /opt/Wav2Lip && \
    echo "Downloading face detection model..." && \
    mkdir -p models && \
    wget -O models/s3fd.pth https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth && \
    echo "Downloading Wav2Lip checkpoint..." && \
    wget -O models/wav2lip_gan.pth https://huggingface.co/Non-playing-Character/Wave2lip/resolve/main/wav2lip_gan.pth

# Convert models to OpenVINO format (this will run during build)
# Note: Model conversion is handled by inference_engine.py on first run

# Expose port (Render assigns PORT env var)
EXPOSE 5001

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV PYTHONPATH="/app:/opt:${PYTHONPATH}"

# Run the Flask app
CMD python app.py
