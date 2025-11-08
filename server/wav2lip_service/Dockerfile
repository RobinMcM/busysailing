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
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Download pre-converted OpenVINO models from Hugging Face
RUN echo "Downloading pre-converted OpenVINO models from Hugging Face..." && \
    mkdir -p models && \
    wget -O openvino_models.tar.gz https://huggingface.co/RobinMcM/wav2lip-openvino-models/resolve/main/openvino_models.tar.gz && \
    tar -xzf openvino_models.tar.gz -C models/ && \
    rm openvino_models.tar.gz && \
    echo "✅ OpenVINO models downloaded and extracted" && \
    ls -lh models/

# Expose port (Render assigns PORT env var)
EXPOSE 5001

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py

# Run the Flask app
CMD python app.py
