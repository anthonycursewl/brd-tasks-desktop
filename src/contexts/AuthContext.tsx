import { createContext, useState, useEffect, useCallback, ReactNode } from "react";
import { AuthState } from "../types/auth";
import { auth as authService } from "../services/auth";
import { setTokens } from "../services/api";

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(authService.load);

  useEffect(() => {
    const saved = authService.load();
    if (saved.mode === "account" && saved.tokens) {
      setTokens(saved.tokens);
      authService.verify(saved.tokens).then((user) => {
        if (!user) {
          authService.refreshToken(saved.tokens!).then((tokens) => {
            setTokens(tokens);
          }).catch(() => {
            const guest = authService.logout();
            setState(guest);
          });
        } else {
          setState({ ...saved, user: { ...saved.user, ...user } });
        }
      });
    } else {
      setState(saved);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const newState = await authService.loginWithEmail(email, password);
    setState(newState);
    if (newState.tokens) setTokens(newState.tokens);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const newState = await authService.register(name, email, password);
    setState(newState);
    if (newState.tokens) setTokens(newState.tokens);
  }, []);

  const logout = useCallback(() => {
    const newState = authService.logout();
    setState(newState);
    setTokens(null);
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}


