"""
Convert Wav2Lip PyTorch models to OpenVINO IR format
"""

import sys
import torch
import numpy as np
from pathlib import Path
import openvino as ov

# Add Wav2Lip to path
sys.path.insert(0, str(Path(__file__).parent / "Wav2Lip"))

from models.wav2lip import Wav2Lip
from face_detection.detection.sfd.net_s3fd import s3fd

def load_wav2lip_model(checkpoint_path):
    """Load Wav2Lip model from checkpoint"""
    print(f"Loading Wav2Lip from: {checkpoint_path}")
    model = Wav2Lip()
    checkpoint = torch.load(checkpoint_path, map_location='cpu')
    
    # Remove 'module.' prefix if present
    state_dict = checkpoint.get("state_dict", checkpoint)
    new_state_dict = {}
    for k, v in state_dict.items():
        new_state_dict[k.replace("module.", "")] = v
    
    model.load_state_dict(new_state_dict)
    model.eval()
    print("✅ Wav2Lip model loaded")
    return model

def convert_face_detection(checkpoint_path, output_path):
    """Convert face detection model to OpenVINO"""
    print("\n" + "=" * 60)
    print("Converting Face Detection Model")
    print("=" * 60)
    
    if output_path.exists():
        print(f"✓ {output_path} already exists, skipping...")
        return True
    
    print(f"Loading face detection weights from: {checkpoint_path}")
    model_weights = torch.load(checkpoint_path, map_location='cpu')
    
    face_detector = s3fd()
    face_detector.load_state_dict(model_weights)
    face_detector.eval()
    print("✅ Face detection model loaded")
    
    # Create dummy input
    dummy_input = torch.FloatTensor(np.random.rand(1, 3, 768, 576))
    
    print("Converting to OpenVINO IR format...")
    ov_model = ov.convert_model(face_detector, example_input=dummy_input)
    
    print(f"Saving to: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ov.save_model(ov_model, output_path)
    
    print(f"✅ Face detection model converted: {output_path}")
    return True

def convert_wav2lip(checkpoint_path, output_path):
    """Convert Wav2Lip model to OpenVINO"""
    print("\n" + "=" * 60)
    print("Converting Wav2Lip Model")
    print("=" * 60)
    
    if output_path.exists():
        print(f"✓ {output_path} already exists, skipping...")
        return True
    
    model = load_wav2lip_model(checkpoint_path)
    
    # Create dummy inputs matching Wav2Lip architecture
    img_batch = torch.FloatTensor(np.random.rand(123, 6, 96, 96))
    mel_batch = torch.FloatTensor(np.random.rand(123, 1, 80, 16))
    
    print("Converting to OpenVINO IR format...")
    example_inputs = {"audio_sequences": mel_batch, "face_sequences": img_batch}
    ov_model = ov.convert_model(model, example_input=example_inputs)
    
    print(f"Saving to: {output_path}")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ov.save_model(ov_model, output_path)
    
    print(f"✅ Wav2Lip model converted: {output_path}")
    return True

def main():
    """Main conversion function"""
    script_dir = Path(__file__).parent
    checkpoints_dir = script_dir / "checkpoints"
    models_dir = script_dir / "models"
    
    print("=" * 60)
    print("Wav2Lip Model Conversion to OpenVINO")
    print("=" * 60)
    
    # Convert face detection
    try:
        convert_face_detection(
            checkpoints_dir / "face_detection.pth",
            models_dir / "face_detection.xml"
        )
    except Exception as e:
        print(f"\n❌ Face detection conversion failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Convert Wav2Lip
    try:
        convert_wav2lip(
            checkpoints_dir / "wav2lip.pth",
            models_dir / "wav2lip.xml"
        )
    except Exception as e:
        print(f"\n❌ Wav2Lip conversion failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("\n" + "=" * 60)
    print("✅ All models converted successfully!")
    print("=" * 60)
    print(f"\nOpenVINO models location: {models_dir}")
    print(f"Files created:")
    for xml_file in models_dir.glob("*.xml"):
        bin_file = xml_file.with_suffix(".bin")
        print(f"  - {xml_file.name} ({xml_file.stat().st_size / 1024:.1f} KB)")
        print(f"  - {bin_file.name} ({bin_file.stat().st_size / 1024 / 1024:.1f} MB)")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
