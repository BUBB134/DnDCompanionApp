export type AuthUser = {
  email: string;
  id: string;
  name: string;
};

export type AuthSession = {
  expiresAt: string;
  user: AuthUser;
};
