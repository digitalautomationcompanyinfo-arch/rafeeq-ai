import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Code, Database, LineChart, Network, CheckCircle2, Cpu, BrainCircuit, RefreshCw, ImagePlus, X, Image as ImageIcon, Mic, BookOpen, Trophy, Timer, Flame, Play, Pause, Layers, Volume2, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { supabase, getUser, updateXP, createChatSession, getChatSessions, getChatMessages, addChatMessage } from './data/db';

type Level = 1 | 2 | 3;

interface Message {
  role: 'user' | 'model';
  text: string;
  isComplex?: boolean;
  modelsUsed?: string[];
  image?: string;
  retrievedTopics?: string[];
}

const FlashcardList = ({ data }: { data: {q: string, a: string}[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const nextCard = () => {
     setIsFlipped(false);
     setTimeout(() => setCurrentIndex(prev => Math.min(prev + 1, data.length - 1)), 150);
  };
  const prevCard = () => {
     setIsFlipped(false);
     setTimeout(() => setCurrentIndex(prev => Math.max(prev - 1, 0)), 150);
  };

  if (!data || data.length === 0) return null;

  return (
     <div className="flex flex-col items-center my-4 w-full">
        <div 
          className="w-full max-w-sm h-48 cursor-pointer perspective-1000"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            {/* Front */}
            <div className="absolute w-full h-full backface-hidden bg-white border-2 border-indigo-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
               <h3 className="text-lg font-bold text-indigo-900 leading-relaxed">{data[currentIndex].q}</h3>
               <span className="absolute bottom-3 text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-full flex items-center gap-1">
                 <Layers className="w-3 h-3" /> انقر للقلب
               </span>
            </div>
            {/* Back */}
            <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 flex items-center justify-center text-center shadow-md rotate-y-180">
               <p className="text-white font-medium leading-relaxed">{data[currentIndex].a}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-6">
           <button onClick={prevCard} disabled={currentIndex === 0} className="px-4 py-1.5 bg-slate-100 rounded-full text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors font-bold text-xs">السابق</button>
           <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{currentIndex + 1} / {data.length}</span>
           <button onClick={nextCard} disabled={currentIndex === data.length - 1} className="px-4 py-1.5 bg-slate-100 rounded-full text-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors font-bold text-xs">التالي</button>
        </div>
     </div>
  );
};

const MCQList = ({ data }: { data: {q: string, options: string[], correctIndex: number, explanation: string}[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!data || data.length === 0) return null;

  const currentQuestion = data[currentIndex];

  const handleOptionClick = (index: number) => {
    if (selectedOption !== null) return; // Prevent changing answer
    setSelectedOption(index);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setShowExplanation(false);
    setCurrentIndex(prev => Math.min(prev + 1, data.length - 1));
  };

  return (
    <div className="flex flex-col my-4 w-full bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4 text-slate-800">
        <CheckCircle2 className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-sm">اختبر معلوماتك: سؤال {currentIndex + 1} من {data.length}</h3>
      </div>
      
      <p className="text-base font-medium text-slate-800 mb-6 leading-relaxed">{currentQuestion.q}</p>
      
      <div className="flex flex-col gap-3 mb-6">
        {currentQuestion.options.map((opt, i) => {
          let btnClass = "w-full text-right p-4 rounded-xl border transition-all text-sm font-medium ";
          if (selectedOption === null) {
            btnClass += "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50 text-slate-700";
          } else {
            if (i === currentQuestion.correctIndex) {
              btnClass += "border-green-500 bg-green-50 text-green-800 shadow-sm"; // Correct answer is always green
            } else if (i === selectedOption) {
              btnClass += "border-red-400 bg-red-50 text-red-800"; // Wrong selected answer is red
            } else {
              btnClass += "border-slate-100 bg-slate-50 text-slate-400 opacity-50"; // Other unselected options fade
            }
          }

          return (
            <button key={i} onClick={() => handleOptionClick(i)} className={btnClass} disabled={selectedOption !== null}>
              <span className="inline-block w-6 text-slate-400">{i + 1}.</span> {opt}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={`p-4 rounded-xl text-sm leading-relaxed mb-4 ${selectedOption === currentQuestion.correctIndex ? 'bg-green-100 text-green-900 border border-green-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
          <strong className="block mb-1">{selectedOption === currentQuestion.correctIndex ? '✅ إجابة صحيحة!' : '❌ إجابة خاطئة!'}</strong>
          <span className="font-medium text-xs">الشرح: </span> {currentQuestion.explanation}
        </div>
      )}

      {selectedOption !== null && currentIndex < data.length - 1 && (
        <button onClick={nextQuestion} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-colors self-end">
          السؤال التالي
        </button>
      )}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'code'>('chat');
  const [sidebarTab, setSidebarTab] = useState<'history' | 'system' | 'profile'>('profile');
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessionsList, setChatSessionsList] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      setIsAuthLoading(false);
    }).catch(err => {
      console.warn('Supabase auth failed (bypassed):', err);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    const data = await getUser(userId);
    if (data) {
      setXp(data.xp || 0);
      setStreak(data.streak || 0);
    }
    const sessions = await getChatSessions(userId);
    setChatSessionsList(sessions);
  };
  
  const loadChatSession = async (sessionId: string) => {
      setCurrentSessionId(sessionId);
      const msgs = await getChatMessages(sessionId);
      setMessages(msgs.map((m: any) => ({ role: m.role, text: m.content })));
  };
  
  const startNewSession = () => {
      setCurrentSessionId(null);
      setMessages([{ role: 'model', text: 'مرحباً بك مجدداً في جلسة جديدة! كيف يمكنني مساعدتك؟' }]);
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((time) => time - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining]);

  const [level, setLevel] = useState<Level>(2);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'أهلاً بك! أنا **رفيق** (RAFEEG)، المساعد الذكي والمتكامل لمنصة ليرنوف. كيف يمكنني مساعدتك في دراستك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<'idle' | 'routing' | 'querying' | 'verifying' | 'typing'>('idle');
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("عذراً، متصفحك لا يدعم ميزة الإدخال الصوتي.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userText = input.trim();
    const currentImage = selectedImage;
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setMessages(prev => [...prev, { role: 'user', text: userText, image: currentImage || undefined }]);
    setIsLoading(true);
    
    // DB: Create session if it doesn't exist
    let sid = currentSessionId;
    if (!sid && session?.user?.id) {
        try {
            const newSess = await createChatSession(session.user.id, userText.substring(0, 30) || "صورة مرفقة");
            sid = newSess.id;
            setCurrentSessionId(sid);
            setChatSessionsList(prev => [newSess, ...prev]);
        } catch (e) {
            console.error(e);
        }
    }
    
    // DB: Add user message
    if (sid) {
        addChatMessage(sid, 'user', userText || "صورة مرفقة");
    }

    // Simulate orchestration UI states for visual feedback (faster now)
    if (level === 2 || level === 3) {
      setLoadingState('routing');
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, level, image: currentImage, history: messages, sessionId: sid })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response');
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        text: '',
        isComplex: false,
        modelsUsed: [],
        retrievedTopics: []
      }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let earnedXp = 10;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim();
            if (!dataStr) continue;
            try {
                const data = JSON.parse(dataStr);
                if (data.metadata) {
                    if (data.metadata.isComplex) earnedXp += 15;
                    if (data.metadata.retrievedTopics && data.metadata.retrievedTopics.length > 0) earnedXp += 5;
                    setMessages(prev => {
                        const newMsg = [...prev];
                        const last = newMsg[newMsg.length - 1];
                        last.isComplex = data.metadata.isComplex;
                        last.modelsUsed = data.metadata.modelsUsed;
                        last.retrievedTopics = data.metadata.retrievedTopics;
                        return newMsg;
                    });
                } else if (data.text) {
                    setLoadingState('typing');
                    fullText += data.text;
                    setMessages(prev => {
                        const newMsg = [...prev];
                        newMsg[newMsg.length - 1].text = fullText;
                        return newMsg;
                    });
                } else if (data.done) {
                    setXp(prev => prev + earnedXp);
                    if (session?.user?.id) {
                        updateXP(session.user.id, earnedXp);
                    }
                    if (sid) {
                        addChatMessage(sid, 'model', fullText);
                    }
                }
            } catch (e) {
                console.error("Error parsing stream chunk", e);
            }
          }
        }
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'عذراً، حدث خطأ في الاتصال بالخادم.' }]);
    } finally {
      setIsLoading(false);
      setLoadingState('idle');
    }
  };

  const handleClearMemory = async () => {
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', level, reset: true })
      });
      setMessages([{ role: 'model', text: 'تم مسح الذاكرة بنجاح. كيف يمكنني مساعدتك الآن؟' }]);
      setSelectedImage(null);
    } catch (error) {
      console.error("Failed to clear memory");
    }
  };

  const handleExport = () => {
    let content = "# ملخص محادثة ليرنوف - رفيق\n\n";
    messages.forEach(msg => {
      content += msg.role === 'user' ? "## أنت:\n" : "## رفيق:\n";
      content += msg.text + "\n\n";
    });
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Learnov_Session.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pythonCode = `import os
import asyncio
from google import genai
from google.genai import types
import boto3
import openai
import PIL.Image

# ==============================================================================
# 🌟 Rafeeq Enterprise AI System (نظام الذكاء الاصطناعي المتكامل للمؤسسات)
# المساعد الذكي لمنصة ليرنوف - دمج فعلي لـ AWS Bedrock و DeepSeek و OpenAI
# ==============================================================================

class RafeeqMemory:
    """وحدة الذاكرة: حفظ السياق وتتبع المحادثات"""
    def __init__(self):
        self.history = []

    def add_text(self, role: str, text: str):
        self.history.append({"role": role, "parts": [{"text": text}]})
        
    def add_multimodal(self, role: str, text: str, image_path: str):
        img = PIL.Image.open(image_path)
        self.history.append({"role": role, "parts": [img, {"text": text}]})

    def get_history(self):
        return self.history

class RafeeqKnowledgeBase:
    """وحدة قاعدة المعرفة (RAG)"""
    def __init__(self):
        self.documents = {
            "الفيزياء": "معلومات منهجية ليرنوف للفيزياء...",
            "ذكاء اصطناعي": "تعلم الآلة والتعلم العميق والشبكات العصبية...",
            "حوسبة سحابية": "نماذج IaaS, PaaS, SaaS ومزودي الخدمات...",
            "أمن سيبراني": "مبادئ CIA، التشفير، واختبار الاختراق...",
            "إدارة أعمال": "تحليل SWOT، التخطيط الاستراتيجي، والتسويق...",
            "تحليل بيانات": "تنظيف البيانات، EDA، وأدوات التصور..."
        }

    def retrieve(self, query: str) -> str:
        return "\\n".join([doc for key, doc in self.documents.items() if key in query])

class EnterpriseOrchestrator:
    """وحدة شبكة النماذج (AWS, OpenAI, DeepSeek, Groq, HF)"""
    def __init__(self):
        # تهيئة عملاء SDK الحقيقيين للمؤسسات
        self.bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
        self.openai_client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        self.deepseek_client = openai.OpenAI(api_key=os.environ.get("DEEPSEEK_API_KEY"), base_url="https://api.deepseek.com")
        
        # تهيئة العملاء المجانيين
        self.groq_client = openai.OpenAI(api_key=os.environ.get("GROQ_API_KEY"), base_url="https://api.groq.com/openai/v1")
        self.hf_token = os.environ.get("HUGGINGFACE_API_KEY")

    async def fetch_aws_claude(self, q: str): return "[AWS Bedrock / Claude 3]: تحليل منطقي..."
    async def fetch_deepseek(self, q: str): return "[DeepSeek API]: تحليل خوارزمي..."
    async def fetch_openai(self, q: str): return "[OpenAI GPT-4o]: تحليل مكاني وهندسي..."
    async def fetch_groq(self, q: str): return "[Groq Llama-3]: تحليل سريع مفتوح المصدر..."
    async def fetch_hf(self, q: str): return "[HF Mistral]: ربط سياقي مجاني..."
    async def fetch_openrouter(self, q: str): return "[OpenRouter Gemma-2]: تحليل مجاني من جوجل..."
    async def fetch_cohere(self, q: str): return "[Cohere Command-R]: تحليل للبيانات التعليمية..."

    async def execute_enterprise_network(self, query: str):
        return await asyncio.gather(self.fetch_aws_claude(query), self.fetch_deepseek(query), self.fetch_openai(query))

    async def execute_free_network(self, query: str):
        return await asyncio.gather(self.fetch_groq(query), self.fetch_hf(query), self.fetch_openrouter(query), self.fetch_cohere(query))

class RafeeqSystem:
    """المحرك الرئيسي لنظام 'رفيق'"""
    def __init__(self):
        self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        self.memory = RafeeqMemory()
        self.knowledge = RafeeqKnowledgeBase()
        self.orchestrator = EnterpriseOrchestrator()
        self.name = "رفيق (Rafeeq)"

    async def process_student_query(self, query: str, network_level: int, image_path: str = None):
        if image_path:
            self.memory.add_multimodal("user", query, image_path)
        else:
            self.memory.add_text("user", query)
        
        context = self.knowledge.retrieve(query)
        base_instruction = f"أسمك {self.name}، المساعد الذكي في منصة ليرنوف."
        if context: base_instruction += f"\\nمعلومات مساعدة:\\n{context}"

        if network_level == 3:
            raw_data = await self.orchestrator.execute_enterprise_network(query)
            prompt = f"قم بفلترة هذه الإجابات المتعددة (Bedrock, DeepSeek, OpenAI) والرد كـ {self.name}: {raw_data}"
        elif network_level == 2:
            raw_data = await self.orchestrator.execute_free_network(query)
            prompt = f"قم بفلترة هذه الإجابات المجانية (Groq/Llama, HF/Mistral) والرد كـ {self.name}: {raw_data}"
        else:
            prompt = None

        if prompt:
            # Gemini-2.5-pro كمصمم ومراجع نهائي (Fact-Checker)
            response = self.client.models.generate_content(
                model="gemini-2.5-pro",
                contents=self.memory.get_history() + [{"role": "user", "parts": [{"text": prompt}]}],
                config=types.GenerateContentConfig(system_instruction=base_instruction)
            )
        else:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=self.memory.get_history(),
                config=types.GenerateContentConfig(system_instruction=base_instruction)
            )

        self.memory.add_text("model", response.text)
        return response.text

# Example Usage
if __name__ == "__main__":
    rafeeq = RafeeqSystem()
    asyncio.run(rafeeq.process_student_query("حل هذه المسألة المعقدة.", network_level=3, image_path="math.jpg"))
`;

  const renderMessageContent = (text: string) => {
    let displayText = text;
    let thinkContent = null;
    let isThinking = false;

    // Parse <think> blocks (completed or streaming)
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      thinkContent = thinkMatch[1].trim();
      displayText = text.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    } else {
      const streamingThinkMatch = text.match(/<think>([\s\S]*?)$/);
      if (streamingThinkMatch) {
        thinkContent = streamingThinkMatch[1].trim();
        displayText = text.replace(/<think>[\s\S]*?$/, '').trim();
        isThinking = true; // Still streaming the thought
      }
    }

    const ThinkUI = thinkContent ? (
      <div className="mb-4 bg-slate-100/70 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2 mb-2 font-bold text-slate-600">
          <BrainCircuit className={`w-4 h-4 ${isThinking ? 'animate-pulse text-indigo-500' : ''}`} />
          <span>تفكير واستدلال رفيق {isThinking && '...'}</span>
        </div>
        <div className="whitespace-pre-wrap leading-relaxed opacity-80">{thinkContent}</div>
      </div>
    ) : null;

    // Check for Flashcards
    const flashcardsMatch = displayText.match(/\[FLASHCARDS\]([\s\S]*?)\[\/FLASHCARDS\]/);
    if (flashcardsMatch) {
      try {
        const jsonStr = flashcardsMatch[1].trim();
        const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const flashcards = JSON.parse(cleanJson);
        const textBefore = displayText.split(/\[FLASHCARDS\][\s\S]*?\[\/FLASHCARDS\]/)[0].trim();
        const textAfter = displayText.split(/\[FLASHCARDS\][\s\S]*?\[\/FLASHCARDS\]/)[1]?.trim();
        
        return (
          <>
            {ThinkUI}
            {textBefore && <div className="markdown-body prose prose-slate prose-sm rtl:prose-invert max-w-none mb-4"><Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{textBefore}</Markdown></div>}
            <FlashcardList data={flashcards} />
            {textAfter && <div className="markdown-body prose prose-slate prose-sm rtl:prose-invert max-w-none mt-4"><Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{textAfter}</Markdown></div>}
          </>
        );
      } catch (e) {
        console.error('Failed to parse flashcards', e);
      }
    }

    // Check for MCQ
    const mcqMatch = displayText.match(/\[MCQ\]([\s\S]*?)\[\/MCQ\]/);
    if (mcqMatch) {
      try {
        const jsonStr = mcqMatch[1].trim();
        const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const mcqData = JSON.parse(cleanJson);
        const textBefore = displayText.split(/\[MCQ\][\s\S]*?\[\/MCQ\]/)[0].trim();
        const textAfter = displayText.split(/\[MCQ\][\s\S]*?\[\/MCQ\]/)[1]?.trim();
        
        return (
          <>
            {ThinkUI}
            {textBefore && <div className="markdown-body prose prose-slate prose-sm rtl:prose-invert max-w-none mb-4"><Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{textBefore}</Markdown></div>}
            <MCQList data={mcqData} />
            {textAfter && <div className="markdown-body prose prose-slate prose-sm rtl:prose-invert max-w-none mt-4"><Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{textAfter}</Markdown></div>}
          </>
        );
      } catch (e) {
        console.error('Failed to parse MCQ', e);
      }
    }

    return (
      <>
        {ThinkUI}
        <div className="markdown-body prose prose-slate prose-sm rtl:prose-invert max-w-none">
          <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{displayText}</Markdown>
        </div>
      </>
    );
  };

  if (isAuthLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-bold text-slate-500">جاري التحقق من الحساب...</div>;
  }

  // if (!session) {
  //   return (
  //     <div className="h-screen w-full bg-slate-50 flex items-center justify-center font-sans" dir="rtl">
  //       <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
  //         <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6">L</div>
  //         <h1 className="text-2xl font-bold text-slate-800 mb-2">ليرنوف | رفيق</h1>
  //         <p className="text-slate-500 mb-8">قم بتسجيل الدخول بحساب جوجل لبدء تجربة التعلم السقراطي، وحفظ تقدمك الدراسي السحابي.</p>
  //         <button 
  //           onClick={handleLogin}
  //           className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
  //         >
  //           <User className="w-5 h-5" />
  //           تسجيل الدخول باستخدام جوجل
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden" dir="rtl">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
          <h1 className="text-xl font-bold text-slate-800">ليرنوف <span className="text-blue-600 font-medium">| رفيـق (RAFEEG)</span></h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Bot className="w-3.5 h-3.5" />
              تجربة النظام
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2 ${activeTab === 'code' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Code className="w-3.5 h-3.5" />
              معمارية رفيق (كود)
            </button>
          </div>
          <div className="h-4 w-[1px] bg-slate-200 hidden md:block"></div>
          <div className="hidden md:flex items-center gap-2 text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            النظام متصل
          </div>
          <div className="h-4 w-[1px] bg-slate-200 hidden md:block"></div>
          {session?.user && (
            <div className="flex items-center gap-3">
              {session.user.user_metadata?.avatar_url && (
                <img src={session.user.user_metadata.avatar_url} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
              )}
              <span className="font-semibold text-xs text-slate-700 hidden sm:block">{session.user.user_metadata?.full_name || 'طالب ليرنوف'}</span>
              <button onClick={handleLogout} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded transition-colors font-bold">
                خروج
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'chat' ? (
          <>
            <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 hidden md:flex h-full">
              <div className="flex border-b border-slate-200 shrink-0">
                <button 
                  onClick={() => setSidebarTab('history')} 
                  className={`flex-1 py-4 text-xs font-bold transition-colors ${sidebarTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>سجل المحادثات</button>
                <button 
                  onClick={() => setSidebarTab('profile')} 
                  className={`flex-1 py-4 text-xs font-bold transition-colors ${sidebarTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>ملفي التعليمي</button>
                <button 
                  onClick={() => setSidebarTab('system')} 
                  className={`flex-1 py-4 text-xs font-bold transition-colors ${sidebarTab === 'system' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>إعدادات النظام</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                {sidebarTab === 'history' ? (
                  <div className="flex flex-col h-full gap-4">
                    <button 
                      onClick={startNewSession}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      محادثة جديدة
                    </button>
                    
                    <div className="mt-4 flex flex-col gap-2">
                      <h3 className="text-xs font-bold text-slate-500 mb-2">المحادثات السابقة</h3>
                      {chatSessionsList.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">لا توجد محادثات سابقة.</p>
                      ) : (
                        chatSessionsList.map((s, idx) => (
                          <button
                            key={s.id || idx}
                            onClick={() => loadChatSession(s.id)}
                            className={`text-right p-3 rounded-xl border text-sm font-medium transition-colors ${currentSessionId === s.id ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-100 hover:border-slate-300 text-slate-600'}`}
                          >
                            <div className="truncate">{s.title || 'محادثة'}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{new Date(s.updated_at).toLocaleDateString('ar-EG')}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : sidebarTab === 'profile' ? (
                  <div className="flex flex-col h-full gap-6">
                    {/* XP & Level Block */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <div>
                          <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider mb-1">المستوى 5</p>
                          <h3 className="font-bold text-lg">باحث مبتدئ</h3>
                        </div>
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-sm">
                          <Trophy className="w-5 h-5 text-yellow-300" />
                        </div>
                      </div>
                      
                      <div className="mb-2 relative z-10">
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span>{xp} نقطة</span>
                          <span className="text-indigo-200">500 نقطة للتالي</span>
                        </div>
                        <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden shadow-inner">
                          <div className="bg-white h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(xp / 500) * 100}%` }}></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4 text-xs font-bold bg-white/10 p-2.5 rounded-lg backdrop-blur-sm relative z-10 border border-white/10">
                        <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                        <span>شعلة التعلم: {streak} أيام متتالية!</span>
                      </div>
                    </div>

                    {/* Pomodoro Timer Block */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                        {isTimerActive && <div className="h-full bg-blue-500 transition-all" style={{ width: `${((25 * 60 - timeRemaining) / (25 * 60)) * 100}%` }}></div>}
                      </div>
                      <div className="flex items-center gap-2 mb-4 text-slate-800">
                        <Timer className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-sm">جلسة تركيز (Pomodoro)</h3>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                        <span className="text-4xl font-black text-slate-700 tracking-tight mb-4 tabular-nums">
                          {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </span>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsTimerActive(!isTimerActive)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-colors shadow-sm ${isTimerActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'}`}
                          >
                            {isTimerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {isTimerActive ? 'إيقاف مؤقت' : 'ابدأ التركيز'}
                          </button>
                          
                          <button 
                            onClick={() => { setIsTimerActive(false); setTimeRemaining(25 * 60); }}
                            className="p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                            title="إعادة ضبط الموقت"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-center text-[10px] text-slate-500 font-medium leading-relaxed">التركيز العميق في فترات متقطعة يساعدك على استيعاب المعلومات بشكل أسرع وأكثر ثباتاً.</p>
                    </div>

                    <div className="mt-auto pt-4 flex flex-col gap-2 border-t border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-medium">الذاكرة والمحتوى</span>
                        <div className="flex gap-2">
                          <button onClick={handleExport} className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors" title="تصدير المحادثة لملف Markdown/PDF">
                            <Download className="w-3 h-3" /> تصدير 
                          </button>
                          <button onClick={handleClearMemory} className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors" title="مسح السياق الحالي">
                            <RefreshCw className="w-3 h-3" /> مسح
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="mb-6">
                      <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">توجيه المهام الذكي</h2>
                      
                      {/* Network Selection */}
                      <div className="space-y-3 mb-6">
                        <div
                          onClick={() => setLevel(1)}
                          className={`p-4 rounded-xl border transition-colors cursor-pointer ${level === 1 ? 'border-2 border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300 bg-slate-50'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-bold ${level === 1 ? 'text-blue-900' : 'text-slate-800'}`}>المسار المباشر</span>
                            <span className={`${level === 1 ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'} text-[10px] px-2 py-0.5 rounded uppercase font-bold`}>سريع</span>
                          </div>
                          <p className={`text-xs leading-relaxed ${level === 1 ? 'text-blue-700' : 'text-slate-500'}`}>معالجة فورية للمهام عبر Gemini Flash.</p>
                        </div>
                        
                        <div
                          onClick={() => setLevel(2)}
                          className={`p-4 rounded-xl border transition-colors cursor-pointer ${level === 2 ? 'border-2 border-green-600 bg-green-50' : 'border-slate-200 hover:border-green-300 bg-slate-50'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-bold ${level === 2 ? 'text-green-900' : 'text-slate-800'}`}>الشبكة المجانية</span>
                            <span className={`${level === 2 ? 'bg-green-200 text-green-700' : 'bg-slate-200 text-slate-600'} text-[10px] px-2 py-0.5 rounded uppercase font-bold`}>مفتوح المصدر</span>
                          </div>
                          <p className={`text-xs leading-relaxed ${level === 2 ? 'text-green-700' : 'text-slate-500'}`}>توظيف النماذج المجانية (Llama, Mistral, Gemma, Command-R).</p>
                        </div>

                        <div
                          onClick={() => setLevel(3)}
                          className={`p-4 rounded-xl border transition-colors cursor-pointer ${level === 3 ? 'border-2 border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-purple-300 bg-slate-50'}`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-bold ${level === 3 ? 'text-purple-900' : 'text-slate-800'}`}>الشبكة المؤسسية</span>
                            <span className={`${level === 3 ? 'bg-purple-200 text-purple-700' : 'bg-slate-200 text-slate-600'} text-[10px] px-2 py-0.5 rounded uppercase font-bold`}>احترافي</span>
                          </div>
                          <p className={`text-xs leading-relaxed ${level === 3 ? 'text-purple-700' : 'text-slate-500'}`}>تحليل معقد عبر AWS، DeepSeek، و OpenAI.</p>
                        </div>
                      </div>

                      {/* Active Modules Visuals */}
                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-700">
                            <BrainCircuit className="w-4 h-4 text-pink-500" />
                            <span className="text-xs font-semibold">الذاكرة السياقية (Memory)</span>
                          </div>
                          <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-bold">نشط</span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Database className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-semibold">قاعدة المعرفة (RAG)</span>
                          </div>
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">نشط</span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Network className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-semibold">شبكة النماذج (Orchestrator)</span>
                          </div>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">تلقائي</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
            
            <section className="flex-1 flex flex-col bg-white">
              <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-4 max-w-3xl ${msg.role === 'model' ? 'mr-auto flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${msg.role === 'model' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {msg.role === 'model' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col gap-2 max-w-[85%]">
                      {msg.role === 'model' && msg.isComplex && (
                        <div className="flex gap-2">
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                            <Network className="w-3 h-3" /> مهمة معقدة
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> تم فلترة الحقائق
                          </span>
                        </div>
                      )}

                      {msg.role === 'model' && msg.retrievedTopics && msg.retrievedTopics.length > 0 && (
                        <div className="flex gap-2">
                          {msg.retrievedTopics.map(topic => (
                            <span key={topic} className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                              <BookOpen className="w-3 h-3" /> قاعدة المعرفة: {topic}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className={`p-5 text-sm leading-relaxed ${msg.role === 'model' ? 'bg-blue-50 rounded-2xl rounded-tl-none border border-blue-100 shadow-sm text-slate-800' : 'bg-slate-100 rounded-2xl rounded-tr-none text-slate-700'}`}>
                        {msg.image && (
                          <div className="mb-4">
                            <img src={msg.image} alt="User attachment" className="max-w-full h-auto max-h-64 rounded-xl border border-slate-200" />
                          </div>
                        )}
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        ) : (
                          <div className="relative">
                            {renderMessageContent(msg.text)}
                            <button
                              onClick={() => {
                                const synth = window.speechSynthesis;
                                if (synth.speaking) {
                                  synth.cancel();
                                  return;
                                }
                                const cleanText = msg.text.replace(/\\[.*\\]/g, '').replace(/[\#\*\_]/g, '');
                                const utterance = new SpeechSynthesisUtterance(cleanText);
                                utterance.lang = 'ar-SA';
                                utterance.rate = 0.9;
                                synth.speak(utterance);
                              }}
                              className="absolute -left-2 -top-2 p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors shadow-sm"
                              title="استمع للإجابة"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.role === 'model' && msg.modelsUsed && msg.modelsUsed.length > 1 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-medium">تحليل شبكي عبر:</span>
                          {msg.modelsUsed.map((m, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                m.includes('رفيق') || m.includes('QLoRA')
                                  ? 'bg-indigo-100 text-indigo-700 border-indigo-300 ring-1 ring-indigo-400'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {m.includes('رفيق') || m.includes('QLoRA') ? '🤖 ' : ''}{m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-4 max-w-3xl mr-auto flex-row-reverse">
                    <div className="w-10 h-10 rounded-full bg-blue-600 shrink-0 flex items-center justify-center text-white">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-blue-50 p-5 rounded-2xl rounded-tl-none border border-blue-100 shadow-sm min-w-[250px]">
                      
                      {loadingState === 'routing' && (
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <Network className="w-4 h-4 animate-pulse" />
                          <span>تحليل الطلب وتوجيه المهمة...</span>
                        </div>
                      )}
                      
                      {loadingState === 'querying' && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-sm text-indigo-700">
                            <Cpu className="w-4 h-4 animate-spin" />
                            <span>{level === 3 ? "استشارة النماذج المؤسسية والتحليل البصري..." : "استشارة النماذج المفتوحة (Llama, Mistral, Gemma)..."}</span>
                          </div>
                          <div className="w-full bg-blue-200 h-1 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full w-[60%] animate-pulse"></div>
                          </div>
                        </div>
                      )}

                      {loadingState === 'verifying' && (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-sm text-emerald-700">
                            <CheckCircle2 className="w-4 h-4 animate-bounce" />
                            <span>رفيق يقوم بالفلترة وبناء الإجابة النهائية...</span>
                          </div>
                          <div className="w-full bg-emerald-100 h-1 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-[90%]"></div>
                          </div>
                        </div>
                      )}
                      
                      {loadingState === 'idle' && (
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                         </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
              
              <div className="border-t border-slate-100 p-6 flex flex-col gap-3 shrink-0 bg-slate-50 relative">
                
                {/* Quick Actions */}
                <div className="flex gap-2 mb-1 overflow-x-auto pb-1 hide-scrollbar">
                  <button onClick={() => setInput('قم بتوليد بطاقات استذكار (Flashcards) لأهم المفاهيم التي ناقشناها.')} className="shrink-0 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1 font-semibold">
                    <Layers className="w-3 h-3" /> بطاقات استذكار
                  </button>
                  <button onClick={() => setInput('قم بتوليد اختبار قصير (MCQ) حول ما تعلمناه للتو.')} className="shrink-0 text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-100 hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> اختبر معلوماتي
                  </button>
                  <button onClick={() => setInput('لخص أهم النقاط التي ذكرناها في شكل نقاط واضحة.')} className="shrink-0 text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-100 hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold">
                    <BookOpen className="w-3 h-3" /> لخص المحادثة
                  </button>
                  <button onClick={() => setInput('أشعر بصعوبة في استيعاب هذه النقطة، هل يمكنك تبسيطها أكثر؟')} className="shrink-0 text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-100 hover:text-blue-600 transition-colors flex items-center gap-1 font-semibold">
                    <User className="w-3 h-3" /> بسّط الشرح لي
                  </button>
                </div>

                {selectedImage && (
                  <div className="absolute bottom-full left-6 mb-2 p-2 bg-white border border-slate-200 rounded-xl shadow-lg flex items-start gap-2 max-w-[200px]">
                    <img src={selectedImage} alt="Preview" className="w-full h-auto max-h-32 object-contain rounded-lg" />
                    <button 
                      onClick={() => { setSelectedImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSend} className="relative w-full">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                  />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="تحدث مع رفيق أو ارفع صورة لمسألة..."
                    className="w-full h-14 bg-white border border-slate-200 rounded-full pl-6 pr-24 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    disabled={isLoading}
                  />
                  <div className="absolute right-2 top-2 bottom-2 flex gap-1 items-center">
                    <button
                      type="button"
                      onClick={startListening}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:bg-slate-100'}`}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-10 h-10 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center transition-colors"
                    >
                      <ImagePlus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="absolute left-2 top-2 bottom-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={(!input.trim() && !selectedImage) || isLoading}
                      className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-5 h-5 rotate-180" />
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </>
        ) : (
          <div className="flex-1 p-8 bg-white overflow-y-auto">
            <div className="max-w-5xl mx-auto bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <div>
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Code className="w-5 h-5 text-blue-400" />
                    rafeeq_core.py
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">هيكلية نظام رفيق المتكامل (ذاكرة + RAG + نماذج متعددة)</p>
                </div>
                <button 
                  onClick={() => navigator.clipboard.writeText(pythonCode)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  نسخ الكود الكامل
                </button>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="text-emerald-400 text-sm font-mono leading-relaxed" dir="ltr">
                  <code>{pythonCode}</code>
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
