FROM python:3.9-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Piper
RUN curl -L https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz | tar -xz -C /usr/local/bin

# Download Piper models
RUN mkdir -p /app/models
RUN curl -L https://github.com/rhasspy/piper/releases/download/v1.0.0/en_US-lessac-medium.onnx -o /app/models/model.onnx && \
    curl -L https://github.com/rhasspy/piper/releases/download/v1.0.0/en_US-lessac-medium.onnx.json -o /app/models/model.onnx.json

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
