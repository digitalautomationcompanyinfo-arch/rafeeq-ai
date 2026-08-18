import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

def train_qlora(model_name="Qwen/Qwen2.5-14B", data_dir="../data/processed", output_dir="../models/checkpoints"):
    print(f"Loading tokenizer for {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print("Configuring 4-bit quantization (QLoRA)...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16
    )

    print(f"Loading model {model_name}...")
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True
    )
    
    # Prepare model for k-bit training
    model = prepare_model_for_kbit_training(model)

    print("Configuring LoRA...")
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"]
    )
    
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    print(f"Loading datasets from {data_dir}...")
    train_dataset = load_dataset("json", data_files=os.path.join(data_dir, "train.jsonl"), split="train")
    val_dataset = load_dataset("json", data_files=os.path.join(data_dir, "val.jsonl"), split="train")

    def format_prompt(example):
        return f"Instruction: {example['prompt']}\nResponse: {example['completion']}"
    
    print("Setting up training arguments...")
    training_args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        optim="paged_adamw_32bit",
        save_steps=50, # Save frequently for Colab interruptions
        logging_steps=10,
        learning_rate=2e-4,
        max_grad_norm=0.3,
        max_steps=200, # Small number of steps for MVP baseline test
        warmup_ratio=0.03,
        lr_scheduler_type="constant",
        evaluation_strategy="steps",
        eval_steps=50,
        fp16=True,
        report_to="none" # Disable wandb for MVP
    )

    print("Initializing SFTTrainer...")
    trainer = SFTTrainer(
        model=model,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        peft_config=peft_config,
        dataset_text_field=None,
        formatting_func=format_prompt,
        max_seq_length=512,
        tokenizer=tokenizer,
        args=training_args,
    )

    print("Starting training...")
    trainer.train()

    final_model_path = "../models/final/qlora_mvp"
    print(f"Saving final model to {final_model_path}...")
    trainer.model.save_pretrained(final_model_path)
    tokenizer.save_pretrained(final_model_path)
    print("Training pipeline completed successfully.")

if __name__ == "__main__":
    # For MVP we can use Mistral-Nemo-12B or Qwen2.5-14B or a smaller model like Qwen2.5-7B if 12B/14B OOMs on free T4
    # The user asked for 13B+ but free colab might struggle with 13B QLoRA.
    # Qwen/Qwen2.5-14B in 4-bit needs ~9GB VRAM + activations, which might just fit on a 15GB T4.
    train_qlora(model_name="Qwen/Qwen2.5-14B")
