"""
Download Wav2Lip models directly without huggingface-hub
"""

import os
import requests
from pathlib import Path
from tqdm import tqdm

def download_file_with_progress(url, dest_path):
    """Download file with progress bar"""
    print(f"\nDownloading {dest_path.name}...")
    print(f"From: {url}")
    
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(dest_path, 'wb') as f:
        if total_size == 0:
            f.write(response.content)
        else:
            downloaded = 0
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                percent = (downloaded / total_size) * 100
                print(f"\rProgress: {percent:.1f}% ({downloaded}/{total_size} bytes)", end='')
    
    print(f"\n✅ Downloaded: {dest_path}")
    return True

def main():
    """Download Wav2Lip models"""
    script_dir = Path(__file__).parent
    checkpoints_dir = script_dir / "checkpoints"
    checkpoints_dir.mkdir(exist_ok=True)
    
    print("=" * 60)
    print("Downloading Wav2Lip Models")
    print("=" * 60)
    
    # Model URLs
    models = {
        "face_detection.pth": "https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth",
        "wav2lip.pth": "https://huggingface.co/numz/wav2lip_studio/resolve/main/Wav2lip/wav2lip.pth"
    }
    
    for filename, url in models.items():
        dest_path = checkpoints_dir / filename
        
        if dest_path.exists():
            print(f"\n✓ {filename} already exists ({dest_path.stat().st_size} bytes)")
            continue
        
        try:
            download_file_with_progress(url, dest_path)
        except Exception as e:
            print(f"\n❌ Failed to download {filename}: {e}")
            return False
    
    print("\n" + "=" * 60)
    print("✅ All models downloaded successfully!")
    print("=" * 60)
    print(f"\nModels location: {checkpoints_dir}")
    print(f"Total files: {len(list(checkpoints_dir.glob('*.pth')))}")
    return True

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)
