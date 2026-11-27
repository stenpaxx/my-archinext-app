import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://iwranbmtvvvugnbkyage.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3cmFuYm10dnZ2dWduYmt5YWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NjYwMzAsImV4cCI6MjExMTA0MjAzMH0.03nd78iRGQBfWL31uZQ2NPJ9iK55vGzAgTNQ6z_h6bE';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}