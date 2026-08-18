"""
سكربت التحقق من صحة الـ Pipeline بالكامل
يعمل محلياً بدون GPU - يتحقق من البيانات والهيكلة الكاملة
"""
import sys, io, pandas as pd, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")
MODELS_DIR = os.path.join(BASE_DIR, "models")
LOGS_DIR = os.path.join(BASE_DIR, "logs")

SEPARATOR = "=" * 55

def check_dir(path, name):
    exists = os.path.isdir(path)
    status = "✅" if exists else "❌"
    print(f"  {status} {name}: {path}")
    return exists

def load_jsonl(path):
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]

def main():
    print(f"\n{SEPARATOR}")
    print("   🚀  فحص شامل لـ Pipeline المشروع  🚀")
    print(SEPARATOR)

    # 1. تحقق من الهيكلة
    print("\n📁 [1] هيكلة المجلدات:")
    dirs = {
        "data/raw":            RAW_DIR,
        "data/processed":      DATA_DIR,
        "models/checkpoints":  os.path.join(MODELS_DIR, "checkpoints"),
        "models/final":        os.path.join(MODELS_DIR, "final"),
        "scripts":             os.path.join(BASE_DIR, "scripts"),
        "logs":                LOGS_DIR,
    }
    all_ok = all(check_dir(v, k) for k, v in dirs.items())
    print(f"  {'✅ جميع المجلدات موجودة!' if all_ok else '⚠️ بعض المجلدات ناقصة'}")

    # 2. تحقق من البيانات المعالجة
    print(f"\n📊 [2] ملفات البيانات المعالجة:")
    splits = {}
    for split in ["train", "val", "test"]:
        fpath = os.path.join(DATA_DIR, f"{split}.jsonl")
        if os.path.exists(fpath):
            data = load_jsonl(fpath)
            size_kb = os.path.getsize(fpath) / 1024
            splits[split] = data
            print(f"  ✅ {split}.jsonl — {len(data):>4} عينة | {size_kb:.1f} KB")
        else:
            print(f"  ❌ {split}.jsonl — غير موجود")

    # 3. إحصائيات المحتوى
    if "train" in splits:
        print(f"\n🔍 [3] إحصائيات محتوى ملف التدريب:")
        df = pd.DataFrame(splits["train"])
        df["prompt_len"] = df["prompt"].str.len()
        df["completion_len"] = df["completion"].str.len()
        print(f"  - متوسط طول الـ prompt:     {df['prompt_len'].mean():.1f} حرف")
        print(f"  - متوسط طول الـ completion: {df['completion_len'].mean():.1f} حرف")
        print(f"  - أطول prompt:              {df['prompt_len'].max()} حرف")
        print(f"  - أقصر prompt:              {df['prompt_len'].min()} حرف")
        print(f"\n  📝 عينة عشوائية من ملف التدريب:")
        sample = df.sample(2, random_state=1)[["prompt","completion"]].to_dict("records")
        for i, row in enumerate(sample, 1):
            print(f"     [{i}] prompt: {row['prompt']}")
            print(f"         completion: {row['completion']}")

    # 4. ملفات السكربتات
    print(f"\n📜 [4] ملفات السكربتات:")
    scripts = [
        "01_gdrive_sync.py",
        "02_data_prep.py",
        "03_train_qlora.py",
        "04_verify_pipeline.py",
    ]
    for s in scripts:
        spath = os.path.join(BASE_DIR, "scripts", s)
        size = os.path.getsize(spath) / 1024 if os.path.exists(spath) else 0
        status = "✅" if os.path.exists(spath) else "❌"
        print(f"  {status} {s:<30} {size:.1f} KB")

    # 5. ملخص نهائي
    total_samples = sum(len(v) for v in splits.values())
    print(f"\n{SEPARATOR}")
    print(f"  📈 ملخص Pipeline:")
    print(f"     - إجمالي العينات المعالجة:  {total_samples}")
    print(f"     - ملفات Split جاهزة:        {len(splits)}/3")
    print(f"     - سكربتات جاهزة:            {sum(1 for s in scripts if os.path.exists(os.path.join(BASE_DIR,'scripts',s)))}/{len(scripts)}")
    print(f"\n  🎯 الحالة: {'✅ Pipeline جاهز للتدريب على Colab!' if total_samples > 0 else '❌ يوجد مشكلة'}")
    print(SEPARATOR)
    print("\n  ✅ خطوة التدريب (03_train_qlora.py) تحتاج GPU")
    print("  👉 ارفع مجلد llm_pipeline/ إلى Google Drive")
    print("  👉 افتحه في Google Colab مع تفعيل T4 GPU")
    print(SEPARATOR + "\n")

if __name__ == "__main__":
    main()
