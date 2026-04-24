from flask import Flask, request, send_file
import subprocess
import os
import uuid

app = Flask(__name__)

@app.route('/tts', methods=['POST'])
def tts():
    data = request.json
    text = data.get('text', '')
    if not text:
        return {"error": "No text provided"}, 400

    output_filename = f"/tmp/{uuid.uuid4()}.wav"
    
    # Run piper
    # piper --model /app/models/model.onnx --output_file /tmp/out.wav
    command = f"echo '{text}' | /usr/local/bin/piper/piper --model /app/models/model.onnx --output_file {output_filename}"
    
    try:
        subprocess.run(command, shell=True, check=True)
        return send_file(output_filename, mimetype='audio/wav')
    except Exception as e:
        return {"error": str(e)}, 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
