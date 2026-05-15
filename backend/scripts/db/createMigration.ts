require('src/setup');

import { Command } from 'commander';

const program = new Command();

program
  .name('create-migration')
  .description('Create a new migration file')
  .argument('<name>', 'Name of the migration')
  .argument('[options]', 'Additional options for the migration')
  .action(async (...args) => {
    // console.log(args);
    const [name, options] = args;
    console.log(`Creating migration: ${name} with options: ${options}`);
    // console.log(`Creating migration: ${name}`);
  });

program.parse();
