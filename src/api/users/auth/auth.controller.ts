import { ReturnAuthDto } from '@Users/auth/dto/return-login.dto';
import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './../dto/create-user.dto';
import { AuthService } from './auth.service';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto } from './dto/login.dto';

@ApiTags('Auth')
@ApiResponse({ status: 503, description: 'Service Unavailable, maintenance.' })
@Controller('auth')
export class AuthController {
  @Inject(AuthService)
  readonly service: AuthService;

  @Post('register')
  registerRoute(@Body() body: CreateUserDto): Promise<ReturnAuthDto> {
    const password = body.password;
    return this.service
      .register(body)
      .then((result) =>
        this.service.login({ username: result.username, password: password }),
      );
  }

  @Post('login')
  loginRoute(@Body() body: LoginDto): Promise<ReturnAuthDto> {
    return this.service.login(body);
  }

  @Post('/forgot-password')
  requestPasswordResetRoute(
    @Body() body: ForgotPasswordDto,
    @Req() request: Request,
  ) {
    const userAgent = request.headers['user-agent'];
    return this.service.requestPasswordReset(body.email, userAgent);
  }

  @Post('/reset-password')
  resetPasswordRoute(@Body() body: ResetPasswordDto) {
    return this.service.resetPassword(body.token, body.newPassword);
  }
}
