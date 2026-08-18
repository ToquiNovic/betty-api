import { Module } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule as NestI18nModule,
  QueryResolver,
} from 'nestjs-i18n';

function resolveI18nPath(): string {
  const possiblePaths = [
    path.join(__dirname, '/'),
    path.join(__dirname, '../i18n/'),
    path.join(__dirname, '../src/i18n/'),
    path.join(process.cwd(), 'dist/i18n/'),
    path.join(process.cwd(), 'dist/src/i18n/'),
    path.join(process.cwd(), 'src/i18n/'),
  ];

  for (const candidate of possiblePaths) {
    if (
      fs.existsSync(candidate) &&
      (fs.existsSync(path.join(candidate, 'es')) ||
        fs.existsSync(path.join(candidate, 'es/translations.json')))
    ) {
      return candidate;
    }
  }

  return path.join(__dirname, '/');
}

@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: 'es',
      loaderOptions: {
        path: resolveI18nPath(),
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
