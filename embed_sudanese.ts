import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const sudaneseCurriculum: Record<string, string> = {
  "فيزياء الشهادة السودانية - الكهربية": "الكهربية التيارية هي دراسة الشحنات الكهربائية المتحركة. تشمل قوانين كيرشوف وتطبيقاتها في الدوائر المعقدة. القانون الأول (قانون حفظ الشحنة) ينص على أن المجموع الجبري للتيارات عند أي عقدة يساوي صفراً. القانون الثاني (قانون حفظ الطاقة) ينص على أن المجموع الجبري للقوة الدافعة الكهربائية وفروق الجهد في أي مسار مغلق يساوي صفراً.",
  "رياضيات الشهادة السودانية - التفاضل": "في منهج الرياضيات للشهادة السودانية، التفاضل يركز على معدل التغير المجهرية. مشتقة الدالة تمثل ميل المماس للمنحنى عند أي نقطة. تشمل قواعد التفاضل مشتقة الثابت، مشتقة القوة، قاعدة السلسلة، ومشتفات الدوال الدائرية (الجيب وجيب التمام).",
  "كيمياء الشهادة السودانية - العضوية": "الكيمياء العضوية في المنهج السوداني تركز على مركبات الكربون. تشمل الألكانات، الألكينات، الألكاينات، الكحولات، والأحماض الكربوكسيلية. من التفاعلات الهامة تفاعل الأسترة وهو تفاعل الكحول مع الحمض العضوي لتكوين إستر وماء.",
  "تاريخ الشهادة السودانية - المهدية": "الثورة المهدية في السودان (1881-1898) بقيادة محمد أحمد المهدي. بدأت كثورة دينية ضد الحكم التركي المصري. من أهم معاركها معركة شيكان وتحرير الخرطوم ومقتل غوردون باشا. انتهت الدولة المهدية بعد معركة كرري.",
  "لغة عربية الشهادة السودانية - الأدب": "يحتوي المنهج على نصوص شعرية ونثرية من العصر الجاهلي والإسلامي والأموي والعباسي والحديث. من شعراء المنهج إيليا أبو ماضي بقصيدته 'التينة الحمقاء' التي تدعو للعطاء ونبذ الأنانية، وحافظ إبراهيم في قصيدة 'اللغة العربية تنعى حظها'."
};

async function main() {
  console.log("جارٍ تضمين المنهج السوداني ورفعه إلى قاعدة المعرفة في Supabase...");
  
  for (const [topic, content] of Object.entries(sudaneseCurriculum)) {
    try {
      const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: content
      });
      
      const embedding = response.embeddings[0].values;
      
      const { error } = await supabase
        .from('knowledge_base')
        .insert({ topic, content, embedding });
        
      if (error) {
        console.error(`Error inserting ${topic}:`, error.message);
      } else {
        console.log(`تم إضافة: ${topic}`);
      }
    } catch (e) {
      console.error(`Error with ${topic}:`, e);
    }
  }
  console.log("تم تحديث المنهج السوداني بنجاح!");
}

main();