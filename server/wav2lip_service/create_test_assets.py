"""
Create simple test assets for Wav2Lip inference testing
"""

import numpy as np
import cv2
from pathlib import Path

def create_test_image():
    """Create a simple test face image"""
    print("Creating test face image...")
    
    # Create a 720x576 image (standard resolution)
    img = np.ones((576, 720, 3), dtype=np.uint8) * 240
    
    # Draw a simple face representation
    # Face oval
    cv2.ellipse(img, (360, 288), (120, 160), 0, 0, 360, (200, 180, 160), -1)
    
    # Eyes
    cv2.circle(img, (320, 240), 15, (50, 50, 50), -1)
    cv2.circle(img, (400, 240), 15, (50, 50, 50), -1)
    
    # Nose
    pts = np.array([[360, 280], [350, 320], [370, 320]], np.int32)
    cv2.fillPoly(img, [pts], (150, 130, 110))
    
    # Mouth region (key area for Wav2Lip)
    cv2.ellipse(img, (360, 370), (50, 30), 0, 0, 360, (150, 100, 100), -1)
    
    output_path = Path(__file__).parent / "test_assets" / "test_face.jpg"
    cv2.imwrite(str(output_path), img)
    print(f"✅ Test face image created: {output_path}")
    return output_path

def create_test_audio():
    """Create a simple test audio waveform"""
    print("Creating test audio file...")
    
    # We'll create a very simple audio file using librosa
    try:
        import librosa
        import soundfile as sf
        
        # Generate 2 seconds of audio at 16kHz (standard for speech)
        sr = 16000
        duration = 2.0
        
        # Create a simple tone pattern (simulating speech-like frequency)
        t = np.linspace(0, duration, int(sr * duration))
        # Mix of frequencies to simulate speech
        audio = 0.3 * np.sin(2 * np.pi * 200 * t)  # Base frequency
        audio += 0.2 * np.sin(2 * np.pi * 400 * t)  # Harmonic
        audio += 0.1 * np.sin(2 * np.pi * 800 * t)  # Higher harmonic
        
        # Add some amplitude modulation to simulate speech rhythm
        modulation = 0.5 + 0.5 * np.sin(2 * np.pi * 2 * t)
        audio = audio * modulation
        
        output_path = Path(__file__).parent / "test_assets" / "test_audio.wav"
        sf.write(str(output_path), audio, sr)
        print(f"✅ Test audio created: {output_path} ({duration}s @ {sr}Hz)")
        return output_path
        
    except ImportError:
        print("⚠️  soundfile not available, skipping audio creation")
        return None

def main():
    """Create all test assets"""
    print("=" * 60)
    print("Creating Test Assets for Wav2Lip")
    print("=" * 60)
    
    assets_dir = Path(__file__).parent / "test_assets"
    assets_dir.mkdir(exist_ok=True)
    
    image_path = create_test_image()
    audio_path = create_test_audio()
    
    print("\n" + "=" * 60)
    print("✅ Test assets created successfully!")
    print("=" * 60)
    print(f"\nAssets location: {assets_dir}")
    print(f"  - Image: {image_path.name}")
    if audio_path:
        print(f"  - Audio: {audio_path.name}")
    
    return True

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
