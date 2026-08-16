import { UserEntity } from '../entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByGoogleId(googleId: string): Promise<UserEntity | null>;
  findAll(limit?: number, offset?: number): Promise<UserEntity[]>;
  create(user: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, user: Partial<UserEntity>): Promise<UserEntity>;
  delete(id: string): Promise<boolean>;
}
