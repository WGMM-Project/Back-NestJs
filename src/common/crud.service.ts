import { FileEntity } from '@Files/entities/file.entity';
import { FilesService } from '@Files/files.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  InsertResult,
  ObjectLiteral,
  Repository,
} from 'typeorm';

function generateSQLForTrigger(
  table: string,
  columns: string[],
  fileTable: string,
) {
  const functionName = `delete_referenced_${fileTable}_from_${table}`;
  const triggerName = `after_delete_${table}_trigger`;

  // SQL pour créer la fonction
  let functionSQL = `CREATE OR REPLACE FUNCTION ${functionName}()\n`;
  functionSQL += `RETURNS TRIGGER AS $$\n`;
  functionSQL += `BEGIN\n`;

  columns.forEach((column) => {
    functionSQL += `  IF OLD.${column} IS NOT NULL THEN\n`;
    functionSQL += `    DELETE FROM ${fileTable} WHERE id = OLD.${column};\n`;
    functionSQL += `  END IF;\n`;
  });

  functionSQL += `  RETURN NEW;\n`;
  functionSQL += `END;\n`;
  functionSQL += `$$ LANGUAGE plpgsql;\n`;

  // SQL pour créer ou remplacer le trigger
  let triggerSQL = `CREATE OR REPLACE TRIGGER ${triggerName}\n`;
  triggerSQL += `AFTER DELETE ON ${table}\n`;
  triggerSQL += `FOR EACH ROW EXECUTE FUNCTION ${functionName}();`;

  return { functionSQL, triggerSQL, triggerName };
}

@Injectable()
export class CRUDService<Entity extends ObjectLiteral> implements OnModuleInit {
  private fileEntityFields: { name: string; joinColumn: string }[] = [];
  protected filesService?: FilesService;
  protected defaultOrder?: FindManyOptions<Entity>['order'];

  @InjectDataSource() protected dataSource: DataSource;

  protected constructor(
    protected readonly repository: Repository<Entity>,
    protected readonly name: string,
  ) {
    this.detectFileEntityFields();
  }

  async onModuleInit() {
    if (this.fileEntityFields.length !== 0) await this.createTriggerIfNeeded();
  }

  private async createTriggerIfNeeded() {
    const tableName = this.repository.metadata.tableName;
    const tableNameFile = this.filesService.fileRepository.metadata.tableName;

    const info = generateSQLForTrigger(
      tableName,
      this.fileEntityFields.map((value) => value.joinColumn),
      tableNameFile,
    );

    await this.dataSource.query(info.functionSQL);

    const triggerExists = await this.dataSource.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = '${tableName}'
        AND trigger_name = '${info.triggerName}'
    `);

    if (triggerExists.length === 0) {
      await this.dataSource.query(info.triggerSQL);
    }
  }

  setFileService(filesService: FilesService) {
    this.filesService = filesService;
  }

  private detectFileEntityFields() {
    const metadata = this.repository.metadata;
    metadata.relations.forEach((relation) => {
      if (relation.type === FileEntity) {
        this.fileEntityFields.push({
          name: relation.propertyName,
          joinColumn: relation.foreignKeys[0].columnNames[0],
        });
      }
    });
  }

  public findAll(
    relations?: string[],
    where?: FindManyOptions<Entity>['where'],
    order?: FindManyOptions<Entity>['order'],
  ): Promise<Entity[]> {
    const options: FindManyOptions<Entity> = {};

    if (relations) {
      options.relations = relations;
    }

    if (where) {
      options.where = where;
    }

    if (order) {
      options.order = order;
    } else if (this.defaultOrder) {
      options.order = this.defaultOrder;
    }

    return this.repository.find(options);
  }

  public findOne(
    relations?: string[],
    where?: FindOptionsWhere<Entity>,
  ): Promise<Entity | undefined> {
    const options: FindOneOptions<Entity> = {};

    if (relations) {
      options.relations = relations;
    }

    if (where) {
      options.where = where;
    }

    return this.repository.findOne(options);
  }

  public async create(
    data: Partial<Entity>,
    relations?: string[],
  ): Promise<Entity> {
    const insertResult: InsertResult = await this.repository
      .createQueryBuilder()
      .insert()
      .into(this.repository.target)
      .values(data)
      .returning('*')
      .execute();

    const createdEntity = insertResult.raw[0];

    return this.findOne(relations, { id: createdEntity.id } as any);
  }

  public async update(
    id: string,
    data: Partial<Entity>,
    relations?: string[],
    checkEntity?: (entity: Entity) => void,
  ): Promise<Entity> {
    const existingEntity = await this.findOne(
      [...this.fileEntityFields.map((value) => value.name)],
      {
        id,
      } as any,
    );

    if (checkEntity) {
      checkEntity(existingEntity);
    }

    const query = this.repository
      .createQueryBuilder()
      .update()
      .set(data)
      .where('id = :id', { id });

    const updateResult = await query.execute();

    if (updateResult.affected === 0) {
      const errorMessage = this.errorMessage(id);
      throw new HttpException(errorMessage, HttpStatus.NOT_FOUND);
    }

    for (const fieldName of this.fileEntityFields) {
      if (
        (data[fieldName.name] === null &&
          existingEntity[fieldName.name] &&
          existingEntity[fieldName.name].id) ||
        (data[fieldName.name] &&
          existingEntity[fieldName.name] &&
          existingEntity[fieldName.name].id &&
          existingEntity[fieldName.name].id !== data[fieldName.name].id)
      ) {
        await this.removeFileEntity(existingEntity[fieldName.name].id);
      }
    }

    return await this.findOne(relations, { id } as any);
  }

  public async delete(
    id: string,
    checkEntity?: (entity: Entity) => void,
  ): Promise<boolean> {
    const existingEntity = await this.findOne(
      [...this.fileEntityFields.map((value) => value.name)],
      {
        id,
      } as any,
    );

    if (checkEntity) {
      checkEntity(existingEntity);
    }

    const query = this.repository
      .createQueryBuilder()
      .delete()
      .where('id = :id', { id });

    const deleteResult = await query.execute();

    if (deleteResult.affected === 0) {
      const errorMessage = this.errorMessage(id);
      throw new HttpException(errorMessage, HttpStatus.NOT_FOUND);
    }

    /* for (const fieldName of this.fileEntityFields) {
      if (existingEntity[fieldName.name] && existingEntity[fieldName.name].id) {
        await this.removeFileEntity(existingEntity[fieldName.name].id);
      }
    } */

    return true;
  }

  public errorMessage(id: string) {
    return `Entity ` + this.name + ` with ID ` + id + ` not found`;
  }

  private async removeFileEntity(idFile: string): Promise<void> {
    if (this.filesService) {
      await this.filesService.removeById(idFile);
    } else {
      console.error('Missing filesService for ' + this.name);
    }
  }
}
