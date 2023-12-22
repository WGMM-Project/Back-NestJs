import { Trim } from 'class-sanitizer';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 30)
  password: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty()
  @IsEmail()
  @Trim()
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty()
  @Trim()
  token: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 30)
  newPassword: string;
}
