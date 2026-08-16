import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';
import { UsersService } from '../../../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  authProvider: 'email' | 'google';
  role?: 'admin' | 'user';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret =
      configService.get<string>('auth.jwtSecret') ||
      'super_secret_jwt_key_change_in_production_32chars!';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('auth.unauthorized');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl || undefined,
      authProvider: user.authProvider,
      role: user.role,
    };
  }
}
