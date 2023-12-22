import { FileEntity } from '@Files/entities/file.entity';
import { FilesService } from '@Files/files.service';
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileRecord {
  path: string;
  fileEntity?: FileEntity;
}

export class FileManager {
  public fileRecords: FileRecord[] = [];
  public filesService: FilesService;

  constructor(filesService: FilesService) {
    this.filesService = filesService;
  }

  async createFile(
    mimeType: string,
    size: number,
    saveToDb: boolean,
    autoErease: boolean = true,
  ): Promise<FileRecord> {
    const extension = this.getExtensionFromMimeType(mimeType);
    const filename = `${uuidv4()}.${extension}`;
    const directoryPath = path.join('./', 'testFile');
    const filePath = path.join(directoryPath, filename);

    mkdirSync(directoryPath, { recursive: true });

    const content = 'a'.repeat(size);

    writeFileSync(filePath, content);

    let object;

    if (saveToDb) {
      // Enregistrer le chemin et l'ID en DB
      const fileEntity = await this.filesService.createFile({
        path: filePath,
        originalname: filename,
        mimetype: mimeType,
      });

      object = { path: filePath, fileEntity: fileEntity };
      if (autoErease) this.fileRecords.push(object);
    } else {
      object = { path: filePath, fileEntity: undefined };
      if (autoErease) this.fileRecords.push(object);
    }

    return object;
  }

  async deleteFiles(): Promise<void> {
    await this.filesService.deleteAllFile();
    for (const fileRecord of this.fileRecords) {
      // Supprimer de la DB si l'ID est présent
      /* if (fileRecord.fileEntity) {
        await this.filesService.delete(fileRecord.fileEntity.id);
      } */

      if (existsSync(fileRecord.path)) {
        // Supprimer du disque
        unlinkSync(fileRecord.path);
      }
    }

    this.fileRecords = [];
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt = {
      'text/plain': 'txt',
      'application/json': 'json',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf',
      'video/mp4': 'mp4',
      'application/zip': 'zip',
    };

    return mimeToExt[mimeType] || 'bin';
  }

  async getFileEntity(fileId: string) {
    return await this.filesService.findOneByIdSpe(fileId);
  }

  hasFileBeenCreated(file?: FileEntity) {
    if (!file || !file.path) {
      return false;
    }

    return existsSync(file.path);
  }

  async hasFileBeenDeleted(file: FileEntity) {
    const fileFind = await this.filesService.fileRepository.findOneBy({
      id: file.id,
    });

    if (!fileFind) {
      const fileDeleted =
        await this.filesService.fileDeletedRepository.findOneBy({
          path: file.path,
        });
      return fileDeleted ? true : false;
    } else {
      return false;
    }
  }

  public removeDirectory(
    directoryPath: string = path.join('./', 'testFile'),
  ): void {
    rmSync(directoryPath, { recursive: true, force: true });
  }

  public removeFileFileRecordWithFileEntityId(id: string) {
    this.fileRecords = this.fileRecords.filter((record) => {
      if (record.fileEntity && record.fileEntity.id === id) {
        return false;
      } else {
        return true;
      }
    });
  }
}
