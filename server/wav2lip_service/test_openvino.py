"""
Test OpenVINO installation and capabilities
"""

import sys

def test_openvino():
    """Test OpenVINO installation"""
    print("=" * 60)
    print("Testing OpenVINO Installation")
    print("=" * 60)
    
    # Test 1: Import OpenVINO
    print("\n[Test 1] Importing OpenVINO...")
    try:
        import openvino as ov
        print(f"✅ OpenVINO imported successfully")
        print(f"   Version: {ov.__version__}")
    except ImportError as e:
        print(f"❌ Failed to import OpenVINO: {e}")
        return False
    
    # Test 2: Initialize Core
    print("\n[Test 2] Initializing OpenVINO Core...")
    try:
        core = ov.Core()
        print(f"✅ OpenVINO Core initialized")
    except Exception as e:
        print(f"❌ Failed to initialize Core: {e}")
        return False
    
    # Test 3: List available devices
    print("\n[Test 3] Checking available devices...")
    try:
        devices = core.available_devices
        print(f"✅ Available devices: {devices}")
        
        if 'CPU' in devices:
            print(f"✅ CPU device detected (ready for inference)")
        else:
            print(f"⚠️  CPU device not found in: {devices}")
            
    except Exception as e:
        print(f"❌ Failed to get devices: {e}")
        return False
    
    # Test 4: Get CPU device properties
    print("\n[Test 4] Checking CPU device properties...")
    try:
        if 'CPU' in devices:
            # Get some basic CPU properties
            full_name = core.get_property("CPU", "FULL_DEVICE_NAME")
            print(f"✅ CPU Full Name: {full_name}")
        else:
            print(f"⚠️  Skipping CPU properties (device not available)")
    except Exception as e:
        print(f"⚠️  Could not get CPU properties: {e}")
    
    print("\n" + "=" * 60)
    print("✅ All OpenVINO tests passed!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_openvino()
    sys.exit(0 if success else 1)
