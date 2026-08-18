"""
سكربت رفع المشروع إلى Hugging Face Spaces
شغّله مرة واحدة فقط بعد وضع HF_TOKEN
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import os
from huggingface_hub import HfApi, create_repo

# ─── اضبط هذين المتغيرين ───────────────────────────────
HF_TOKEN    = os.environ.get("HF_TOKEN", "")   # ضع التوكن هنا أو عبر متغير البيئة
HF_USERNAME = os.environ.get("HF_USERNAME", "") # اسم المستخدم في HF
SPACE_NAME  = "arabic-ai-mvp"
# ────────────────────────────────────────────────────────

if not HF_TOKEN or not HF_USERNAME:
    print("=" * 55)
    print("  ERROR: يجب ضبط HF_TOKEN و HF_USERNAME")
    print()
    print("  طريقة 1: عبر متغيرات البيئة قبل التشغيل:")
    print("    $env:HF_TOKEN='hf_xxxx...'")
    print("    $env:HF_USERNAME='your_username'")
    print()
    print("  طريقة 2: عدّل هذا الملف مباشرةً وضع قيمهما")
    print("=" * 55)
    sys.exit(1)

REPO_ID   = f"{HF_USERNAME}/{SPACE_NAME}"
SPACE_DIR = os.path.dirname(os.path.abspath(__file__))

print(f"Deploying to: https://huggingface.co/spaces/{REPO_ID}")
print(f"Source dir  : {SPACE_DIR}")
print()

api = HfApi(token=HF_TOKEN)

# 1. أنشئ الـ Space إذا لم يكن موجوداً
print("[1/3] Creating/verifying Space...")
try:
    create_repo(
        repo_id=REPO_ID,
        repo_type="space",
        space_sdk="gradio",
        private=False,
        token=HF_TOKEN,
        exist_ok=True
    )
    print(f"      Space ready: {REPO_ID}")
except Exception as e:
    print(f"      Note: {e}")

# 2. ارفع جميع ملفات hf_space/
print("[2/3] Uploading files...")
api.upload_folder(
    folder_path=SPACE_DIR,
    repo_id=REPO_ID,
    repo_type="space",
    ignore_patterns=["*.pyc", "__pycache__", "*.log", "deploy_to_hf.py"],
    commit_message="Deploy: Arabic AI MVP - Initial upload"
)

# 3. اطبع الرابط
print()
print("[3/3] Done!")
print("=" * 55)
print(f"  Your Space is live at:")
print(f"  https://huggingface.co/spaces/{REPO_ID}")
print("=" * 55)
