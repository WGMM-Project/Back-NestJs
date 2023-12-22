/* eslint-disable @typescript-eslint/no-unused-vars */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestMigration1698792424330 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Up test migration');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Down test migration');
  }
}
