import { RolesEnum } from '@Helper/roles/roles';
import { Trim } from 'class-sanitizer';
import { Exclude, Expose } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity()
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  @IsNotEmpty()
  @IsString()
  @Length(8, 30)
  @Trim()
  username: string;

  @Column({ type: 'varchar', select: false })
  @Exclude({
    toPlainOnly: true,
  })
  @IsNotEmpty()
  @IsString()
  @Length(8, 30)
  password: string;

  @Column({ type: 'varchar', nullable: true })
  @IsString()
  @IsOptional()
  group: string | null;

  @Column({ type: 'varchar', unique: true })
  @IsNotEmpty()
  @IsEmail()
  @Trim()
  email: string;

  @Column({
    type: 'enum',
    enum: RolesEnum,
    default: RolesEnum.User,
  })
  @IsEnum(RolesEnum)
  role: RolesEnum;

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
