export class UserEntity {
  id: string;
  email: string;
  name: string;
  passwordHash?: string | null;
  avatarUrl?: string | null;
  authProvider: 'email' | 'google';
  roleId?: string | null;
  role: 'admin' | 'user';
  googleId?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  toJSON() {
    const { passwordHash, ...safeUser } = this;
    return safeUser;
  }
}
