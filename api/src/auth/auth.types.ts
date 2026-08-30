export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  session_token_hash: string | null;
  session_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface PublicUser {
  id: string;
  email: string;
  created_at: Date;
}
