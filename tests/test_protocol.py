import struct

def test_segment_packing():
    val = 5
    packed = struct.pack("B", val)
    assert struct.unpack("B", packed)[0] == 5
