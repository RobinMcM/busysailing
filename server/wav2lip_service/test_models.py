"""
Test that OpenVINO models load correctly
"""

import openvino as ov
from pathlib import Path

def test_model_loading():
    """Test loading OpenVINO IR models"""
    print("=" * 60)
    print("Testing OpenVINO Model Loading")
    print("=" * 60)
    
    models_dir = Path(__file__).parent / "models"
    core = ov.Core()
    
    models = {
        "Face Detection": models_dir / "face_detection.xml",
        "Wav2Lip": models_dir / "wav2lip.xml"
    }
    
    for name, model_path in models.items():
        print(f"\n[{name}]")
        print(f"  Path: {model_path}")
        
        if not model_path.exists():
            print(f"  ❌ Model file not found!")
            return False
        
        bin_path = model_path.with_suffix(".bin")
        if not bin_path.exists():
            print(f"  ❌ Weights file not found: {bin_path}")
            return False
        
        try:
            model = core.read_model(model_path)
            print(f"  ✅ Model loaded successfully")
            print(f"  Inputs: {len(model.inputs)}")
            print(f"  Outputs: {len(model.outputs)}")
            
            # Try to compile for CPU
            compiled = core.compile_model(model, "CPU")
            print(f"  ✅ Compiled for CPU inference")
            
        except Exception as e:
            print(f"  ❌ Failed to load: {e}")
            return False
    
    print("\n" + "=" * 60)
    print("✅ All models loaded and compiled successfully!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    import sys
    success = test_model_loading()
    sys.exit(0 if success else 1)
