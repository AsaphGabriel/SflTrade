import React, { useState } from 'react';
import { signUp, signInWithPassword, signInWithOtp, signOut } from '../services/authService';
import { t } from '../i18n';

const AuthModal = ({ isOpen, onClose, user, currentLang = 'pt', onAuthChange }) => {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup' | 'magiclink'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  if (!isOpen) return null;

  const showMessage = (text, type = 'error', duration = 4000) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), duration);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showMessage(currentLang === 'pt' ? 'Preencha e-mail e senha.' : 'Fill in email and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await signInWithPassword({ email, password });
      showMessage(currentLang === 'pt' ? '✅ Login efetuado com sucesso!' : '✅ Logged in successfully!', 'success');
      if (onAuthChange) onAuthChange(data.user);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      showMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showMessage(currentLang === 'pt' ? 'Preencha e-mail e senha.' : 'Fill in email and password.');
      return;
    }
    if (password.length < 6) {
      showMessage(currentLang === 'pt' ? 'A senha deve ter no mínimo 6 caracteres.' : 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await signUp({ email, password });
      showMessage(currentLang === 'pt' ? '✅ Conta criada! Verifique seu e-mail para confirmar.' : '✅ Account created! Check your email to confirm.', 'success', 6000);
      if (data.user && onAuthChange) onAuthChange(data.user);
    } catch (err) {
      showMessage(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) {
      showMessage(currentLang === 'pt' ? 'Informe o e-mail.' : 'Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      await signInWithOtp({ email });
      showMessage(currentLang === 'pt' ? '📩 Link Mágico enviado! Confira sua caixa de entrada.' : '📩 Magic link sent! Check your inbox.', 'success', 6000);
    } catch (err) {
      showMessage(err.message || 'Erro ao enviar Link Mágico.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      showMessage(currentLang === 'pt' ? 'Desconectado com sucesso.' : 'Logged out successfully.', 'info');
      if (onAuthChange) onAuthChange(null);
      setTimeout(() => onClose(), 800);
    } catch (err) {
      showMessage(err.message || 'Erro ao sair.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⚡</span>
            <h3 className="font-bold text-amber-400 text-lg">
              {t('authTitle', currentLang)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Status Atual do Usuário */}
        <div className="px-6 py-3 bg-slate-800/40 border-b border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400">{currentLang === 'pt' ? 'Status:' : 'Status:'}</span>
          {user ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {t('authStatusConnected', currentLang, { email: user.email })}
            </span>
          ) : (
            <span className="text-amber-300/80 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400/50"></span>
              {t('authStatusGuest', currentLang)}
            </span>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Se logado, exibe card do perfil com botão de logout */}
          {user ? (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700/60">
                <p className="text-sm text-slate-300">
                  {currentLang === 'pt' ? 'Sua conta está conectada e sincronizada!' : 'Your account is connected and synchronized!'}
                </p>
                <p className="text-xs text-amber-400/90 mt-1">
                  {t('syncNotice', currentLang)}
                </p>
              </div>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="w-full bg-rose-600/90 hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="animate-spin text-sm">⌛</span>
                ) : (
                  <>
                    <span>🚪</span>
                    <span>{t('btnLogout', currentLang)}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Abas de Navegação entre Modos */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`py-2 rounded-lg transition ${authMode === 'login' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t('btnLogin', currentLang)}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className={`py-2 rounded-lg transition ${authMode === 'signup' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {t('btnSignUp', currentLang)}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('magiclink')}
                  className={`py-2 rounded-lg transition ${authMode === 'magiclink' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Magic Link
                </button>
              </div>

              {/* Formulário de Login / Cadastro / Magic Link */}
              <form onSubmit={authMode === 'login' ? handleLogin : authMode === 'signup' ? handleSignUp : handleMagicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t('labelEmail', currentLang)}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-slate-950 text-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 text-sm"
                  />
                </div>

                {authMode !== 'magiclink' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t('labelPassword', currentLang)}
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 text-slate-100 px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400 text-sm"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm mt-2"
                >
                  {loading ? (
                    <span className="animate-spin text-sm">⌛</span>
                  ) : (
                    <span>
                      {authMode === 'login' && t('btnLogin', currentLang)}
                      {authMode === 'signup' && t('btnSignUp', currentLang)}
                      {authMode === 'magiclink' && t('btnMagicLink', currentLang)}
                    </span>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Mensagens de Feedback */}
          {msg.text && (
            <div className={`p-3 rounded-xl border text-xs font-medium text-center ${
              msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
              msg.type === 'info' ? 'bg-sky-500/10 border-sky-500/30 text-sky-300' :
              'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {msg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
