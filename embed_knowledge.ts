import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { knowledgeBase } from "./src/data/knowledge.ts";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function main() {
  console.log("Generating and uploading embeddings to Supabase...");
  
  for (const [topic, content] of Object.entries(knowledgeBase)) {
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
        console.log(`Successfully embedded: ${topic}`);
      }
    } catch (e) {
      console.error(`Error with ${topic}:`, e);
    }
  }
  console.log("Done!");
}

main();
