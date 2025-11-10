import os
import base64
import tempfile
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from inference import Wav2LipInference

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize Wav2Lip inference engine
wav2lip_engine = None

def initialize_models():
    """Initialize the Wav2Lip inference engine"""
    global wav2lip_engine
    try:
        logger.info("Initializing Wav2Lip inference engine...")
        wav2lip_engine = Wav2LipInference()
        logger.info("Wav2Lip engine initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Wav2Lip engine: {e}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    models_available = wav2lip_engine is not None and wav2lip_engine.models_loaded
    return jsonify({
        'status': 'healthy' if models_available else 'degraded',
        'models_available': models_available,
        'service': 'wav2lip-openvino'
    }), 200 if models_available else 503

@app.route('/api/generate', methods=['POST'])
def generate_video():
    """Generate lip-synced video from image and audio"""
    if not wav2lip_engine or not wav2lip_engine.models_loaded:
        return jsonify({
            'error': 'Wav2Lip models not loaded',
            'details': 'Service is initializing or models are missing'
        }), 503

    try:
        data = request.get_json()
        
        if not data or 'image' not in data or 'audio' not in data:
            return jsonify({
                'error': 'Missing required fields',
                'details': 'Both image and audio (base64) are required'
            }), 400

        # Decode base64 image and audio
        try:
            image_data = base64.b64decode(data['image'].split(',')[1] if ',' in data['image'] else data['image'])
            audio_data = base64.b64decode(data['audio'].split(',')[1] if ',' in data['audio'] else data['audio'])
        except Exception as e:
            return jsonify({
                'error': 'Invalid base64 encoding',
                'details': str(e)
            }), 400

        # Save to temporary files
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as img_file:
            img_file.write(image_data)
            image_path = img_file.name

        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as audio_file:
            audio_file.write(audio_data)
            audio_path = audio_file.name

        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as output_file:
            output_path = output_file.name

        try:
            # Generate lip-synced video
            logger.info(f"Generating video: image={len(image_data)} bytes, audio={len(audio_data)} bytes")
            
            wav2lip_engine.generate(
                image_path=image_path,
                audio_path=audio_path,
                output_path=output_path,
                fps=data.get('fps', 25)
            )

            # Read generated video and encode as base64
            with open(output_path, 'rb') as video_file:
                video_data = video_file.read()
                video_base64 = base64.b64encode(video_data).decode('utf-8')

            logger.info(f"Video generated successfully: {len(video_data)} bytes")

            return jsonify({
                'success': True,
                'video': f'data:video/mp4;base64,{video_base64}',
                'size': len(video_data)
            }), 200

        finally:
            # Clean up temporary files
            for path in [image_path, audio_path, output_path]:
                try:
                    if os.path.exists(path):
                        os.remove(path)
                except Exception as e:
                    logger.warning(f"Failed to remove temp file {path}: {e}")

    except Exception as e:
        logger.error(f"Error generating video: {e}", exc_info=True)
        return jsonify({
            'error': 'Video generation failed',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    # Initialize models on startup
    if not initialize_models():
        logger.error("Failed to initialize models - service will run in degraded mode")
    
    # Get port from environment variable (for Render/Docker)
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
