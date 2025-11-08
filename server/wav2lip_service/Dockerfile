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

# Download Wav2Lip repository (needed for Python modules)
# Remove existing Wav2Lip directory if present to avoid conflicts
RUN echo "Downloading Wav2Lip repository for Python modules..." && \
    rm -rf /app/Wav2Lip && \
    git clone https://github.com/Rudrabha/Wav2Lip.git /app/Wav2Lip && \
    echo "✅ Wav2Lip repository downloaded"

# Download pre-converted OpenVINO models from Hugging Face
# Split into multiple steps for better debugging and fail-fast behavior
RUN set -eu && \
    echo "📦 Step 1: Creating models directory..." && \
    mkdir -p models && \
    echo "✅ Models directory created"

RUN set -eu && \
    echo "⬇️ Step 2: Downloading OpenVINO models from Hugging Face..." && \
    wget -v -O openvino_models.tar.gz \
    https://huggingface.co/RobinMcM/wav2lip-openvino-models/resolve/main/openvino_models.tar.gz && \
    echo "✅ Download complete" && \
    ls -lh openvino_models.tar.gz && \
    echo "📊 File size: $(du -h openvino_models.tar.gz | cut -f1)"

RUN set -eu && \
    echo "📋 Step 3: Inspecting tarball contents..." && \
    tar -tzf openvino_models.tar.gz | head -20 && \
    echo "✅ Tarball structure verified"

RUN set -eu && \
    echo "📂 Step 4: Extracting models..." && \
    tar -xzvf openvino_models.tar.gz -C models/ --strip-components=1 && \
    echo "✅ Extraction complete"

RUN set -eu && \
    echo "🗑️ Step 5: Cleaning up tarball..." && \
    rm openvino_models.tar.gz && \
    echo "✅ Tarball removed"

RUN set -eu && \
    echo "🔍 Step 6: Verifying model files..." && \
    ls -lh models/ && \
    echo "Checking for required model files..." && \
    test -s models/face_detection.bin && echo "✓ face_detection.bin found ($(du -h models/face_detection.bin | cut -f1))" || { echo "❌ face_detection.bin missing or empty"; exit 1; } && \
    test -s models/face_detection.xml && echo "✓ face_detection.xml found ($(du -h models/face_detection.xml | cut -f1))" || { echo "❌ face_detection.xml missing or empty"; exit 1; } && \
    test -s models/wav2lip.bin && echo "✓ wav2lip.bin found ($(du -h models/wav2lip.bin | cut -f1))" || { echo "❌ wav2lip.bin missing or empty"; exit 1; } && \
    test -s models/wav2lip.xml && echo "✓ wav2lip.xml found ($(du -h models/wav2lip.xml | cut -f1))" || { echo "❌ wav2lip.xml missing or empty"; exit 1; } && \
    echo "✅ All 4 model files verified successfully!"

# Expose port (Render assigns PORT env var)
EXPOSE 5001

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py
ENV PYTHONPATH="/app:${PYTHONPATH}"

# Run the Flask app
CMD python app.py
