import os
import json
from google import genai
from google.genai import types

# ==============================================================================
# Learnov AI Data Generation & Fine-Tuning Script
# سكريبت توليد البيانات الاصطناعية لتدريب نموذج رفيق (QLoRA)
# ==============================================================================

class LearnovDataGenerator:
    def __init__(self, api_key: str = None):
        self.client = genai.Client(api_key=api_key or os.environ.get("GEMINI_API_KEY"))
        self.model_id = "gemini-2.5-pro" # نستخدم أفضل نموذج لتوليد بيانات عالية الجودة
        
    def get_system_instruction(self) -> str:
        return (
            "أنت خبير في بناء مجموعات البيانات (Datasets) لتدريب نماذج الذكاء الاصطناعي في مجال التعليم. "
            "مهمتك هي توليد أزواج من (سؤال، جواب) تمثل محادثات بين طالب يواجه صعوبة، ومساعد ذكي يدعى 'رفيق' "
            "يستخدم الطريقة السقراطية (Socratic Method) لتوجيه الطالب خطوة بخطوة. "
            "يجب أن تكون المخرجات بصيغة JSON Lines (JSONL)."
        )

    def generate_synthetic_dataset(self, topic: str, count: int = 5, output_file: str = "rafeeq_dataset.jsonl"):
        """
        يولد مجموعة بيانات للتدريب حول موضوع معين.
        """
        print(f"[*] جاري توليد {count} أمثلة لتدريب النموذج حول: {topic}...")
        
        system_instruction = self.get_system_instruction()
        prompt = (
            f"قم بتوليد {count} أمثلة محادثات تدريبية (Instruction-Tuning) حول موضوع '{topic}'. "
            "التنسيق المطلوب لكل سطر: {{\"messages\": [{{\"role\": \"user\", \"content\": \"...\"}}, {{\"role\": \"assistant\", \"content\": \"...\"}}]}}\n"
            "لا تضع أي نصوص إضافية، فقط أسطر JSON الصالحة."
        )

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.8,
            response_mime_type="application/json"
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=config,
            )
            
            # Append to file
            with open(output_file, "a", encoding="utf-8") as f:
                # محاولة تنظيف المخرجات في حال وضعها ضمن مصفوفة
                try:
                    data = json.loads(response.text)
                    if isinstance(data, list):
                        for item in data:
                            f.write(json.dumps(item, ensure_ascii=False) + "\n")
                    else:
                        f.write(json.dumps(data, ensure_ascii=False) + "\n")
                except json.JSONDecodeError:
                    # إذا كانت الإجابة JSONL أصلاً
                    for line in response.text.strip().split('\n'):
                        f.write(line + "\n")
                        
            print(f"[+] تم حفظ البيانات بنجاح في {output_file}")
            
        except Exception as e:
            print(f"[-] حدث خطأ أثناء التوليد: {e}")

# ==============================================================================
# طريقة الاستخدام
# ==============================================================================
if __name__ == "__main__":
    generator = LearnovDataGenerator()
    
    # يمكنك تشغيل هذا السكريبت لتوليد آلاف المحادثات لتدريب نموذج محلي!
    topics = ["قوانين نيوتن للحركة", "البرمجة كائنية التوجه OOP", "البناء الضوئي في النباتات"]
    
    for t in topics:
        generator.generate_synthetic_dataset(topic=t, count=3)
