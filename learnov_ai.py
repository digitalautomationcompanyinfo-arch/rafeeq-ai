import os
from google import genai
from google.genai import types

# ==============================================================================
# Learnov AI Backend System (Python)
# نظام الذكاء الاصطناعي لمنصة ليرنوف - مبني بلغة بايثون
# ==============================================================================

class LearnovAITutor:
    def __init__(self, api_key: str = None):
        # Initialize the Gemini Client
        # تأكد من وضع مفتاح API في متغيرات البيئة GEMINI_API_KEY
        self.client = genai.Client(api_key=api_key or os.environ.get("GEMINI_API_KEY"))
        
        # Base model to use (Gemini 2.5 Pro is excellent for reasoning and tutoring)
        self.model_id = "gemini-2.5-pro"
        self.fast_model_id = "gemini-2.5-flash"

    def get_system_instruction_for_level(self, level: int) -> str:
        """
        إرجاع التعليمات النظامية بناءً على مستوى الذكاء المطلوب.
        """
        if level == 1:
            # Level 1: Fast & Direct (مستوى سريع ومباشر)
            return (
                "أنت مساعد ذكي في منصة 'ليرنوف' (Learnov). "
                "مهمتك تقديم إجابات سريعة، مباشرة، ومبسطة جداً للطلاب. "
                "لا تدخل في تفاصيل معقدة إلا إذا طُلب منك ذلك. اجعل إجابتك قصيرة وواضحة."
            )
        elif level == 2:
            # Level 2: Interactive Tutor (مستوى تفاعلي وشرح تفصيلي)
            return (
                "أنت معلم مساعد في منصة 'ليرنوف' (Learnov). "
                "مهمتك هي شرح المفاهيم للطلاب بطريقة تفاعلية وخطوة بخطوة. "
                "استخدم أمثلة من الواقع لتوضيح الفكرة. شجع الطالب بعبارات تحفيزية، "
                "وقم بتبسيط المعلومات المعقدة إلى أجزاء يسهل فهمها."
            )
        elif level == 3:
            # Level 3: Advanced Academic Guide / Socratic (مستوى متقدم وعميق)
            return (
                "أنت موجه أكاديمي متقدم وذكي جداً في منصة 'ليرنوف' (Learnov). "
                "مهمتك ليست فقط إعطاء الإجابة، بل مساعدة الطالب على استنتاجها بنفسه "
                "(أسلوب التفكير النقدي والطريقة السقراطية). "
                "اطرح أسئلة توجيهية، حلل أخطاء الطالب بلطف، وقدم رؤى عميقة وشاملة للموضوع. "
                "تأكد من بناء فهم عميق وثابت لدى الطالب."
            )
        else:
            raise ValueError("Level must be 1, 2, or 3")

    def chat_with_student(self, user_message: str, level: int, chat_history: list = None):
        """
        محاورة الطالب بناءً على المستوى المحدد.
        """
        system_instruction = self.get_system_instruction_for_level(level)
        
        # Select model based on level (use Flash for level 1 for maximum speed)
        selected_model = self.fast_model_id if level == 1 else self.model_id

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7, # توازن بين الإبداع والدقة
        )

        # Generate response
        response = self.client.models.generate_content(
            model=selected_model,
            contents=user_message,
            config=config,
        )

        return response.text

# ==============================================================================
# طريقة الاستخدام (Example Usage)
# ==============================================================================
if __name__ == "__main__":
    tutor = LearnovAITutor()
    
    student_question = "كيف تعمل الجاذبية الأرضية؟"
    
    print("--- Level 1 (سريع ومباشر) ---")
    print(tutor.chat_with_student(student_question, level=1))
    print("\n" + "="*50 + "\n")
    
    print("--- Level 2 (تفاعلي ومفصل) ---")
    print(tutor.chat_with_student(student_question, level=2))
    print("\n" + "="*50 + "\n")
    
    print("--- Level 3 (متقدم واستنتاجي) ---")
    print(tutor.chat_with_student(student_question, level=3))
