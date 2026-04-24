FROM python:3.9-slim

RUN apt-get update && apt-get install -y \
    curl \
    espeak-ng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Piper
RUN curl -L https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz | tar -xz -C /usr/local/bin

# Create directory for models
RUN mkdir -p /app/models

# Download a default model (en_US-lessac-medium)
RUN curl -L https://github.com/rhasspy/piper/releases/download/v1.0.0/en_US-lessac-medium.onnx -o /app/models/model.onnx && \
    curl -L https://github.com/rhasspy/piper/releases/download/v1.0.0/en_US-lessac-medium.onnx.json -o /app/models/model.onnx.json

COPY app.py .
RUN pip install flask

EXPOSE 5000

CMD ["python", "app.py"]
