import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('auth.google.clientId') || 'dummy-id',
      clientSecret: configService.get<string>('auth.google.clientSecret') || 'dummy-secret',
      callbackURL: configService.get<string>('auth.google.callbackUrl') || 'http://localhost:3000/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    const user = {
      googleId: id,
      email: emails[0]?.value,
      name: `${name.givenName || ''} ${name.familyName || ''}`.trim() || profile.displayName,
      avatarUrl: photos[0]?.value,
      accessToken,
    };
    done(null, user);
  }
}
