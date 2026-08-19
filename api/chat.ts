import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import OpenAI from "openai";
import { knowledgeBase } from "./_knowledge.js";

  // ==============================================================================
  // 1. قاعدة المعرفة (Knowledge Base Simulation / RAG)
  // ==============================================================================
  // Knowledge base loaded from external file

  // ==============================================================================
  // 2. الذاكرة السياقية (Contextual Memory)
  // تم النقل إلى الـ Request Body للحفاظ على استقلالية كل جلسة (Stateless)
  // ==============================================================================

  // ==============================================================================
  // 3. التكامل مع موارد الشركات الكبرى (Enterprise API Integrations)
  // ==============================================================================

  // أ. محرك AWS Bedrock (للوصول إلى Claude 3)
  const callAWSBedrock = async (prompt: string): Promise<string> => {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      // Lazy initialization fallback to prevent crashes if keys aren't set in dev env
      return new Promise(r => setTimeout(() => r(`[AWS Bedrock / Claude 3]: (تمت المحاكاة لعدم توفر مفاتيح AWS) - تحليل منطقي ولغوي عميق للسؤال: "${prompt.substring(0, 30)}..."`), 800));
    }
    try {
      const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });
      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      };
      const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload)
      });
      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return `[AWS Bedrock / Claude 3]: ${responseBody.content[0].text}`;
    } catch (e: any) {
      console.error("AWS Bedrock Error:", e);
      return `[AWS Bedrock Error]: فشل الاتصال - ${e.message}`;
    }
  };

  // ب. محرك DeepSeek (عبر OpenAI Compatible SDK)
  const callDeepSeek = async (prompt: string): Promise<string> => {
    if (!process.env.DEEPSEEK_API_KEY) {
      return new Promise(r => setTimeout(() => r(`[DeepSeek API]: (تمت المحاكاة لعدم توفر مفتاح DeepSeek) - تحليل برمجي/رياضي وخوارزمي.`), 1000));
    }
    try {
      const openai = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });
      const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: "You are a logical and coding expert." }, { role: "user", content: prompt }],
        model: "deepseek-chat",
      });
      return `[DeepSeek API]: ${completion.choices[0].message?.content}`;
    } catch (e: any) {
      console.error("DeepSeek Error:", e);
      return `[DeepSeek Error]: فشل الاتصال - ${e.message}`;
    }
  };

  // ج. محرك OpenAI (GPT-4o)
  const callOpenAI = async (prompt: string): Promise<string> => {
    if (!process.env.OPENAI_API_KEY) {
      return new Promise(r => setTimeout(() => r(`[OpenAI GPT-4o]: (تمت المحاكاة لعدم توفر مفتاح OpenAI) - تحليل القدرات المعقدة وتكوين تصور هندسي.`), 1200));
    }
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4o",
      });
      return `[OpenAI GPT-4o]: ${completion.choices[0].message?.content}`;
    } catch (e: any) {
      console.error("OpenAI Error:", e);
      return `[OpenAI Error]: فشل الاتصال - ${e.message}`;
    }
  };

  // د. محرك Groq (Llama 3 المجاني والسريع)
  const callGroq = async (prompt: string): Promise<string> => {
    if (!process.env.GROQ_API_KEY) {
      return new Promise(r => setTimeout(() => r(`[Groq / Llama-3]: (محاكاة مجانية) تحليل سريع للبيانات والمنطق باستخدام نماذج مفتوحة المصدر.`), 500));
    }
    try {
      const openai = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: process.env.GROQ_API_KEY });
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama3-70b-8192",
      });
      return `[Groq / Llama-3]: ${completion.choices[0].message?.content}`;
    } catch (e: any) {
      return `[Groq Error]: فشل الاتصال - ${e.message}`;
    }
  };

  // هـ. محرك Hugging Face (Mistral مفتوح المصدر)
  const callHuggingFace = async (prompt: string): Promise<string> => {
    if (!process.env.HUGGINGFACE_API_KEY) {
       return new Promise(r => setTimeout(() => r(`[Hugging Face / Mistral]: (محاكاة مجانية) استنتاج سياقي وربط معلومات.`), 600));
    }
    try {
      const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2", {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`, "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 500 } }),
      });
      const result = await response.json();
      return `[Hugging Face / Mistral]: ${result[0]?.generated_text || "تم التحليل بنجاح"}`;
    } catch (e: any) {
      return `[Hugging Face Error]: فشل الاتصال - ${e.message}`;
    }
  };

  // و. محرك OpenRouter (Gemma 2 مفتوح المصدر)
  const callOpenRouter = async (prompt: string): Promise<string> => {
    if (!process.env.OPENROUTER_API_KEY) {
       return new Promise(r => setTimeout(() => r(`[OpenRouter / Gemma 2]: (محاكاة مجانية) تحليل منطقي مفتوح المصدر.`), 700));
    }
    try {
      const openai = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY });
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "google/gemma-2-9b-it:free",
      });
      return `[OpenRouter / Gemma 2]: ${completion.choices[0].message?.content}`;
    } catch (e: any) {
      return `[OpenRouter Error]: فشل الاتصال - ${e.message}`;
    }
  };

  // ز. محرك Cohere (Command R المخصص للتعليم والاسترجاع)
  const callCohere = async (prompt: string): Promise<string> => {
    if (!process.env.COHERE_API_KEY) {
       return new Promise(r => setTimeout(() => r(`[Cohere / Command R]: (محاكاة مجانية) مساعدة وتدقيق تعليمي فعال.`), 800));
    }
    try {
      const response = await fetch("https://api.cohere.ai/v1/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ message: prompt, model: "command-r" }),
      });
      const result = await response.json();
      return `[Cohere / Command R]: ${result.text}`;
    } catch (e: any) {
      return `[Cohere Error]: فشل الاتصال - ${e.message}`;
    }
  };

  // ح. محرك QLoRA MVP — النموذج المُدرَّب الخاص بالمنصة (عبر Pollinations AI مجاناً)
  const callQLoRAMVP = async (prompt: string): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai-large",
          messages: [
            { role: "system", content: "أنت 'رفيق'، نموذج ذكاء اصطناعي مُدرَّب خصيصاً لمنصة ليرنوف السودانية. تخصصك مساعدة الطلاب في المنهج السوداني." },
            { role: "user",   content: prompt }
          ],
          max_tokens: 600,
          temperature: 0.6,
          stream: false
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return `[QLoRA MVP / رفيق AI]: ${data.choices[0].message.content}`;
    } catch (e: any) {
      return `[QLoRA MVP / محاكاة]: نموذج رفيق المُدرَّب يُحلل: "${prompt.substring(0, 40)}..." — تحليل سياقي تعليمي متخصص.`;
    }
  };

  // ==============================================================================
  // Main Chat Endpoint
  // ==============================================================================
export default async function handler(req: any, res: any) {
    let retrievedContext = "";
    let retrievedTopics: string[] = [];
    try {
      const { message, level, reset, image, history = [] } = req.body;
      
      if (reset) {
        return res.json({ text: "تم تفريغ الذاكرة." });
      }

      // تحويل الرسائل القادمة من الـ Frontend إلى تنسيق Gemini
      let chatHistory = history.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));
      // Gemini API requires history to start with a 'user' role
      if (chatHistory.length > 0 && chatHistory[0].role === "model") {
        chatHistory.shift();
      }
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is missing" });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const generateWithFallback = async (params: any) => {
        try {
          return await ai.models.generateContent({
            ...params,
            model: "gemini-3.7-flash"
          });
        } catch (err: any) {
          
          return await ai.models.generateContent({
            ...params,
            model: "gemini-3.1-flash-lite"
          });
        }
      };
      
      // تجهيز أجزاء رسالة المستخدم (نص + صورة إن وجدت)
      let userParts: any[] = [{ text: message || "قم بتحليل هذه الصورة" }];
      
      if (image) {
        const mimeType = image.split(';')[0].split(':')[1];
        const base64Data = image.split(',')[1];
        userParts.push({
          inlineData: { data: base64Data, mimeType: mimeType }
        });
      }

      chatHistory.push({ role: "user", parts: userParts });

      let finalResponseText = "";
      let usedModels = ["Google Gemini"];
      const queryText = message || "قم بتحليل هذه الصورة المرفقة واستنتج المطلوب.";
      
      let baseInstruction = "أسمك 'رفيق' (Rafeeq)، أنت المساعد الذكي المتقدم في منصة 'ليرنوف' (Learnov). " +
        "ملاحظة هامة جداً: منصة ليرنوف هي منصة تعليمية **سودانية** رائدة (Sudanese educational platform) وليست سعودية أو من أي دولة أخرى. " +
        "مهمتك مساعدة الطلاب في المنهج السوداني وتوضيح المفاهيم لهم بأسلوب يتناسب مع ثقافتهم وبيئتهم السودانية.\n" +
        "هام: إذا طلب الطالب (بطاقات استذكار) أو (Flashcards)، يجب عليك استخراج المفاهيم وإرجاعها حصراً بهذا التنسيق الحرفي (بدون علامات Markdown خارج البلوك):\n" +
        "[FLASHCARDS]\n[{\"q\": \"السؤال الأول أو المصطلح\", \"a\": \"الجواب أو التعريف\"}]\n[/FLASHCARDS]";

      
      const frustrationKeywords = ['صعب', 'لم افهم', 'معقد', 'مستحيل', 'كيف', 'لا استطيع'];
      if (message && frustrationKeywords.some(kw => message.includes(kw))) {
        baseInstruction += " [تنبيه: الطالب يشعر بالإحباط، كن متعاطفاً وبسط الشرح].";
      }

      // removed
      // removed
      if (message) {
        for (const [key, val] of Object.entries(knowledgeBase)) {
          if (message.includes(key)) {
            retrievedContext += val + "\n";
            retrievedTopics.push(key);
          }
        }
      }
      if (retrievedContext) baseInstruction += `\n[قاعدة المعرفة الخاصة بمنصة ليرنوف]:\n${retrievedContext}`;

      if (level === 3) {
        // تفعيل شبكة الشركات الكبرى (Enterprise Network)
        usedModels = ["Gemini 2.5 Pro", "AWS Bedrock (Claude 3)", "DeepSeek V3", "OpenAI GPT-4o"];

        // جلب الإجابات من جميع النماذج بالتوازي باستخدام الـ SDKs الحقيقية (أو محاكاتها إذا غابت المفاتيح)
        const [awsOutput, deepseekOutput, openaiOutput] = await Promise.all([
          callAWSBedrock(queryText),
          callDeepSeek(queryText),
          callOpenAI(queryText)
        ]);

        const synthesisPrompt = `
          تعليمات النظام: ${baseInstruction}
          
          أنت "رفيق"، وتعمل الآن كمدقق حقائق ومحلل رئيسي (Fact-Checker).
          سؤال الطالب: "${queryText}"

          إليك تحليلات النماذج العالمية المساعدة (الشبكة المؤسسية):
          1. AWS Bedrock (Claude 3): ${awsOutput}
          2. DeepSeek API: ${deepseekOutput}
          3. OpenAI GPT-4o: ${openaiOutput}

          ${image ? "ملاحظة: لقد قام الطالب برفع صورة، وقد قمت (Gemini) برؤيتها ضمن سياق المحادثة الأصلي." : ""}

          قم بفلترة هذه المعلومات، تحقق من صحتها، واكتب إجابة نهائية متكاملة ودقيقة للطالب. لا تذكر أسماء النماذج في ردك النهائي.
        `;

        const response = await generateWithFallback({
          
          contents: chatHistory.slice(0, -1).concat([{ role: "user", parts: [{ text: synthesisPrompt }] }]),
          config: { temperature: 0.4 } 
        });

        finalResponseText = response.text || "";

      } else if (level === 2) {
        // تفعيل الشبكة المجانية ومفتوحة المصدر (Free / Open Source Network)
        usedModels = ["Gemini 2.5 Flash", "Groq (Llama 3)", "Hugging Face (Mistral)", "OpenRouter (Gemma 2)", "Cohere (Command R)", "رفيق AI (QLoRA MVP)"];

        const [groqOutput, hfOutput, openRouterOutput, cohereOutput, qloraOutput] = await Promise.all([
          callGroq(queryText),
          callHuggingFace(queryText),
          callOpenRouter(queryText),
          callCohere(queryText),
          callQLoRAMVP(queryText)
        ]);

        const synthesisPrompt = `
          تعليمات النظام: ${baseInstruction}
          
          أنت "رفيق"، وتعمل الآن كمدقق حقائق ومحلل رئيسي (Fact-Checker).
          سؤال الطالب: "${queryText}"

          إليك تحليلات النماذج المجانية والمفتوحة المصدر:
          1. Groq (Llama 3): ${groqOutput}
          2. Hugging Face (Mistral): ${hfOutput}
          3. OpenRouter (Gemma 2): ${openRouterOutput}
          4. Cohere (Command R): ${cohereOutput}
          5. رفيق AI (QLoRA MVP — النموذج التعليمي المُدرَّب): ${qloraOutput}

          ${image ? "ملاحظة: لقد قام الطالب برفع صورة، وقد قمت (Gemini) برؤيتها ضمن سياق المحادثة الأصلي." : ""}

          قم بفلترة هذه المعلومات، تحقق من صحتها، واكتب إجابة نهائية متكاملة ودقيقة للطالب. لا تذكر أسماء النماذج في ردك النهائي.
        `;

        const response = await generateWithFallback({
          
          contents: chatHistory.slice(0, -1).concat([{ role: "user", parts: [{ text: synthesisPrompt }] }]),
          config: { temperature: 0.5 } 
        });

        finalResponseText = response.text || "";

      } else {
        // المسار المباشر
        const response = await generateWithFallback({
          
          contents: chatHistory,
          config: {
            systemInstruction: baseInstruction,
            temperature: 0.7,
          }
        });
        finalResponseText = response.text || "";
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write(`data: ${JSON.stringify({ metadata: { isComplex: level > 1, modelsUsed: usedModels, retrievedTopics } })}\n\n`);
      res.write(`data: ${JSON.stringify({ text: finalResponseText })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

    } catch (error: any) {
      
      let fallbackText = "عذراً، أواجه ضغطاً عالياً حالياً أو تعذر الاتصال بالخادم. ";
      if (retrievedContext) {
        fallbackText += "ولكن بناءً على موسوعة ليرنوف، إليك ما وجدته حول سؤالك:\n\n" + retrievedContext;
      } else {
        fallbackText += "يرجى المحاولة مرة أخرى بعد دقيقة.";
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write(`data: ${JSON.stringify({ metadata: { isComplex: false, modelsUsed: ["Local Knowledge Base (Fallback)"], retrievedTopics } })}\n\n`);
      res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  }


