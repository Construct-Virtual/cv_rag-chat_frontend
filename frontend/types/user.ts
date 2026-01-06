export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  last_login?: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}
