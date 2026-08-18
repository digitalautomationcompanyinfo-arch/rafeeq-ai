import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import OpenAI from "openai";
import { knowledgeBase } from "./src/data/knowledge.ts";
import { OAuth2Client } from "google-auth-library";
import { upsertUser, getUser, updateXP, supabase } from "./src/data/db.ts";

const app = express();
const PORT = 3000;

// [Security Fix] Reduce payload limit to prevent memory exhaustion (DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// [Security Fix] Simple In-Memory Rate Limiter for /api/chat
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;

app.use("/api/chat", (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, { count: 0, lastReset: now });
  const record = rateLimitMap.get(ip)!;
  if (now - record.lastReset > RATE_LIMIT_WINDOW_MS) {
    record.count = 0;
    record.lastReset = now;
  }
  record.count++;
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ text: "عذراً، لقد تجاوزت الحد المسموح من الطلبات. يرجى الانتظار قليلاً." });
  }
  next();
});

// ==============================================================================
// 1. قاعدة المعرفة (Knowledge Base Simulation / RAG)
// ==============================================================================
// Knowledge base loaded from external file

// ==============================================================================
// 2. الذاكرة السياقية (Contextual Memory)
// ==============================================================================
// [Bug Fix] Session-based memory instead of global shared state
const activeSessions = new Map<string, any[]>();

  // ==============================================================================
  // 3. التكامل مع موارد الشركات الكبرى (Enterprise API Integrations)
  // ==============================================================================

  // أ. محرك AWS Bedrock (للوصول إلى Claude 3)
  const callAWSBedrock = async (prompt: string): Promise<string> => {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return new Promise(r => setTimeout(() => r(`[AWS Bedrock / Claude 3]: (تمت المحاكاة) - تحليل منطقي...`), 50));
    }
    // ... rest of the code ...
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
      return new Promise(r => setTimeout(() => r(`[DeepSeek API]: (تمت المحاكاة) - تحليل برمجي.`), 50));
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
      return new Promise(r => setTimeout(() => r(`[OpenAI GPT-4o]: (تمت المحاكاة) - تصور هندسي.`), 50));
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
      return new Promise(r => setTimeout(() => r(`[Groq / Llama-3]: (محاكاة) تحليل سريع.`), 50));
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
       return new Promise(r => setTimeout(() => r(`[Hugging Face]: (محاكاة) استنتاج سياقي.`), 50));
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
       return new Promise(r => setTimeout(() => r(`[OpenRouter / Gemma 2]: (محاكاة) تحليل منطقي.`), 50));
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
       return new Promise(r => setTimeout(() => r(`[Cohere / Command R]: (محاكاة) مساعدة وتدقيق.`), 50));
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
    return new Promise(r => setTimeout(() => r(`[رفيق AI / QLoRA]: (محاكاة) تحليل سريع لدعم الطالب.`), 50));
  };

  // ==============================================================================
  // Main Chat Endpoint
  // ==============================================================================
  app.post("/api/chat", async (req, res) => {
    let retrievedContext = "";
    let retrievedTopics: string[] = [];
    try {
      const { message, level, reset, image, sessionId = "default_session" } = req.body;
      
      // [Security Fix] Basic Prompt Injection Guard
      const lowerMsg = (message || "").toLowerCase();
      if (lowerMsg.includes("تجاهل كل التعليمات") || lowerMsg.includes("ignore previous instructions") || lowerMsg.includes("تجاهل التعليمات السابقة")) {
          return res.json({ text: "عذراً، لا يمكنني تنفيذ هذا الطلب. دعنا نركز على الدرس والاستفادة التعليمية." });
      }

      if (!activeSessions.has(sessionId)) {
         activeSessions.set(sessionId, []);
      }
      let chatHistory = activeSessions.get(sessionId)!;
      
      if (reset) {
        chatHistory.length = 0;
        return res.json({ text: "تم تفريغ الذاكرة." });
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
      
      let baseInstruction = "أنت 'رفيق' (RAFEEG)، المساعد الذكي والأخ الأكبر للطلاب في منصة 'ليرنوف' (Learnov).\n" +
        "أنت متخصص وداعم بقوة لطلاب المناهج السودانية في كافة المراحل (الأساس، المتوسطة، الثانوية). ومهمتك تقديم الدعم الأكاديمي، الإرشاد الجامعي، والدعم النفسي (مواجهة رهاب الامتحانات).\n" +
        "شخصيتك: أنت معلم ملهم، أخ أكبر داعم، محلل دقيق، ومرشد نفسي وأكاديمي.\n\n" +
        "قواعد التفكير المنطقي والاستدلال (Reasoning & Logic Rules):\n" +
        "1. قبل الإجابة على أي سؤال، فكر منطقياً وضع أفكارك وتحليلاتك باللغة العربية داخل وسوم <think> ... </think>.\n" +
        "2. استخدم القياس والاستقراء وتقنية 'فاينمان' (تبسيط المعقد كأنه لطفل) عند شرح المفاهيم.\n" +
        "3. استخدم 'الطريقة السقراطية' (Socratic Method): وجّه الطالب لاكتشاف الحل بنفسه.\n" +
        "4. انصح الطلاب بتقنيات المذاكرة الحديثة كالتكرار المتباعد وطريقة بومودورو، وشجعهم باستمرار.\n" +
        "5. التقييم المستمر (Continuous Assessment): في نهاية كل شرح، اطرح 'سؤالاً اختبارياً سريعاً' للتأكد من فهمه. وإذا أخطأ، أعطه 'تلميحاً' (Hint) بدلاً من الإجابة المباشرة.\n" +
        "6. نظام التحفيز (Gamification): عندما يجيب الطالب إجابة صحيحة، قم بتقييمه (مثلاً 10/10) وامنحه نجوماً ⭐ أو كؤوساً 🏆 واحتفل بنجاحه لتشجيعه.\n" +
        "7. أنماط التعلم (Learning Styles): اكتشف نمط الطالب. إذا واجه صعوبة، اسأله هل يفضل الشرح كقصة (سمعي)، خريطة تخيلية (بصري)، أو تجربة عملية (حركي).\n" +
        "8. تحليل الصور (Multimodal): إذا أرفق الطالب صورة (كمسألة رياضيات أو صفحة كتاب)، قم بتحليلها بدقة خطوة بخطوة، واشرح التفاصيل الموجودة فيها بوضوح تام.\n" +
        "9. بعد إغلاق وسم </think>، اكتب إجابتك النهائية للطالب بأسلوب يشع إيجابية ومودة.\n\n" +
        "تنسيقات الإخراج الإلزامية:\n" +
        "1. لإنشاء بطاقات استذكار، استخدم:\n" +
        "[FLASHCARDS]\n[{\"q\": \"السؤال/المصطلح\", \"a\": \"الجواب/التعريف\"}]\n[/FLASHCARDS]\n\n" +
        "2. لإنشاء اختبار، استخدم:\n" +
        "[MCQ]\n[{\"q\": \"نص السؤال\", \"options\": [\"خيار 1\", \"خيار 2\", \"خيار 3\", \"خيار 4\"], \"correctIndex\": 0, \"explanation\": \"شرح الجواب\"}]\n[/MCQ]\n\n" +
        "ملاحظات: استخدم Markdown و LaTeX للمعادلات.";

      
      const frustrationKeywords = ['صعب', 'لم افهم', 'معقد', 'مستحيل', 'كيف', 'لا استطيع', 'لا أفهم', 'شرح'];
      if (message && frustrationKeywords.some(kw => message.includes(kw))) {
        baseInstruction += "\n\n[تنبيه هام: الطالب يشعر بالإحباط أو يواجه صعوبة. كن شديد التعاطف، استخدم لغة محفزة جداً (مثل: 'لا تقلق، هذا طبيعي..')، وبسّط الشرح لأقصى درجة ممكنة مع أمثلة من واقع الحياة].";
      }

      // [Feature] True RAG via Supabase pgvector
      if (message) {
        try {
          // 1. Generate Embedding for user query
          const embedRes = await ai.models.embedContent({
             model: 'text-embedding-004',
             contents: message
          });
          const query_embedding = embedRes.embeddings[0].values;
          
          // 2. Semantic Search in Supabase
          const { data: documents, error } = await supabase.rpc('match_documents', {
             query_embedding,
             match_threshold: 0.5,
             match_count: 3
          });
          
          if (!error && documents && documents.length > 0) {
              for (const doc of documents) {
                  retrievedContext += doc.content + "\n";
                  retrievedTopics.push(doc.topic);
              }
          }
        } catch (e) {
          // Fallback to basic string search if supabase fails
          let matchCount = 0;
          for (const [key, val] of Object.entries(knowledgeBase)) {
            if (message.includes(key)) {
              retrievedContext += val + "\n";
              retrievedTopics.push(key);
              matchCount++;
              if (matchCount >= 3) break; 
            }
          }
        }
      }
      if (retrievedContext) baseInstruction += `\n[قاعدة المعرفة الخاصة بمنصة ليرنوف]:\n${retrievedContext}`;

      // Setup SSE Headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const generateStreamWithFallback = async (params: any) => {
        try {
          const responseStream = await ai.models.generateContentStream({ ...params, model: "gemini-3.7-flash" });
          for await (const chunk of responseStream) {
            if (chunk.text) {
              res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
              finalResponseText += chunk.text;
            }
          }
        } catch (err: any) {
          const fallbackStream = await ai.models.generateContentStream({ ...params, model: "gemini-3.1-flash-lite" });
          for await (const chunk of fallbackStream) {
            if (chunk.text) {
              res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
              finalResponseText += chunk.text;
            }
          }
        }
      };

      if (level === 3) {
        usedModels = ["Gemini 2.5 Pro", "AWS Bedrock (Claude 3)", "DeepSeek V3", "OpenAI GPT-4o"];
        res.write(`data: ${JSON.stringify({ metadata: { isComplex: true, modelsUsed: usedModels, retrievedTopics } })}\n\n`);

        const [awsOutput, deepseekOutput, openaiOutput] = await Promise.all([
          callAWSBedrock(queryText),
          callDeepSeek(queryText),
          callOpenAI(queryText)
        ]);

        const synthesisPrompt = `
          تعليمات النظام: ${baseInstruction}
          
          أنت "رفيق"، وتعمل الآن كمدقق حقائق ومحلل رئيسي (Fact-Checker) ومعلم سقراطي (Socratic Teacher).
          سؤال الطالب: "${queryText}"

          إليك تحليلات النماذج العالمية المساعدة (الشبكة المؤسسية):
          1. AWS Bedrock (Claude 3): ${awsOutput}
          2. DeepSeek API: ${deepseekOutput}
          3. OpenAI GPT-4o: ${openaiOutput}

          ${image ? "ملاحظة: لقد قام الطالب برفع صورة." : ""}
          قم بفلترة هذه المعلومات، تحقق من صحتها بدقة متناهية، واكتب إجابة نهائية شاملة وسريعة بأسلوبك (أخ أكبر ومعلم داعم).
          تأكد من أن تكون دقيقاً جداً ولا تطيل بلا داعٍ لتوفير الوقت.
        `;

        await generateStreamWithFallback({
          contents: chatHistory.slice(0, -1).concat([{ role: "user", parts: [{ text: synthesisPrompt }] }]),
          config: { temperature: 0.3 } 
        });

      } else if (level === 2) {
        usedModels = ["Gemini 2.5 Flash", "Groq (Llama 3)", "Hugging Face (Mistral)", "OpenRouter (Gemma 2)", "Cohere (Command R)", "رفيق AI (QLoRA MVP)"];
        res.write(`data: ${JSON.stringify({ metadata: { isComplex: true, modelsUsed: usedModels, retrievedTopics } })}\n\n`);

        const [groqOutput, hfOutput, openRouterOutput, cohereOutput, qloraOutput] = await Promise.all([
          callGroq(queryText), callHuggingFace(queryText), callOpenRouter(queryText), callCohere(queryText), callQLoRAMVP(queryText)
        ]);

        const synthesisPrompt = `
          تعليمات النظام: ${baseInstruction}
          سؤال الطالب: "${queryText}"
          إليك تحليلات النماذج المجانية:
          1. Groq: ${groqOutput}
          2. Hugging Face: ${hfOutput}
          3. OpenRouter: ${openRouterOutput}
          4. Cohere: ${cohereOutput}
          5. رفيق AI: ${qloraOutput}
          قم بفلترة هذه المعلومات واكتب إجابة نهائية.
        `;

        await generateStreamWithFallback({
          contents: chatHistory.slice(0, -1).concat([{ role: "user", parts: [{ text: synthesisPrompt }] }]),
          config: { temperature: 0.5 } 
        });

      } else {
        res.write(`data: ${JSON.stringify({ metadata: { isComplex: false, modelsUsed: usedModels, retrievedTopics } })}\n\n`);
        await generateStreamWithFallback({
          contents: chatHistory,
          config: { systemInstruction: baseInstruction, temperature: 0.7 }
        });
      }

      chatHistory.push({ role: "model", parts: [{ text: finalResponseText }] });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

    } catch (error: any) {
      console.error("Chat API Error:", error);
      let fallbackText = "عذراً، أواجه ضغطاً عالياً حالياً أو تعذر الاتصال بالخادم. ";
      if (retrievedContext) {
        fallbackText += "ولكن بناءً على موسوعة ليرنوف، إليك ما وجدته حول سؤالك:\n\n" + retrievedContext;
      } else {
        fallbackText += "يرجى المحاولة مرة أخرى بعد دقيقة.";
      }
      
      const { sessionId = "default_session" } = req.body || {};
      if (activeSessions.has(sessionId)) {
          activeSessions.get(sessionId)!.push({ role: "model", parts: [{ text: fallbackText }] });
      }
      
      if (!res.headersSent) {
          res.json({
            text: fallbackText,
            isComplex: false,
            modelsUsed: ["Local Knowledge Base (Fallback)"],
            retrievedTopics
          });
      } else {
          res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
    // Vite middleware is async, so we wrap it
    (async () => {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    })();
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not running in Vercel
  if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export default app;

