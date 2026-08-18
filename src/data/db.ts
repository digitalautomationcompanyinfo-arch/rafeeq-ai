import { createClient } from '@supabase/supabase-js';

// يمكنك الحصول على هذه الروابط من لوحة تحكم Supabase
// ويجب وضعها في ملف .env الخاص بك
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// دوال التفاعل مع قاعدة البيانات السحابية (PostgreSQL عبر Supabase)
// ============================================================================

export const getUser = async (id: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) console.error("Error fetching user:", error);
  return data;
};

export const upsertUser = async (user: { id: string; email: string; name: string; picture: string }) => {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) console.error("Error upserting user:", error);
  return data;
};

export const updateXP = async (id: string, xpToAdd: number) => {
  // نجلب الـ XP الحالي أولاً
  const user = await getUser(id);
  if (!user) return null;
  
  const newXp = (user.xp || 0) + xpToAdd;
  
  const { data, error } = await supabase
    .from('users')
    .update({ xp: newXp })
    .eq('id', id)
    .select('xp, streak')
    .single();
    
  if (error) console.error("Error updating XP:", error);
  return data;
};

// ============================================================================
// دوال إدارة جلسات الدردشة (Chat Sessions)
// ============================================================================

export const createChatSession = async (userId: string, title: string) => {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert([{ user_id: userId, title }])
    .select()
    .single();
  if (error) console.error("Error creating session:", error);
  return data;
};

export const getChatSessions = async (userId: string) => {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) console.error("Error fetching sessions:", error);
  return data || [];
};

export const getChatMessages = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) console.error("Error fetching messages:", error);
  return data || [];
};

export const addChatMessage = async (sessionId: string, role: 'user' | 'model', content: string) => {
  const { error } = await supabase
    .from('messages')
    .insert([{ session_id: sessionId, role, content }]);
    
  if (error) {
      console.error("Error adding message:", error);
  } else {
      // Update session timestamp
      await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
  }
};
