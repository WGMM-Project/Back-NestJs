import { createConfig } from '@Config/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

export const connectionSource = new DataSource(
  createConfig() as DataSourceOptions,
);
