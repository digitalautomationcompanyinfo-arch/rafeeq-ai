# NVIDIA GPU Docker Image for QLoRA Training
FROM nvcr.io/nvidia/pytorch:24.04-py3

# Set working directory
WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl wget \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY requirements.txt /workspace/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir \
    transformers>=4.40.0 \
    datasets>=2.16.0 \
    peft>=0.10.0 \
    trl>=0.8.0 \
    bitsandbytes>=0.43.0 \
    accelerate>=0.29.0 \
    scikit-learn>=1.3.0 \
    pandas>=2.0.0 \
    gradio>=4.44.0 \
    fastapi uvicorn

# Copy all project files
COPY . /workspace/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV TOKENIZERS_PARALLELISM=false
ENV CUDA_VISIBLE_DEVICES=0

# Default command: run training pipeline
CMD ["bash", "-c", "cd /workspace/scripts && python 02_data_prep.py && python 03_train_qlora.py"]
