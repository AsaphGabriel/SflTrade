import { supabase } from './supabase';

/**
 * Cadastrar novo usuário com e-mail e senha
 */
export async function signUp({ email, password }: { email: string; password?: string }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: password || "",
  });
  if (error) throw error;
  return data;
}

/**
 * Login com e-mail e senha
 */
export async function signInWithPassword({ email, password }: { email: string; password?: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: password || "",
  });
  if (error) throw error;
  return data;
}

/**
 * Login via Magic Link / OTP por e-mail
 */
export async function signInWithOtp({ email }: { email: string }) {
  // Constrói o redirecionamento preservando a rota base (/SflTrade/) no GitHub Pages
  const basePath = (import.meta as any).env?.BASE_URL || '/';
  const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const redirectUrl = `${window.location.origin}${cleanBase}`;

  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sair da conta (Logout)
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Obter a sessão atual
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Obter dados do usuário atual
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Escutar mudanças de estado de autenticação
 */
export function onAuthStateChange(callback: (event: string, session: { user: { id: string; email?: string } } | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: { user: { id: string; email?: string } } | null) => {
    callback(event, session);
  });
  return subscription;
}
