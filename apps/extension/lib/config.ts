const env = import.meta.env;

export const config = {
    apiUrl: (env.WXT_API_URL || 'https://cooread.brimble.app').replace(/\/+$/, ''),
    webUrl: (env.WXT_WEB_URL || 'https://coreeeder.brimble.app').replace(/\/+$/, ''),
    supabaseUrl: (env.WXT_SUPABASE_URL || '').replace(/\/+$/, ''),
    supabaseAnonKey: env.WXT_SUPABASE_ANON_KEY || '',
};

export const authConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
