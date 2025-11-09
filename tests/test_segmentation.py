import math
from src.shared.constants import MAX_IMAGE_DGRAM

def test_segment_count():
    size = 250000
    expected = math.ceil(size / MAX_IMAGE_DGRAM)
    assert expected > 0
