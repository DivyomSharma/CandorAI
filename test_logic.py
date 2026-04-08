import asyncio
from backend.analysis import check_readiness
from backend.compatibility import score_compatibility

def run_tests():
    traits_a = {
        "emotional_depth": "deep",
        "values": ["honesty", "growth"],
        "communication_style": "expressive",
        "attachment": "secure",
        "empathy_level": "high",
        "emotional_regulation": "stable",
    }
    traits_b = {
        "emotional_depth": "deep",
        "values": ["honesty", "family"],
        "communication_style": "expressive",
        "attachment": "secure",
        "empathy_level": "high",
        "emotional_regulation": "stable",
    }
    
    print("Testing check_readiness:", check_readiness(traits_a))
    res = score_compatibility(traits_a, traits_b)
    print("Testing compatibility:", res)

if __name__ == "__main__":
    run_tests()
