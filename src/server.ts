import { config } from 'src/app';
import { logger } from 'src/utils';

const datasource = config.datasource;
console.log(datasource, 3001);

logger.info('test logger');
