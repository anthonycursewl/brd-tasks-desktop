import { useState, useCallback } from "react";
import { LogIn, UserPlus, X, Mail, Lock, User } from "lucide-react";
import "./LoginForm.css";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onCancel: () => void;
}

type Mode = "login" | "register";

export function LoginForm({ onLogin, onRegister, onCancel }: LoginFormProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "register" && !name.trim()) { setError("Nombre requerido"); return; }
    if (!email.trim() || !password) { setError("Completa todos los campos"); return; }
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await onLogin(email.trim(), password);
      } else {
        await onRegister(name.trim(), email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || "Error");
    } finally {
      setBusy(false);
    }
  }, [mode, name, email, password, onLogin, onRegister]);

  const switchMode = useCallback(() => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  }, [mode]);

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <div className="login-header">
          <div className="login-brands">
            <img src="https://sales.malet.app/malet/logo_malet.svg" className="login-brand brand-logo-white" alt="Malet" />
            <img src="/brd/brd_dark_logo_nobg.png" className="login-brand brand-logo-white" alt="BRD" />
          </div>
          <button className="login-close" onClick={onCancel} type="button">
            <X size={14} />
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="login-field">
              <User size={12} />
              <input
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                autoFocus
              />
            </label>
          )}

          <label className="login-field">
            <Mail size={12} />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              autoFocus={mode === "login"}
            />
          </label>

          <label className="login-field">
            <Lock size={12} />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={busy}>
            {mode === "login" ? <LogIn size={12} /> : <UserPlus size={12} />}
            {busy ? (mode === "login" ? "Entrando..." : "Registrando...") : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <div className="login-switch">
          {mode === "login" ? (
            <span>¿No tienes cuenta? <button className="switch-link" onClick={switchMode}>Regístrate</button></span>
          ) : (
            <span>¿Ya tienes cuenta? <button className="switch-link" onClick={switchMode}>Inicia sesión</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
