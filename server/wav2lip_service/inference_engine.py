"""
Wav2Lip Inference Engine
Encapsulates model loading and inference operations
"""

import sys
import numpy as np
import cv2
from pathlib import Path
import openvino as ov
import torch
import torch.nn.functional as F
from typing import Tuple, Optional
import os

# Add Wav2Lip to path - check multiple possible locations
possible_wav2lip_paths = [
    Path("/opt/Wav2Lip"),  # Docker build location (Render deployment)
    Path(__file__).parent / "Wav2Lip",  # Local directory (development)
    Path("/app/Wav2Lip"),  # Docker build location (legacy)
    Path(os.getcwd()) / "Wav2Lip",  # Current working directory
]

wav2lip_added = False
for wav2lip_path in possible_wav2lip_paths:
    if wav2lip_path.exists():
        sys.path.insert(0, str(wav2lip_path))
        print(f"✅ Found Wav2Lip at: {wav2lip_path}")
        wav2lip_added = True
        break

if not wav2lip_added:
    print(f"⚠️  Wav2Lip directory not found in expected locations:")
    for p in possible_wav2lip_paths:
        print(f"   - {p} (exists: {p.exists()})")
    print(f"   Current working directory: {os.getcwd()}")
    print(f"   __file__ location: {Path(__file__).parent}")

from Wav2Lip import audio as audio_module

class Wav2LipInferenceEngine:
    """Manages OpenVINO models and inference pipeline"""
    
    def __init__(self, models_dir: Optional[Path] = None):
        """Initialize inference engine and load models"""
        if models_dir is None:
            models_dir = Path(__file__).parent / "models"
        
        self.models_dir = models_dir
        self.core = ov.Core()
        
        # Load models
        print("Loading Wav2Lip inference models...")
        self._load_face_detection()
        self._load_wav2lip()
        print("✅ All models loaded successfully")
    
    def _load_face_detection(self):
        """Load face detection model"""
        model_path = self.models_dir / "face_detection.xml"
        self.face_detection_model = self.core.read_model(model_path)
        print(f"  ✅ Face detection model loaded")
    
    def _load_wav2lip(self):
        """Load Wav2Lip model"""
        model_path = self.models_dir / "wav2lip.xml"
        self.wav2lip_model = self.core.read_model(model_path)
        print(f"  ✅ Wav2Lip model loaded")
    
    def detect_face(self, img: np.ndarray, face_det_batch_size: int = 1) -> Optional[Tuple[int, int, int, int]]:
        """
        Detect face in image and return bounding box
        
        Args:
            img: Input image (BGR format)
            face_det_batch_size: Batch size for detection (default 1)
        
        Returns:
            Tuple of (x1, y1, x2, y2) or None if no face detected
        """
        # Compile model for CPU (cached after first call)
        if not hasattr(self, '_face_det_compiled'):
            self._face_det_compiled = self.core.compile_model(self.face_detection_model, "CPU")
        
        # Resize to detection size (multiples of 16 for stability)
        img_h, img_w = img.shape[:2]
        det_size = (768, 576)
        img_resized = cv2.resize(img, det_size)
        
        # Preprocess: subtract mean and transpose
        img_preprocessed = img_resized.astype(np.float32) - np.array([104, 117, 123])
        img_preprocessed = img_preprocessed.transpose(2, 0, 1)
        img_preprocessed = np.expand_dims(img_preprocessed, 0)
        
        # Run inference
        results = self._face_det_compiled({"x": img_preprocessed})
        
        # Process detection results
        olist = [torch.Tensor(results[i]) for i in range(12)]
        
        # Apply softmax to classification outputs
        for i in range(len(olist) // 2):
            olist[i * 2] = F.softmax(olist[i * 2], dim=1)
        
        olist = [oelem.data.cpu() for oelem in olist]
        
        # Decode bounding boxes
        bboxlist = []
        for i in range(len(olist) // 2):
            ocls, oreg = olist[i * 2], olist[i * 2 + 1]
            stride = 2 ** (i + 2)  # 4, 8, 16, 32, 64, 128
            
            # Find high-confidence detections
            poss = zip(*np.where(ocls[:, 1, :, :] > 0.5))
            
            for _, hindex, windex in poss:
                axc = stride / 2 + windex * stride
                ayc = stride / 2 + hindex * stride
                score = ocls[0, 1, hindex, windex]
                
                loc = oreg[0, :, hindex, windex].contiguous().view(1, 4)
                priors = torch.Tensor([[axc / 1.0, ayc / 1.0, stride * 4 / 1.0, stride * 4 / 1.0]])
                variances = [0.1, 0.2]
                
                # Decode bounding box
                box = self._decode_bbox(loc, priors, variances)
                x1, y1, x2, y2 = box[0] * 1.0
                bboxlist.append([x1, y1, x2, y2, score])
        
        if len(bboxlist) == 0:
            return None
        
        bboxlist = np.array(bboxlist)
        
        # Apply NMS
        keep = self._nms(bboxlist, 0.3)
        if len(keep) == 0:
            return None
        
        # Get highest confidence detection
        best_bbox = bboxlist[keep[0]]
        
        # Scale back to original image size
        scale_x = img_w / det_size[0]
        scale_y = img_h / det_size[1]
        
        x1 = int(best_bbox[0] * scale_x)
        y1 = int(best_bbox[1] * scale_y)
        x2 = int(best_bbox[2] * scale_x)
        y2 = int(best_bbox[3] * scale_y)
        
        return (x1, y1, x2, y2)
    
    def _decode_bbox(self, loc, priors, variances):
        """Decode bounding box from predictions"""
        boxes = torch.cat((
            priors[:, :2] + loc[:, :2] * variances[0] * priors[:, 2:],
            priors[:, 2:] * torch.exp(loc[:, 2:] * variances[1])
        ), 1)
        boxes[:, :2] -= boxes[:, 2:] / 2
        boxes[:, 2:] += boxes[:, :2]
        return boxes
    
    def _nms(self, dets, thresh):
        """Non-maximum suppression"""
        if len(dets) == 0:
            return []
        
        x1, y1, x2, y2, scores = dets[:, 0], dets[:, 1], dets[:, 2], dets[:, 3], dets[:, 4]
        areas = (x2 - x1 + 1) * (y2 - y1 + 1)
        order = scores.argsort()[::-1]
        
        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            
            w = np.maximum(0.0, xx2 - xx1 + 1)
            h = np.maximum(0.0, yy2 - yy1 + 1)
            ovr = w * h / (areas[i] + areas[order[1:]] - w * h)
            
            inds = np.where(ovr <= thresh)[0]
            order = order[inds + 1]
        
        return keep
    
    def audio_to_mel_chunks(self, audio_path: str, fps: int = 25) -> np.ndarray:
        """
        Convert audio file to mel spectrogram chunks synchronized with video FPS
        
        Args:
            audio_path: Path to audio file (WAV format)
            fps: Target video frames per second (affects chunk sampling rate)
        
        Returns:
            Array of mel chunks, shape (N, 80, 16)
        
        Raises:
            ValueError: If audio is too short to generate any chunks
        """
        # Load audio
        wav = audio_module.load_wav(audio_path, 16000)
        
        # Generate mel spectrogram
        mel = audio_module.melspectrogram(wav)
        
        # Check if mel spectrogram is long enough for at least one chunk
        if mel.shape[1] < 16:
            # Pad mel spectrogram to at least 16 time steps
            padding = 16 - mel.shape[1]
            mel = np.pad(mel, ((0, 0), (0, padding)), mode='edge')
        
        # Split into chunks synchronized with video FPS
        # Mel spectrogram has ~80 frames per second of audio
        # For FPS video frames per second, we advance by 80/FPS mel frames per video frame
        mel_chunks = []
        mel_step_size = 80. / fps  # mel frames to advance per video frame
        
        i = 0
        while True:
            start_idx = int(i * mel_step_size)
            if start_idx + 16 > mel.shape[1]:
                break
            mel_chunk = mel[:, start_idx:start_idx + 16]
            mel_chunks.append(mel_chunk)
            i += 1
        
        # Ensure at least one chunk (for very short audio)
        if len(mel_chunks) == 0:
            # Use the entire mel spectrogram, padded to 16 frames
            mel_chunk = mel[:, :16] if mel.shape[1] >= 16 else np.pad(mel, ((0, 0), (0, 16 - mel.shape[1])), mode='edge')
            mel_chunks.append(mel_chunk)
        
        chunks_array = np.array(mel_chunks)
        
        if len(chunks_array) == 0:
            raise ValueError("Failed to generate any mel chunks from audio")
        
        return chunks_array
    
    def generate_lip_sync(self, face_img: np.ndarray, mel_chunks: np.ndarray, 
                          batch_size: int = 16) -> np.ndarray:
        """
        Generate lip-synced frames
        
        Args:
            face_img: Face region image (will be resized to 96x96)
            mel_chunks: Mel spectrogram chunks, shape (N, 80, 16)
            batch_size: Number of frames to process at once
        
        Returns:
            Array of lip-synced frames, shape (N, 96, 96, 3)
        """
        # Compile model for CPU (cached after first call)
        if not hasattr(self, '_wav2lip_compiled'):
            self._wav2lip_compiled = self.core.compile_model(self.wav2lip_model, "CPU")
        
        # Prepare face region
        face_resized = cv2.resize(face_img, (96, 96))
        
        # Convert to RGB and normalize
        face_rgb = cv2.cvtColor(face_resized, cv2.COLOR_BGR2RGB)
        face_normalized = face_rgb.astype(np.float32) / 255.0
        
        # Generate frames in batches
        num_chunks = len(mel_chunks)
        output_frames = []
        
        for i in range(0, num_chunks, batch_size):
            batch_end = min(i + batch_size, num_chunks)
            batch_mel = mel_chunks[i:batch_end]
            batch_size_actual = len(batch_mel)
            
            # Prepare face sequences (current + previous frame, 6 channels total)
            # For simplicity, we'll use the same frame for both
            face_seq = np.concatenate([face_normalized, face_normalized], axis=-1)
            face_seq = face_seq.transpose(2, 0, 1)  # HWC -> CHW
            
            # Repeat for batch
            face_batch = np.tile(face_seq[np.newaxis, :, :, :], (batch_size_actual, 1, 1, 1))
            
            # Prepare audio batch
            audio_batch = batch_mel[:, np.newaxis, :, :]  # Add channel dim
            
            # Run inference
            results = self._wav2lip_compiled({
                "face_sequences": face_batch.astype(np.float32),
                "audio_sequences": audio_batch.astype(np.float32)
            })
            
            # Get output (first and only output)
            output = list(results.values())[0]
            
            # Convert back to images (CHW -> HWC, denormalize)
            for frame_idx in range(batch_size_actual):
                frame = output[frame_idx].transpose(1, 2, 0)  # CHW -> HWC
                frame = np.clip(frame * 255.0, 0, 255).astype(np.uint8)
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                output_frames.append(frame_bgr)
        
        return np.array(output_frames)
