import { UserEntity } from '@/api/users/entities/user.entity';
import { UsersCacheService } from '@Users/users.caches.service';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

@Injectable()
export class AuthHelper {
  constructor(
    @InjectRepository(UserEntity)
    private repository: Repository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly usersCacheService: UsersCacheService,
  ) {}

  public async decode(token: string): Promise<unknown> {
    return this.jwt.decode(token);
  }

  // Get User by User ID we get from decode()
  public async validateUser(decoded: any): Promise<UserEntity> {
    let cache = false;
    let userExists = await this.usersCacheService.get({ id: decoded.id });

    if (!userExists) {
      userExists = await this.repository.findOne({ where: { id: decoded.id } });
    } else {
      cache = true;
    }

    if (userExists && !cache) {
      await this.usersCacheService.set({ id: decoded.id }, userExists);
    }

    return userExists;
  }

  // Generate JWT Token
  public generateToken(user: UserEntity): string {
    return this.jwt.sign({ id: user.id });
  }

  // Validate User's password
  public isPasswordValid(password: string, userPassword: string): boolean {
    return bcrypt.compareSync(password, userPassword);
  }

  // Encode User's password
  public encodePassword(password: string): string {
    const salt: string = bcrypt.genSaltSync();

    return bcrypt.hashSync(password, salt);
  }
}
