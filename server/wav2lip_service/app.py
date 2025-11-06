"""
Wav2Lip Flask Service - Phase 5
Complete API with /api/generate endpoint for lip-sync generation
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from pathlib import Path
import sys
import base64
import io
import tempfile
import traceback
import numpy as np
import cv2

from inference_engine import Wav2LipInferenceEngine

app = Flask(__name__)
CORS(app)

# Global inference engine (initialized on first request)
inference_engine = None

def get_inference_engine():
    """Lazy-load inference engine"""
    global inference_engine
    if inference_engine is None:
        print("Initializing Wav2Lip inference engine...")
        inference_engine = Wav2LipInferenceEngine()
    return inference_engine

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    response = {
        "status": "ok",
        "service": "wav2lip",
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "phase": "5",
        "phase_description": "Flask API endpoint with lip-sync generation"
    }
    
    # Check OpenVINO
    try:
        import openvino as ov
        response["openvino_version"] = ov.__version__
        response["openvino_ready"] = True
    except Exception as e:
        response["openvino_ready"] = False
        response["openvino_error"] = str(e)
    
    # Check models
    models_dir = Path(__file__).parent / "models"
    required_models = ["face_detection.xml", "face_detection.bin", "wav2lip.xml", "wav2lip.bin"]
    models_exist = {model: (models_dir / model).exists() for model in required_models}
    
    response["models_available"] = all(models_exist.values())
    response["models"] = models_exist
    
    # Check inference capabilities
    response["inference_ready"] = response["openvino_ready"] and response["models_available"]
    
    if response["inference_ready"]:
        response["capabilities"] = {
            "face_detection": True,
            "audio_preprocessing": True,
            "wav2lip_generation": True
        }
    
    return jsonify(response)

@app.route('/api/generate', methods=['POST'])
def generate():
    """
    Generate lip-synced video from image and audio
    
    Request JSON:
    {
        "image": "base64_encoded_image",
        "audio": "base64_encoded_audio_wav",
        "fps": 25  (optional, default 25)
    }
    
    Response:
    {
        "success": true,
        "video": "base64_encoded_video_webm",
        "num_frames": 123,
        "duration": 4.92
    }
    """
    try:
        # Parse request
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No JSON data provided"}), 400
        
        if "image" not in data:
            return jsonify({"success": False, "error": "Missing 'image' field"}), 400
        
        if "audio" not in data:
            return jsonify({"success": False, "error": "Missing 'audio' field"}), 400
        
        fps = data.get("fps", 25)
        
        # Decode base64 image
        try:
            image_data = base64.b64decode(data["image"])
            image_array = np.frombuffer(image_data, dtype=np.uint8)
            img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
            
            if img is None:
                return jsonify({"success": False, "error": "Invalid image data"}), 400
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to decode image: {str(e)}"}), 400
        
        # Decode base64 audio and save to temp file
        try:
            audio_data = base64.b64decode(data["audio"])
            
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as audio_file:
                audio_file.write(audio_data)
                audio_path = audio_file.name
        except Exception as e:
            return jsonify({"success": False, "error": f"Failed to decode audio: {str(e)}"}), 400
        
        # Get inference engine
        engine = get_inference_engine()
        
        # Step 1: Detect face in image
        print("Detecting face...")
        bbox = engine.detect_face(img)
        
        if bbox is None:
            import os
            os.unlink(audio_path)
            return jsonify({"success": False, "error": "No face detected in image"}), 400
        
        x1, y1, x2, y2 = bbox
        face_img = img[y1:y2, x1:x2]
        
        print(f"Face detected: {bbox}")
        
        # Step 2: Convert audio to mel spectrogram
        print("Processing audio...")
        try:
            mel_chunks = engine.audio_to_mel_chunks(audio_path, fps=fps)
            print(f"Generated {len(mel_chunks)} mel chunks at {fps} FPS")
        except ValueError as e:
            import os
            os.unlink(audio_path)
            return jsonify({"success": False, "error": f"Audio processing failed: {str(e)}"}), 400
        
        # Validate minimum audio length
        if len(mel_chunks) == 0:
            import os
            os.unlink(audio_path)
            return jsonify({"success": False, "error": "Audio too short (minimum ~0.01s required)"}), 400
        
        # Step 3: Generate lip-synced frames
        print("Generating lip-synced frames...")
        lip_sync_frames = engine.generate_lip_sync(face_img, mel_chunks)
        print(f"Generated {len(lip_sync_frames)} frames")
        
        # Validate frames were generated
        if len(lip_sync_frames) == 0:
            import os
            os.unlink(audio_path)
            return jsonify({"success": False, "error": "Failed to generate lip-synced frames"}), 500
        
        # Step 4: Encode to video
        print("Encoding video...")
        video_base64 = encode_frames_to_video(lip_sync_frames, fps)
        
        # Cleanup
        import os
        os.unlink(audio_path)
        
        # Calculate duration
        duration = len(lip_sync_frames) / fps
        
        return jsonify({
            "success": True,
            "video": video_base64,
            "num_frames": len(lip_sync_frames),
            "duration": round(duration, 2),
            "fps": fps
        })
        
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in /api/generate: {error_trace}")
        return jsonify({
            "success": False,
            "error": str(e),
            "trace": error_trace
        }), 500

def encode_frames_to_video(frames: np.ndarray, fps: int = 25) -> str:
    """
    Encode frames to WebM video and return base64
    
    Args:
        frames: Array of frames (N, H, W, 3)
        fps: Frames per second
    
    Returns:
        Base64-encoded video
    
    Raises:
        ValueError: If frames array is empty
    """
    # Guard against empty frames
    if frames is None or len(frames) == 0:
        raise ValueError("Cannot encode video: no frames provided")
    
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as video_file:
        video_path = video_file.name
    
    try:
        # Get frame dimensions
        height, width = frames[0].shape[:2]
        
        # Create video writer (WebM with VP9 codec)
        fourcc = cv2.VideoWriter_fourcc(*'VP90')
        out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))
        
        if not out.isOpened():
            raise ValueError("Failed to open video writer")
        
        # Write all frames
        for frame in frames:
            out.write(frame)
        
        out.release()
        
        # Read video and encode to base64
        with open(video_path, 'rb') as f:
            video_data = f.read()
        
        if len(video_data) == 0:
            raise ValueError("Video encoding produced empty file")
        
        video_base64 = base64.b64encode(video_data).decode('utf-8')
        
        return video_base64
        
    finally:
        # Cleanup temp file
        import os
        if os.path.exists(video_path):
            os.unlink(video_path)

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        "message": "Wav2Lip Service",
        "phase": "5",
        "endpoints": {
            "/health": "Health check",
            "/api/generate": "Generate lip-synced video (POST)"
        }
    })

if __name__ == '__main__':
    import os
    # Use PORT from environment variable (Render requirement) or default to 5001
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"🚀 Starting Wav2Lip service on port {port}...")
    print(f"📍 Health check: http://localhost:{port}/health")
    print(f"📍 Generate API: http://localhost:{port}/api/generate (POST)")
    print(f"🔧 Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
