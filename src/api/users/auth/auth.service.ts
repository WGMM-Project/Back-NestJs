import { ReturnAuthDto } from '@Users/auth/dto/return-login.dto';
import { UserEntity } from '@Users/entities/user.entity';
import { UsersService } from '@Users/users.service';
import { MailerService } from '@nestjs-modules/mailer';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { plainToClass } from 'class-transformer';
import { CreateUserDto } from './../dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { AuthHelper } from './other/auth.helper';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly helper: AuthHelper,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  public async register(createUserDto: CreateUserDto): Promise<ReturnAuthDto> {
    const hashedPassword = this.helper.encodePassword(createUserDto.password);

    const userWithPassword = await this.userService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    if (!userWithPassword) {
      throw new NotFoundException('User not registered.');
    }

    delete userWithPassword.password;

    const authReturnDto = plainToClass(ReturnAuthDto, userWithPassword, {
      excludeExtraneousValues: false,
    });

    authReturnDto.token = '';

    return authReturnDto;
  }

  private async findOneUserWithPassword(
    usernameOrEmail: string,
  ): Promise<UserEntity | undefined> {
    return this.userService.findOneUserWithPassword(usernameOrEmail);
  }

  public async login(loginDto: LoginDto): Promise<ReturnAuthDto> {
    const { username, password } = loginDto;
    const user = await this.findOneUserWithPassword(username);

    if (!user) {
      throw new NotFoundException('Wrong email/username or password.');
    }

    const isPasswordValid = this.helper.isPasswordValid(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new NotFoundException('Wrong email/username or password.');
    }

    const token = this.helper.generateToken(user);

    delete user.password;

    const authReturnDto = plainToClass(ReturnAuthDto, user, {
      excludeExtraneousValues: false,
    });

    authReturnDto.token = token;

    return authReturnDto;
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    userAgent: string,
  ) {
    const url = `https://intra-gie.fr/reset_forgot_password?token=${token}`;

    await this.mailerService.sendMail({
      to: email, // destinataire
      subject: 'Réinitialisation de votre mot de passe',
      template: 'reset-password',
      context: {
        action_url: url,
        user_agent: userAgent,
      },
    });
  }

  async requestPasswordReset(email: string, user_agent: string) {
    const user = await this.userService.findOne([], {
      email,
    });

    if (!user) {
      throw new NotFoundException('No user found with the email ' + email);
    }

    const token = await this.generatePasswordResetToken(user.id);

    await this.sendPasswordResetEmail(email, token, user_agent);
  }

  async generatePasswordResetToken(userId: string): Promise<string> {
    const payload = {
      sub: userId,
      type: 'reset-password',
    };

    return this.jwtService.sign(payload, { expiresIn: '10m' });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let userId: string;

    try {
      const payload: any = this.jwtService.verify(token);
      userId = payload.sub;
    } catch (error) {
      throw new UnauthorizedException('Invalid password reset token');
    }

    const user = await this.userService.findOne([], { id: userId });

    if (!user) {
      throw new HttpException(
        'User with id ' + userId + ' does not exist',
        HttpStatus.NOT_FOUND,
      );
    }

    const password = this.helper.encodePassword(newPassword);

    await this.userService.update(user.id, { password });
  }
}
