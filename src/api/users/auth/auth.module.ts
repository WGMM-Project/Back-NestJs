import { getAsStringConfig } from '@Helper/fn/get-as-config.helper';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '@Users/entities/user.entity';
import { UsersCacheService } from '@Users/users.caches.service';
import { UsersModule } from '@Users/users.module';
import { UsersService } from '@Users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthHelper } from './other/auth.helper';
import { JwtStrategy } from './other/auth.strategy';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthHelper,
    JwtStrategy,
    {
      provide: 'USERS_SERVICE', // or use UsersService directly if it's exported
      useExisting: forwardRef(() => UsersService),
    },
    UsersCacheService,
  ],
  exports: [AuthService, AuthHelper],
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    PassportModule.register({ defaultStrategy: 'jwt', property: 'user' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: getAsStringConfig(configService, 'JWT_SECRET'),
        signOptions: {
          expiresIn: getAsStringConfig(configService, 'JWT_EXPIRES'),
        },
      }),
    }),
    forwardRef(() => UsersModule),
  ],
})
export class AuthModule {}
