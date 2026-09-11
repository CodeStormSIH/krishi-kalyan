import os
import json
import base64
from typing import Optional, Dict, Any

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

ANALYSIS_SYSTEM_PROMPT = """
You are an expert Mandi Agricultural Quality Assayer. 
Analyze the provided crop sample (image and/or physical metrics like moisture, foreign matter).
Evaluate the sample against standard FCI/Agmarknet Mandi procurement norms.

Return ONLY a valid JSON object matching this exact schema:
{
  "crop_name": "Wheat / Paddy / Mustard / etc.",
  "quality_grade": "Grade A" | "Grade B" | "Grade C" | "Rejected",
  "estimated_moisture_pct": 11.5,
  "foreign_matter_pct": 1.2,
  "broken_grains_pct": 2.0,
  "msp_multiplier_pct": 100,
  "summary_reason": "2-line technical summary of physical quality",
  "farmer_advisory": "Actionable advice for the farmer (e.g., dry for 4 hours before gate entry)",
  "provider_used": "Groq" | "Gemini"
}
"""

def analyze_with_groq(image_bytes: Optional[bytes], crop_name: str, notes: str) -> Optional[Dict[str, Any]]:
    if not GROQ_API_KEY:
        return None
    try:
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        
        content = [{"type": "text", "text": f"Crop: {crop_name}. Observations: {notes}"}]
        if image_bytes:
            b64_img = base64.b64encode(image_bytes).decode('utf-8')
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}
            })
            model_name = "llama-3.2-11b-vision-preview"
        else:
            model_name = "llama-3.3-70b-versatile"

        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": content}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            timeout=8.0
        )
        data = json.loads(response.choices[0].message.content)
        data["provider_used"] = "Groq"
        return data
    except Exception as e:
        print(f"[CROP ANALYZER] Groq failed or timed out: {e}. Switching to Gemini fallback...")
        return None

def analyze_with_gemini(image_bytes: Optional[bytes], crop_name: str, notes: str) -> Dict[str, Any]:
    if not GEMINI_API_KEY:
        raise ValueError("Neither Groq nor Gemini API keys are configured.")
    
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"{ANALYSIS_SYSTEM_PROMPT}\nInput: Crop: {crop_name}. Details: {notes}\nProvide JSON output only."
    contents = [prompt]
    
    if image_bytes:
        contents.append({
            "mime_type": "image/jpeg",
            "data": image_bytes
        })

    res = model.generate_content(contents)
    clean_text = res.text.strip().replace("```json", "").replace("```", "").strip()
    data = json.loads(clean_text)
    data["provider_used"] = "Gemini"
    return data

def run_crop_analysis(image_bytes: Optional[bytes], crop_name: str = "Wheat", notes: str = "") -> Dict[str, Any]:
    # 1. Primary Attempt: Groq (Ultra-low latency)
    result = analyze_with_groq(image_bytes, crop_name, notes)
    if result:
        return result
    
    # 2. Fallback: Gemini 1.5 Flash
    return analyze_with_gemini(image_bytes, crop_name, notes)
