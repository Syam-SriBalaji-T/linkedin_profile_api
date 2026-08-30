import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfig } from './config/configuration';
import { CorsService } from './cors/cors.service';

type CorsCallback = (err: Error | null, allow?: boolean) => void;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfig);
  const cors = app.get(CorsService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: CorsCallback) => {
      if (!requestOrigin) {
        callback(null, true);
        return;
      }

      cors
        .isAllowed(requestOrigin)
        .then((allowed) => callback(null, allowed))
        .catch(() => callback(null, false));
    },
  });

  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
  new Logger('Bootstrap').log(`Unfurl API listening on port ${config.port}`);
}

void bootstrap();
