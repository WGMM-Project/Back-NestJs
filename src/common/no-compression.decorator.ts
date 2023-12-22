import { SetMetadata } from '@nestjs/common';

export const NO_COMPRESSION_KEY = 'noCompression';
export const NoCompression = () => SetMetadata(NO_COMPRESSION_KEY, true);
