#!/bin/bash
# Start Wav2Lip Flask service on port 5001

cd "$(dirname "$0")"
echo "🚀 Starting Wav2Lip service..."
python app.py
