import { AddSummary } from '@Helper/doc/add-summary.decorator';
import { RolesEnum } from '@Helper/roles/roles';
import { ReturnUserWithoutPasswordDto } from '@Users/dto/return-user.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from './auth/other/auth.decorator';
import { CreateUserAdminDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { User } from './other/user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiResponse({ status: 503, description: 'Service Unavailable, maintenance.' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Auth()
  @AddSummary(
    'Fetches the profile details of the currently authenticated user.',
  )
  getMeRoute(@User() user: UserEntity): Promise<ReturnUserWithoutPasswordDto> {
    return this.usersService.findOne([], { id: user.id });
  }

  @Put('me')
  @Auth()
  @AddSummary(
    'Updates the profile information of the currently authenticated user.',
  )
  updateMeRoute(
    @User() user: UserEntity,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ReturnUserWithoutPasswordDto> {
    return this.usersService.updateService(user.id, updateUserDto);
  }

  @Delete('me')
  @Auth()
  @AddSummary('Deletes the account of the currently authenticated user.')
  removeMeRoute(@User() user: UserEntity) {
    return this.usersService.deleteService(user.id);
  }

  @Get()
  @Auth(RolesEnum.Admin)
  @AddSummary('Retrieves a list of all users purposes.')
  findAllRoute(): Promise<ReturnUserWithoutPasswordDto[]> {
    return this.usersService.findAll();
  }

  @Get(':uuid')
  @Auth(RolesEnum.Admin)
  @AddSummary('Finds a specific user by their unique identifier (UUID).')
  findOneRoute(
    @Param('uuid') uuid: string,
  ): Promise<ReturnUserWithoutPasswordDto> {
    return this.usersService.findOne([], { id: uuid });
  }

  @Post()
  @Auth(RolesEnum.Admin)
  @AddSummary('Creates a new user with administrative privileges.')
  createUserAdminRoute(
    @Body() body: CreateUserAdminDto,
  ): Promise<ReturnUserWithoutPasswordDto> {
    return this.usersService.createAdmin(body);
  }

  @Put(':uuid')
  @Auth(RolesEnum.Admin)
  @AddSummary('Updates the information of a user identified by UUID.')
  async updateRoute(
    @Param('uuid') uuid: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: UserEntity,
  ): Promise<ReturnUserWithoutPasswordDto> {
    return this.usersService.updateService(uuid, updateUserDto, user);
  }

  @Delete(':uuid')
  @Auth(RolesEnum.Admin)
  @AddSummary('Removes a user from the system by their UUID.')
  async removeRoute(@Param('uuid') uuid: string, @User() user: UserEntity) {
    return this.usersService.deleteService(uuid, user);
  }
}
