import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from './domain/ports/user.repository.port';
import { UserEntity } from './domain/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('auth.user_not_found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email);
  }

  async findAll(limit = 50, offset = 0): Promise<UserEntity[]> {
    return this.userRepository.findAll(limit, offset);
  }

  async updateProfile(id: string, data: { name?: string; avatarUrl?: string }): Promise<UserEntity> {
    await this.findById(id);
    return this.userRepository.update(id, data);
  }

  async updateRole(id: string, role: 'admin' | 'user'): Promise<UserEntity> {
    await this.findById(id);
    return this.userRepository.update(id, { role });
  }
}
