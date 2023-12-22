import { FileDeletedEntity } from '@Files/entities/file-deleted.entity';
import { FileEntity } from '@Files/entities/file.entity';
import { CRUDService } from '@Helper/crud.service';
import { WinstonLogger } from '@Helper/logger/logger.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import cluster from 'cluster';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { FileSystemStoredFile, MemoryStoredFile } from 'nestjs-form-data';
import * as path from 'path';
import { join } from 'path';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService
  extends CRUDService<FileEntity>
  implements OnModuleInit
{
  constructor(
    @InjectRepository(FileEntity)
    public fileRepository: Repository<FileEntity>,
    @InjectRepository(FileDeletedEntity)
    public fileDeletedRepository: Repository<FileDeletedEntity>,
    private readonly logger: WinstonLogger,
    protected configService: ConfigService,
  ) {
    super(fileRepository, 'File');
    this.defaultOrder = {
      created_at: 'DESC',
    };
  }

  async onModuleInit() {
    const tableNameFile = this.fileRepository.metadata.tableName;
    const tableNameFileDeleted = this.fileDeletedRepository.metadata.tableName;

    await this.dataSource.query(`
      CREATE OR REPLACE FUNCTION ${tableNameFile}_delete_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO ${tableNameFileDeleted} (path) VALUES (OLD.path);
          RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
      `);

    const triggerExists = await this.dataSource.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = '${tableNameFile}'
        AND trigger_name = 'after_${tableNameFile}_delete'
    `);

    if (triggerExists.length === 0) {
      await this.dataSource.query(`
      CREATE TRIGGER after_${tableNameFile}_delete
      AFTER DELETE ON ${tableNameFile}
      FOR EACH ROW
      EXECUTE FUNCTION ${tableNameFile}_delete_trigger();
      `);
    }

    await this.deleteAllFile();
  }

  private getPathForNewFile() {
    const destinationPath = this.configService.get('FILE_DEST');
    const uuidFileName = uuidv4();

    mkdirSync(destinationPath, { recursive: true });

    return path.join(destinationPath, `${uuidFileName}`);
  }

  public async createFile(
    file?:
      | FileSystemStoredFile
      | MemoryStoredFile
      | Express.Multer.File
      | {
          path: string;
          originalname: string;
          mimetype: string;
        }
      | null,
  ): Promise<FileEntity | null> {
    if (!file) {
      return null;
    }

    if (file instanceof FileSystemStoredFile) {
      return await this.createFileWithFileSystemStoredFile(file);
    } else if (file instanceof MemoryStoredFile) {
      return await this.createFileWithMemoryStoredFile(file);
    } else {
      return await this.createFileMulter(file);
    }
  }

  private async createFileMulter(
    file:
      | Express.Multer.File
      | { path: string; originalname: string; mimetype: string },
  ): Promise<FileEntity> {
    return this.create({
      name: file.originalname ? file.originalname : 'lmol.jpeg',
      path: file.path,
      mimetype: file.mimetype,
    });
  }

  private async createFileWithFileSystemStoredFile(
    file: FileSystemStoredFile,
  ): Promise<FileEntity> {
    let newFilePath;
    try {
      newFilePath = this.getPathForNewFile();

      renameSync(file.path, newFilePath);

      file.path = newFilePath;
    } catch (error) {
      throw new HttpException(
        'Error processing file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    try {
      return await this.create({
        name: file.originalName ? file.originalName : 'lmol.jpeg',
        path: newFilePath,
        mimetype: file.mimetype,
      });
    } catch (error) {
      unlinkSync(newFilePath);
      throw error;
    }
  }

  private async createFileWithMemoryStoredFile(
    file: MemoryStoredFile,
  ): Promise<FileEntity> {
    let newFilePath;
    try {
      newFilePath = this.getPathForNewFile();

      writeFileSync(newFilePath, file.buffer);
    } catch (error) {
      throw new HttpException(
        "Erreur lors de l'écriture du fichier",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      return await this.create({
        name: file.originalName ? file.originalName : 'lmol.jpeg',
        path: newFilePath,
        mimetype: file.mimetype,
      });
    } catch (error) {
      unlinkSync(newFilePath);
      throw error;
    }
  }

  async downloadFile(response: Express.Response, id: string) {
    const file = await this.findOneByIdSpe(id);

    if (!existsSync(file.path)) {
      const errorDetails = {
        message: `File not found for item with id: ${id}, path: ${file.path}.`,
        code: 'FILE_NOT_FOUND_ERROR',
        timestamp: new Date().toISOString(),
      };
      this.logger.error(errorDetails, new Error().stack);
      throw new HttpException(
        `File not found for item with id: ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const fileStream = this.fileStream(file.path);
    (response as any).attachment(file.name);

    return new StreamableFile(fileStream, { type: file.mimetype });
  }

  async showFile(id: string) {
    const file = await this.findOneByIdSpe(id);

    if (!existsSync(file.path)) {
      const errorDetails = {
        message: `File not found for item with id: ${id}, path: ${file.path}.`,
        code: 'FILE_NOT_FOUND_ERROR',
        timestamp: new Date().toISOString(),
      };
      this.logger.error(errorDetails, new Error().stack);
      throw new HttpException(
        `File not found for item with id: ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }

    const fileStream = this.fileStream(file.path);

    return new StreamableFile(fileStream, { type: file.mimetype });
  }

  fileBuffer(path: string) {
    return readFileSync(join(process.cwd(), path));
  }

  fileStream(path: string) {
    return createReadStream(join(process.cwd(), path));
  }

  async duplicateFile(id: string): Promise<FileEntity | undefined> {
    const oldFile = await this.findOne([], { id });

    if (!oldFile) {
      const errorDetails = {
        message: `File not found for item with id: ${id}. Skipping file duplication.`,
        code: 'FILE_DUPLICATION_NOT_FOUND_ERROR',
        timestamp: new Date().toISOString(),
      };
      this.logger.error(errorDetails, new Error().stack);
      return undefined;
    }

    try {
      const fileBuffer = this.fileBuffer(oldFile.path);
      const newFilePath = this.getPathForNewFile();

      writeFileSync(newFilePath, fileBuffer);

      return await this.createFile({
        originalname: oldFile.name,
        path: newFilePath,
        mimetype: oldFile.mimetype,
      });
    } catch (error) {
      const errorDetails = {
        message: `Error duplicating file for item with id: ${id}. Skipping file duplication.`,
        code: 'FILE_DUPLICATION_ERROR',
        timestamp: new Date().toISOString(),
      };
      this.logger.error(errorDetails, error.stack);
      return undefined;
    }
  }

  async findOneByIdSpe(id: string) {
    const file = await this.fileRepository.findOne({
      where: { id: id },
      select: ['id', 'path', 'name', 'mimetype'],
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }
    return file;
  }

  async removeById(id: string): Promise<void> {
    const file = await this.findOne([], { id: id });
    if (!file) {
      throw new NotFoundException(`File with ID ${id} not found`);
    }

    await this.repository.remove(file);
  }

  async deleteAllFile() {
    const filesToDelete = await this.fileDeletedRepository.find();

    await Promise.all(
      filesToDelete.map(async (file) => {
        if (existsSync(file.path)) {
          try {
            unlinkSync(file.path);
            await this.fileDeletedRepository.remove(file);
          } catch (error) {
            const errorDetails = {
              message: `${file.path} wasn't deleted`,
              code: 'FILE_DELETE_ERROR',
              timestamp: new Date().toISOString(),
            };
            this.logger.error(errorDetails, error.stack);
          }
        }
      }),
    );
  }

  @Cron('0 0 * * *')
  private async handleCron() {
    if (cluster.isPrimary) {
      await this.deleteAllFile();
    }
  }
}
