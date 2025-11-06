"""
Download Wav2Lip models and helper scripts from OpenVINO notebooks
"""

import os
import requests
from pathlib import Path

# Base URL for OpenVINO notebooks
BASE_URL = "https://raw.githubusercontent.com/openvinotoolkit/openvino_notebooks/latest/notebooks/wav2lip"

# Helper files we need
HELPER_FILES = [
    "ov_wav2lip_helper.py",
    "ov_inference.py",
    "gradio_helper.py"
]

def download_file(url, dest_path):
    """Download a file from URL to destination"""
    print(f"Downloading {url}...")
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, 'wb') as f:
            f.write(response.content)
        print(f"✅ Downloaded to {dest_path}")
        return True
    except Exception as e:
        print(f"❌ Failed to download {url}: {e}")
        return False

def main():
    """Main download function"""
    script_dir = Path(__file__).parent
    
    print("=" * 60)
    print("Downloading OpenVINO Wav2Lip Helper Scripts")
    print("=" * 60)
    
    success_count = 0
    for helper_file in HELPER_FILES:
        url = f"{BASE_URL}/{helper_file}"
        dest = script_dir / helper_file
        if download_file(url, dest):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"Downloaded {success_count}/{len(HELPER_FILES)} files")
    print("=" * 60)
    
    if success_count == len(HELPER_FILES):
        print("\n✅ All helper scripts downloaded successfully!")
        print("Next step: Run the model conversion script")
        return True
    else:
        print("\n⚠️  Some files failed to download")
        return False

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
