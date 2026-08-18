import { createClient } from '@supabase/supabase-js';

// يمكنك الحصول على هذه الروابط من لوحة تحكم Supabase
// ويجب وضعها في ملف .env الخاص بك
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

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
