import { Exclude, Expose } from 'class-transformer';
import {
  AfterLoad,
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity()
export class FileEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  @Exclude()
  path: string;

  @Column()
  mimetype: string;

  @Expose()
  download_link: string;

  @Expose()
  show_link: string;

  @AfterLoad()
  updateCounters() {
    this.download_link = '/files/download/' + this.id;
    this.show_link = '/files/show/' + this.id;
  }

  /* @BeforeRemove()
  updateStatus() {
    const logger = CommonModule.moduleRef.get(WinstonLogger, { strict: false });
    const filePath = join(process.cwd(), this.path);

    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (err) {
        const errorDetails = {
          message: `${filePath} wasn't deleted`,
          code: 'FILE_DELETE_ERROR',
          timestamp: new Date().toISOString(),
        };
        logger.error(errorDetails, err.stack);
      }
    }
  } */

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Expose()
  readonly created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', onUpdate: 'CURRENT_TIMESTAMP' })
  @Expose()
  readonly updated_at: Date;

  @VersionColumn({ default: 0 })
  @Expose()
  readonly version: number;
}
