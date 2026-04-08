import httpx
import asyncio

async def test_endpoints():
    print("Testing Backend API Endpoints...\n")

    history = [
        {"role": "user", "content": "I feel really unheard when people interrupt me."},
        {"role": "assistant", "content": "tell me more about that."},
        {"role": "user", "content": "It just makes me withdraw and avoid the conflict entirely."},
        {"role": "assistant", "content": "i understand. what would help you feel safe?"},
        {"role": "user", "content": "Just patience. And the other person being accountable for their words."},
        {"role": "assistant", "content": "is that hard to find?"},
        {"role": "user", "content": "It is, usually people just want to fix the problem without actually listening to me first."}
    ]

    async with httpx.AsyncClient() as client:
        # 1. Test /analyze
        print("[1] POST /analyze")
        res = await client.post("http://localhost:8000/analyze", json={
            "user_id": "test_user_1",
            "history": history
        }, timeout=80.0)
        
        analyze_data = res.json()
        print("Response:", analyze_data)
        
        traits = analyze_data.get("traits", {})
        
        # 2. Test /merge-traits
        print("\n[2] POST /merge-traits")
        existing_traits = {
            "conflict_style": "unknown",
            "values": ["honesty"]
        }
        res2 = await client.post("http://localhost:8000/merge-traits", json={
            "user_id": "test_user_1",
            "existing_traits": existing_traits,
            "new_traits": traits
        })
        
        merge_data = res2.json()
        print("Response:", merge_data)

        # 3. Test /compatibility
        print("\n[3] POST /compatibility")
        res3 = await client.post("http://localhost:8000/compatibility", json={
            "user_a_traits": merge_data.get("merged_traits", {}),
            "user_b_traits": {
                "conflict_style": "avoid",
                "values": ["accountability", "patience"],
                "communication_style": "reserved"
            }
        })
        
        compat_data = res3.json()
        print("Response:", compat_data)


if __name__ == "__main__":
    asyncio.run(test_endpoints())
