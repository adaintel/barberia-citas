// Centralizamos toda la configuración aquí
window.supabaseConfig = {
  url: 'https://azjlrbmgpczuintqyosm.supabase.co',
  key: 'tu-key-aquí'
};

if (!window.supabase) {
  window.supabase = supabase.createClient(
    window.supabaseConfig.url, 
    window.supabaseConfig.key
  );
}
