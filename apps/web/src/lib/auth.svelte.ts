import { env } from '$env/dynamic/public';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

export const authConfigured = Boolean(env.PUBLIC_SUPABASE_URL && env.PUBLIC_SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
	client ??= createClient(env.PUBLIC_SUPABASE_URL!, env.PUBLIC_SUPABASE_ANON_KEY!, {
		auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
	});
	return client;
}

/** Reactive auth state for the browser. Call `init()` from onMount. */
class AuthState {
	session = $state<Session | null>(null);
	ready = $state(false);

	get email(): string | null {
		return this.session?.user.email ?? null;
	}

	get token(): string | null {
		return this.session?.access_token ?? null;
	}

	async init(): Promise<void> {
		if (!authConfigured) {
			this.ready = true;
			return;
		}
		const { data } = await supabase().auth.getSession();
		this.session = data.session;
		this.ready = true;
		supabase().auth.onAuthStateChange((_event, session) => {
			this.session = session;
		});
	}

	async signIn(redirectPath = '/app'): Promise<void> {
		await supabase().auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: `${window.location.origin}${redirectPath}` }
		});
	}

	async signOut(): Promise<void> {
		await supabase().auth.signOut();
		this.session = null;
	}
}

export const auth = new AuthState();
