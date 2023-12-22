import { AddDescription } from '@Helper/doc/add-description.decorator';
import { NoCompression } from '@Helper/no-compression.decorator';
import { NoTransform } from '@Helper/no-transform.decorator';
import { RolesEnum } from '@Roles/roles';
import { Auth } from '@Users/auth/other/auth.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateFileDto } from './dto/create-file.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiResponse({ status: 503, description: 'Service Unavailable, maintenance.' })
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('download/:id')
  @AddDescription('Download file')
  @ApiResponse({
    schema: {
      type: 'string',
      format: 'binary',
    },
    status: HttpStatus.OK,
  })
  @NoTransform()
  @NoCompression()
  async download(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Express.Response,
  ) {
    return this.filesService.downloadFile(response, id);
  }

  @Get('show/:id')
  @AddDescription('Show file')
  @ApiResponse({
    schema: {
      type: 'string',
      format: 'binary',
    },
    status: HttpStatus.OK,
  })
  @NoTransform()
  @NoCompression()
  async show(@Param('id') id: string) {
    return this.filesService.showFile(id);
  }

  @Post()
  @Auth(RolesEnum.Admin)
  create(@Body() createFileDto: CreateFileDto) {
    return this.filesService.create(createFileDto);
  }

  @Get()
  @Auth(RolesEnum.Admin)
  findAll() {
    return this.filesService.findAll();
  }

  @Get(':id')
  @Auth(RolesEnum.Admin)
  findOne(@Param('id') id: string) {
    return this.filesService.findOneByIdSpe(id);
  }

  @Delete(':id')
  @Auth(RolesEnum.Admin)
  remove(@Param('id') id: string) {
    return this.filesService.removeById(id);
  }
}
