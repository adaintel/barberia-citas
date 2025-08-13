// Configuración de Supabase
const SUPABASE_URL = 'https://tu-proyecto-supabase.supabase.co';
const SUPABASE_KEY = 'tu-clave-publica-supabase';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;