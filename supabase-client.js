const SUPABASE_URL = 'https://xyrjqbsoubdwywulhwgy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cmpxYnNvdWJkd3l3dWxod2d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTI1NjMsImV4cCI6MjA3MTE4ODU2M30.BVU2-8K9-ysl-aaVp0uJqtckiAZXjoMJtnZboDwp7UQ';

// Agora funciona porque o script do Supabase no HTML cria a variável global "supabase"
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Se quiser acessar de qualquer lugar no navegador:
window.supabase = supabaseClient;