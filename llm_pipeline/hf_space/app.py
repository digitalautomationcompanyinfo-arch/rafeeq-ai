import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import gradio as gr
import os
from pathlib import Path

# ──────────────────────────────────────────────
# تحميل النموذج
# ──────────────────────────────────────────────
MODEL_PATH = os.environ.get("MODEL_PATH", "../models/final/qlora_mvp")
USE_REAL_MODEL = Path(MODEL_PATH).exists()

if USE_REAL_MODEL:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    print(f"Loading model from {MODEL_PATH}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH, trust_remote_code=True)
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_PATH, torch_dtype=torch.float16, device_map="auto", trust_remote_code=True
    )
    model.eval()
    print("Real model loaded successfully.")
else:
    print("DEMO MODE: No trained model found at", MODEL_PATH)

# ──────────────────────────────────────────────
# دالة الاستجابة
# ──────────────────────────────────────────────
def respond(history, message, system_prompt, max_tokens, temperature):
    if not message.strip():
        return history, ""

    history = history or []
    # أضف رسالة المستخدم
    history.append({"role": "user", "content": message})

    if USE_REAL_MODEL:
        full_prompt = f"Instruction: {message}\nResponse:"
        inputs = tokenizer(full_prompt, return_tensors="pt").to(model.device)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=int(max_tokens),
                temperature=float(temperature),
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        reply = tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True
        )
    else:
        reply = (
            f"[وضع العرض التوضيحي]\n\n"
            f"استلمت رسالتك: \"{message}\"\n\n"
            "بعد اكتمال التدريب على Colab/NVIDIA، ستُستبدل هذه الاستجابة "
            "بإجابة حقيقية من نموذج Qwen2.5-14B المُدرَّب على بياناتك."
        )

    history.append({"role": "assistant", "content": reply})
    return history, ""

# ──────────────────────────────────────────────
# الواجهة — Gradio 6.x
# ──────────────────────────────────────────────
with gr.Blocks(title="Arabic AI MVP") as demo:

    gr.Markdown(f"""
# Arabic AI MVP — LLM Fine-tuned Demo
**النموذج:** Qwen2.5-14B + QLoRA (Apache 2.0) &nbsp;|&nbsp;
**الحالة:** {"✅ نموذج حقيقي" if USE_REAL_MODEL else "⏳ وضع العرض - في انتظار اكتمال التدريب"}
""")

    with gr.Row():
        with gr.Column(scale=3):
            system_prompt = gr.Textbox(
                value="أنت مساعد ذكاء اصطناعي مفيد ومتخصص.",
                label="System Prompt",
                lines=2
            )
        with gr.Column(scale=1):
            max_tokens  = gr.Slider(50, 1024, value=256, step=32,  label="Max Tokens")
            temperature = gr.Slider(0.1, 1.5,  value=0.7, step=0.05, label="Temperature")

    chatbot = gr.Chatbot(
        height=420,
        rtl=True,
        placeholder="ابدأ المحادثة...",
        layout="bubble"
    )

    with gr.Row():
        msg = gr.Textbox(
            placeholder="اكتب رسالتك هنا ثم اضغط Enter...",
            show_label=False,
            scale=4,
            submit_btn=True
        )
        clear_btn = gr.Button("مسح", variant="secondary", scale=1)

    gr.Examples(
        examples=[
            "ما هي فوائد الذكاء الاصطناعي في قطاع الصحة؟",
            "اشرح لي مفهوم الـ Fine-tuning بطريقة بسيطة.",
            "اكتب نصاً تسويقياً قصيراً لتطبيق ذكاء اصطناعي.",
        ],
        inputs=msg
    )

    msg.submit(
        respond,
        inputs=[chatbot, msg, system_prompt, max_tokens, temperature],
        outputs=[chatbot, msg]
    )
    clear_btn.click(lambda: ([], ""), outputs=[chatbot, msg])

    with gr.Accordion("معلومات النموذج", open=False):
        gr.Markdown("""
| المعلومة | القيمة |
|---|---|
| النموذج الأساسي | Qwen/Qwen2.5-14B |
| تقنية التدريب | QLoRA (4-bit NF4) |
| الترخيص | Apache 2.0 (تجاري) |
| عينات التدريب | 800 عينة (MVP baseline) |
""")

if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=int(os.environ.get("PORT", 7860)),
        share=False,
        show_error=True,
        theme=gr.themes.Soft(primary_hue="blue")
    )
