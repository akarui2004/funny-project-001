import { Command } from 'commander';
import ansis from 'ansis';

export abstract class BaseCli {
  protected program: Command;

  constructor() {
    this.program = new Command();
  }

  // Abstract properties/method needed
  protected abstract name: string;
  protected abstract description: string;

  // Define positional arguments (override if needed)
  protected addArguments?(command: Command): void;

  // Define flag/options (override if needed)
  protected addOptions?(command: Command): void;

  // Main entry point for command logic
  public abstract execute(...args: any[]): Promise<void> | void;

  /**
   * Configures the command instance and attaches action handlers
   *
   * @returns Command
   */
  protected build(): Command {
    const cmd = this.program.command(this.name).description(this.description);

    if (this.addArguments) this.addArguments(cmd);
    if (this.addOptions) this.addOptions(cmd);

    cmd.action(async (...args: any[]) => {
      try {
        await this.execute(...args);
      } catch (error) {
        console.error(ansis.redBright.bold(`Error executing ${this.name}:`), error);
        process.exit(1);
      }
    });

    return cmd;
  }

  /**
   * Run the cli app
   *
   * @param argv
   */
  public run(argv: string[] = process.argv): void {
    this.build();
    this.program.parse(argv);
  }
}
