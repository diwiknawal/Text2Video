from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
import os
import subprocess
import uuid
import json
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
SD_URL = os.getenv("SD_URL", "http://stable-diffusion:7860")
ASSETS_DIR = "/app/assets"

os.makedirs(ASSETS_DIR, exist_ok=True)
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

class ScriptRequest(BaseModel):
    script: str

@app.get("/")
def read_root():
    return {"message": "Text-To-Video Backend is running"}

@app.post("/generate-scenes")
async def generate_scenes(request: ScriptRequest):
    # Use double braces {{ }} to escape them in an f-string
    prompt = f"""
    Break down the following script into scenes for a video.
    Return ONLY a JSON array of objects with keys "image_prompt" and "narration".
    Example: [{{ "image_prompt": "a sunset", "narration": "Hello world" }}]
    
    Script: {request.script}
    """
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        for model in ["llama3", "phi3"]:
            try:
                print(f"Attempting scene generation with {model}...")
                response = await client.post(f"{OLLAMA_URL}/api/generate", json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "format": "json"
                })
                
                if response.status_code == 200:
                    result = response.json()
                    raw_response = result["response"].strip()
                    if not raw_response.startswith("["):
                        start = raw_response.find("[")
                        end = raw_response.rfind("]") + 1
                        if start != -1 and end != -1:
                            raw_response = raw_response[start:end]
                    
                    scenes = json.loads(raw_response)
                    return {"scenes": scenes}
                else:
                    print(f"Ollama ({model}) error: {response.status_code}")
            except Exception as e:
                print(f"Backend error with {model}: {str(e)}")
                continue
        
        raise HTTPException(status_code=500, detail="Failed to call Ollama models. Please ensure they are fully pulled.")

@app.post("/generate-assets")
async def generate_assets(scene: dict):
    scene_id = str(uuid.uuid4())
    image_prompt = scene.get("image_prompt")
    narration = scene.get("narration")
    
    image_path = os.path.join(ASSETS_DIR, f"{scene_id}.png")
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            sd_response = await client.post(f"{SD_URL}/sdapi/v1/txt2img", json={
                "prompt": image_prompt,
                "steps": 20,
                "width": 512,
                "height": 512
            })
            if sd_response.status_code == 200:
                img_data = sd_response.json()["images"][0]
                with open(image_path, "wb") as f:
                    f.write(base64.b64decode(img_data))
            else:
                subprocess.run(f"ffmpeg -f lavfi -i color=c=black:s=512x512 -frames:v 1 {image_path} -y", shell=True)
        except:
            subprocess.run(f"ffmpeg -f lavfi -i color=c=black:s=512x512 -frames:v 1 {image_path} -y", shell=True)

    audio_path = os.path.join(ASSETS_DIR, f"{scene_id}.wav")
    try:
        piper_command = f"echo '{narration}' | /usr/local/bin/piper/piper --model /app/models/model.onnx --output_file {audio_path}"
        subprocess.run(piper_command, shell=True, check=True)
    except Exception as e:
        subprocess.run(f"ffmpeg -f lavfi -i anullsrc=r=22050:cl=mono -t 3 {audio_path} -y", shell=True)
    
    return {"image_url": f"/assets/{scene_id}.png", "audio_url": f"/assets/{scene_id}.wav", "scene_id": scene_id}

@app.post("/assemble-video")
async def assemble_video(assets: list):
    output_id = str(uuid.uuid4())
    output_path = os.path.join(ASSETS_DIR, f"{output_id}.mp4")
    
    scene_files = []
    for asset in assets:
        scene_id = asset["scene_id"]
        img = os.path.join(ASSETS_DIR, f"{scene_id}.png")
        aud = os.path.join(ASSETS_DIR, f"{scene_id}.wav")
        scene_video = os.path.join(ASSETS_DIR, f"{scene_id}.mp4")
        
        cmd = f"ffmpeg -loop 1 -i {img} -i {aud} -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest {scene_video} -y"
        subprocess.run(cmd, shell=True, check=True)
        scene_files.append(scene_video)
    
    list_path = os.path.join(ASSETS_DIR, f"{output_id}_list.txt")
    with open(list_path, "w") as f:
        for s in scene_files:
            f.write(f"file '{os.path.basename(s)}'\n")
    
    concat_cmd = f"ffmpeg -f concat -safe 0 -i {list_path} -c copy {output_path} -y"
    subprocess.run(concat_cmd, shell=True, check=True)
    
    return {"video_url": f"/assets/{output_id}.mp4"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
