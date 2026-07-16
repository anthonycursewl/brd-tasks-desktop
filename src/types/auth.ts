export type AuthMode = "guest" | "account";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthState {
  mode: AuthMode;
  user: AuthUser | null;
  tokens: AuthTokens | null;
}
