import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigModule } from './config/config.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      imports: [AppConfigModule, UsersModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
    }),
  ],
})
export class AppModule {}
