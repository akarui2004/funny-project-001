require('src/setup');

import { Command } from 'commander';
import pc from 'picocolors';

export interface CommandArgumentInterface {
  name: string;
  desc: string;
}

export abstract class BaseProgram {
  private _name: string | undefined;
  private _description: string | undefined;
  private _arguments: Array<CommandArgumentInterface> | undefined;
  private _options: Array<CommandArgumentInterface> | undefined;

  protected prettyPrinter: any = pc;

  /**
   * The command name should be a unique identifier for the command. It will be used to execute the command from the command line.
   * Example: 'create-migration'
   */
  abstract commandName(): string;

  /**
   * The command description should provide a brief overview of what the command does.
   * It will be displayed when the user runs the command with the --help flag.
   * Example: 'Create a new migration file'
   */
  abstract commandDescription(): string;

  /**
   * The arguments should be defined in the format of a record where the key is the argument syntax (e.g., '<name>', '[options]')
   * and the value is the description of the argument. The <> is the required argument, while [] is the optional argument.
   * Example:
   * [
   *   { name: '<name>', desc: 'Name of the migration' },
   *   { name: '[options]', desc: 'Additional options for the migration' }
   * ]
   */
  abstract commandArguments(): Array<CommandArgumentInterface>;

  /**
   * The options should be defined in the format of a record where the key is the option syntax (e.g., '--force', '-f')
   * and the value is an object containing the description and any additional configuration for the option.
   * Example:
   * [
   *   { name: '--force, -f', desc: 'Force the operation' },
   *   { name: '-f', desc: 'Force the operation' }
   * ]
   */
  abstract commandOptions(): Array<CommandArgumentInterface>;

  /**
   * The action executor will receive the arguments and options defined in the commandArguments and commandOptions methods respectively.
   * The arguments will be passed in the order they are defined in the commandArguments method, followed by an object containing the options.
   * Example:
   * If commandArguments returns [{ name: '<name>', desc: 'Name of the migration' }] and commandOptions returns [{ name: '--force, -f', desc: 'Force the operation' }],
   * then the actionExecutor will receive the arguments as (name: string, options: { force: boolean })
   * @param args
   */
  abstract actionExecutor(...args: any[]): void;

  private get name(): string {
    if (!this._name) {
      this._name = this.commandName();
    }
    return this._name;
  }

  private get description(): string {
    if (!this._description) {
      this._description = this.commandDescription();
    }
    return this._description;
  }

  private get arguments(): Array<CommandArgumentInterface> {
    if (!this._arguments) {
      this._arguments = this.commandArguments();
    }
    return this._arguments;
  }

  private get options(): Array<CommandArgumentInterface> {
    if (!this._options) {
      this._options = this.commandOptions();
    }
    return this._options;
  }

  public execute(): void {
    console.log(this.prettyPrinter.green(`Executing program: ${this.name}`));

    const program = new Command();

    program.name(this.name).description(this.description);
    this.arguments.forEach((arg) => {
      program.argument(arg.name, arg.desc);
    });
    this.options.forEach((opt) => {
      program.option(opt.name, opt.desc);
    });
    program.action((...args) => this.actionExecutor(...args));
    program.parse();
  }
}
