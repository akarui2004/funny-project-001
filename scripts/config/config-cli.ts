import ansis from 'ansis';
import { BaseCli } from 'scripts/base-cli';
import appConfig from 'src/app/config-loader';
import { NODE_ENV } from 'src/constants';

class ConfigCli extends BaseCli {
  protected name: string = 'validate';
  protected description: string = 'Validate the merged application configuration for the active NODE_ENV';

  /**
   * Forces the config loader to merge base -> <env> -> <env>.local and run the
   * Zod schema. The loader connects to nothing, so this is safe to run offline.
   */
  public execute(): void {
    console.log(ansis.blueBright.bold(`Validating configuration (NODE_ENV=${NODE_ENV})`));

    try {
      // Accessing loadedFiles triggers the merge + validation
      const loadedFiles = appConfig.loadedFiles;
      for (const file of loadedFiles) {
        console.log(ansis.green(`  ✓ ${file}`));
      }

      const { master: db } = appConfig.datasource;
      const { master: redis, queue } = appConfig.redis;
      console.log(ansis.gray(`  db: ${db.host}:${db.port}/${db.database}`));
      console.log(ansis.gray(`  redis: ${redis.host}:${redis.port}/${redis.db}, queue: ${queue.host}:${queue.port}/${queue.db}`));
      console.log(ansis.greenBright.bold('Configuration is valid'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(ansis.redBright.bold('Configuration is invalid:'));
      console.error(message);
      process.exitCode = 1;
    }
  }
}

new ConfigCli().run();
