import os
import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from peft import LoraConfig, prepare_model_for_kbit_training, get_peft_model
from trl import SFTTrainer

# ==============================================================================
# Rafeeq AI - QLoRA Fine-Tuning Script
# سكربت تدريب نموذج "رفيق" المخصص لمنصة ليرنوف
# ==============================================================================

def train_rafeeq_model():
    print("[*] بدء تهيئة بيئة تدريب نموذج رفيق (Rafeeq MVP)...")

    # 1. إعدادات النموذج والبيانات
    model_name = "meta-llama/Meta-Llama-3-8B-Instruct" # يمكن تغييره إلى Gemma أو أي نموذج آخر
    dataset_name = "rafeeq_dataset.jsonl" # البيانات التي تم توليدها مسبقاً
    output_dir = "./rafeeq_qlora_model"

    if not os.path.exists(dataset_name):
        print(f"[-] خطأ: لم يتم العثور على ملف البيانات {dataset_name}. قم بتشغيل learnov_ai.py أولاً.")
        return

    # 2. إعدادات التكميم (Quantization) لتخفيف استهلاك الذاكرة (4-bit)
    print("[*] تحميل إعدادات BitsAndBytes (4-bit)...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )

    # 3. تحميل النموذج ومجزئ الكلمات (Tokenizer)
    print(f"[*] تحميل النموذج الأساسي: {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto"
    )

    # 4. إعداد النموذج لتدريب LoRA (Low-Rank Adaptation)
    model.gradient_checkpointing_enable()
    model = prepare_model_for_kbit_training(model)

    print("[*] حقن محولات LoRA في النموذج...")
    lora_config = LoraConfig(
        r=16, # Rank
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 5. تحميل ومعالجة البيانات
    print("[*] تجهيز مجموعة البيانات...")
    dataset = load_dataset("json", data_files=dataset_name, split="train")

    def format_chat_prompt(examples):
        # تحويل المحادثات إلى صيغة نصية يفهمها النموذج
        texts = []
        for msgs in examples['messages']:
            formatted = tokenizer.apply_chat_template(msgs, tokenize=False, add_generation_prompt=False)
            texts.append(formatted)
        return {'text': texts}

    dataset = dataset.map(format_chat_prompt, batched=True)

    # 6. إعدادات التدريب (Training Arguments)
    training_args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        optim="paged_adamw_32bit",
        save_steps=50,
        logging_steps=10,
        learning_rate=2e-4,
        fp16=True,
        max_grad_norm=0.3,
        max_steps=200, # للتدريب الفعلي يتم رفع هذا الرقم
        warmup_ratio=0.03,
        group_by_length=True,
        lr_scheduler_type="cosine"
    )

    # 7. بدء التدريب (Supervised Fine-Tuning)
    print("[*] بدء عملية التدريب (Fine-Tuning)...")
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=lora_config,
        dataset_text_field="text",
        max_seq_length=2048,
        tokenizer=tokenizer,
        args=training_args,
    )

    trainer.train()

    # 8. حفظ النموذج المدرب
    print("[+] تم التدريب بنجاح! جاري حفظ نموذج 'رفيق'...")
    trainer.model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print(f"[+] النموذج محفوظ في المسار: {output_dir}")

if __name__ == "__main__":
    train_rafeeq_model()
