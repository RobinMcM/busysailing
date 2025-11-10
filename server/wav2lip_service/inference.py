import os
import cv2
import numpy as np
import librosa
import soundfile as sf
from openvino.runtime import Core
import logging

logger = logging.getLogger(__name__)

class Wav2LipInference:
    """OpenVINO-optimized Wav2Lip inference engine"""
    
    def __init__(self, models_dir='/app/models'):
        self.models_dir = models_dir
        self.models_loaded = False
        self.ie = Core()
        
        # Model paths
        self.model_path = os.path.join(models_dir, 'wav2lip.xml')
        self.weights_path = os.path.join(models_dir, 'wav2lip.bin')
        
        # Load models
        self._load_models()
    
    def _load_models(self):
        """Load OpenVINO models"""
        try:
            if not os.path.exists(self.model_path):
                logger.error(f"Model file not found: {self.model_path}")
                return
            
            if not os.path.exists(self.weights_path):
                logger.error(f"Weights file not found: {self.weights_path}")
                return
            
            logger.info(f"Loading Wav2Lip model from {self.model_path}")
            self.model = self.ie.read_model(model=self.model_path)
            self.compiled_model = self.ie.compile_model(model=self.model, device_name="CPU")
            
            # Get input/output info
            self.input_layer = self.compiled_model.input(0)
            self.output_layer = self.compiled_model.output(0)
            
            logger.info(f"Model loaded successfully on CPU")
            logger.info(f"Input shape: {self.input_layer.shape}")
            logger.info(f"Output shape: {self.output_layer.shape}")
            
            self.models_loaded = True
            
        except Exception as e:
            logger.error(f"Failed to load models: {e}", exc_info=True)
            self.models_loaded = False
    
    def _preprocess_image(self, image_path, target_size=(96, 96)):
        """Load and preprocess face image"""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to load image: {image_path}")
        
        # Resize to target size
        img = cv2.resize(img, target_size)
        
        # Convert BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Normalize to [-1, 1]
        img = img.astype(np.float32) / 127.5 - 1.0
        
        return img
    
    def _preprocess_audio(self, audio_path, fps=25):
        """Load and preprocess audio into mel spectrograms"""
        # Load audio
        audio, sr = librosa.load(audio_path, sr=16000)
        
        # Calculate mel spectrogram
        mel = librosa.feature.melspectrogram(
            y=audio,
            sr=sr,
            n_fft=800,
            hop_length=200,
            n_mels=80
        )
        
        # Convert to log scale
        mel = librosa.power_to_db(mel, ref=np.max)
        
        # Normalize
        mel = (mel - mel.min()) / (mel.max() - mel.min() + 1e-8)
        
        # Split into chunks based on FPS
        # Each video frame needs a corresponding mel chunk
        chunk_size = 16  # Standard for Wav2Lip
        mel_chunks = []
        
        for i in range(0, mel.shape[1], chunk_size):
            chunk = mel[:, i:i+chunk_size]
            if chunk.shape[1] < chunk_size:
                # Pad last chunk
                chunk = np.pad(chunk, ((0, 0), (0, chunk_size - chunk.shape[1])), mode='edge')
            mel_chunks.append(chunk)
        
        return np.array(mel_chunks), len(audio) / sr
    
    def generate(self, image_path, audio_path, output_path, fps=25):
        """Generate lip-synced video"""
        if not self.models_loaded:
            raise RuntimeError("Models not loaded")
        
        logger.info("Starting video generation...")
        
        # Preprocess inputs
        face_img = self._preprocess_image(image_path)
        mel_chunks, audio_duration = self._preprocess_audio(audio_path, fps)
        
        num_frames = len(mel_chunks)
        logger.info(f"Processing {num_frames} frames for {audio_duration:.2f}s audio")
        
        # Initialize video writer
        frame_h, frame_w = 96, 96  # Output resolution
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        video_writer = cv2.VideoWriter(output_path, fourcc, fps, (frame_w, frame_h))
        
        try:
            # Generate frames
            for idx, mel_chunk in enumerate(mel_chunks):
                # Prepare input batch
                # Wav2Lip expects: [batch, channels, height, width, mel_frames]
                face_batch = np.expand_dims(face_img.transpose(2, 0, 1), axis=0)  # [1, 3, 96, 96]
                mel_batch = np.expand_dims(mel_chunk, axis=0)  # [1, 80, 16]
                
                # Concatenate inputs (model-specific format)
                # This is a simplified version - actual Wav2Lip model may need different input format
                input_data = np.concatenate([face_batch, np.expand_dims(mel_batch, axis=(2, 3))], axis=1)
                
                # Run inference
                result = self.compiled_model([input_data])[self.output_layer]
                
                # Post-process output frame
                frame = result[0].transpose(1, 2, 0)  # [96, 96, 3]
                frame = ((frame + 1.0) * 127.5).clip(0, 255).astype(np.uint8)
                frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                
                # Write frame
                video_writer.write(frame)
                
                if (idx + 1) % 10 == 0:
                    logger.info(f"Processed {idx + 1}/{num_frames} frames")
            
            logger.info("Video frames generated successfully")
            
        finally:
            video_writer.release()
        
        # Add audio to video
        self._add_audio_to_video(output_path, audio_path)
        
        logger.info(f"Video saved to {output_path}")
    
    def _add_audio_to_video(self, video_path, audio_path):
        """Add audio track to generated video using ffmpeg"""
        import subprocess
        
        temp_output = video_path + '.temp.mp4'
        
        try:
            cmd = [
                'ffmpeg', '-y',
                '-i', video_path,
                '-i', audio_path,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-strict', 'experimental',
                '-shortest',
                temp_output
            ]
            
            subprocess.run(cmd, check=True, capture_output=True)
            
            # Replace original with combined video
            os.replace(temp_output, video_path)
            
        except subprocess.CalledProcessError as e:
            logger.warning(f"ffmpeg failed, video will have no audio: {e}")
            # Clean up temp file if it exists
            if os.path.exists(temp_output):
                os.remove(temp_output)
        except FileNotFoundError:
            logger.warning("ffmpeg not found, video will have no audio")
