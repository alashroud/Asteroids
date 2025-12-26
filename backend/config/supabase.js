import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Missing Supabase environment variables. Please check your .env file.');
  console.warn('Required: SUPABASE_URL and SUPABASE_ANON_KEY');
  console.warn('The server will start but database operations will fail.');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized successfully');
}

export default supabase;
