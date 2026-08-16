import { Module } from '@nestjs/common';
import * as path from 'path';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule as NestI18nModule,
  QueryResolver,
} from 'nestjs-i18n';

@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: 'es',
      loaderOptions: {
        path: path.join(__dirname, '/'),
        watch: process.env.NODE_ENV !== 'production',
      },
      resolvers: [
        new QueryResolver(['lang', 'l']),
        new HeaderResolver(['x-custom-lang']),
        AcceptLanguageResolver,
      ],
    }),
  ],
  exports: [NestI18nModule],
})
export class AppI18nModule {}
