"""
Test the /api/generate endpoint
"""

import requests
import base64
from pathlib import Path
import json

def test_generate_endpoint():
    """Test the /api/generate endpoint with test assets"""
    print("=" * 60)
    print("Testing /api/generate Endpoint")
    print("=" * 60)
    
    # Read test assets
    assets_dir = Path(__file__).parent / "test_assets"
    image_path = assets_dir / "test_face.jpg"
    audio_path = assets_dir / "test_audio.wav"
    
    if not image_path.exists():
        print(f"❌ Test image not found: {image_path}")
        return False
    
    if not audio_path.exists():
        print(f"❌ Test audio not found: {audio_path}")
        return False
    
    # Encode to base64
    with open(image_path, 'rb') as f:
        image_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    with open(audio_path, 'rb') as f:
        audio_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    print(f"✅ Image loaded ({len(image_base64)} chars base64)")
    print(f"✅ Audio loaded ({len(audio_base64)} chars base64)")
    
    # Prepare request
    payload = {
        "image": image_base64,
        "audio": audio_base64,
        "fps": 25
    }
    
    # Make request
    url = "http://localhost:5001/api/generate"
    print(f"\nSending POST request to {url}...")
    
    try:
        response = requests.post(url, json=payload, timeout=120)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get("success"):
                print("\n✅ Success!")
                print(f"  Num frames: {result.get('num_frames')}")
                print(f"  Duration: {result.get('duration')}s")
                print(f"  FPS: {result.get('fps')}")
                print(f"  Video size: {len(result.get('video', ''))} chars base64")
                
                # Optionally save video
                if result.get('video'):
                    output_path = assets_dir / "output_lip_sync.webm"
                    video_data = base64.b64decode(result['video'])
                    with open(output_path, 'wb') as f:
                        f.write(video_data)
                    print(f"\n💾 Video saved to: {output_path}")
                
                return True
            else:
                print(f"\n❌ Request failed: {result.get('error')}")
                if 'trace' in result:
                    print(f"Trace: {result['trace']}")
                return False
        else:
            print(f"\n❌ HTTP {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection failed - is the Flask service running?")
        print("Start it with: cd server/wav2lip_service && python app.py")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_generate_endpoint()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ API test passed!")
    else:
        print("❌ API test failed")
    print("=" * 60)
    
    import sys
    sys.exit(0 if success else 1)
