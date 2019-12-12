import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import { GitHandler, SfdxHandler, ConfigHandler } from '../../util';

// Messaging
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('DXFlow', 'init');

export default class Init extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');
  public static examples = ['$ sfdx flow:init'];
  public static args = [];
  protected static requiresProject = false;
  protected static supportsUsername = false;
  protected static supportsDevhubUsername = false;
  protected static flagsConfig = {
    skipconfig: flags.boolean({
      char: 's',
      description: messages.getMessage('skipConfigFlagDescription'),
    }),
  };

  public async run(): Promise<AnyJson> {
    this.ux.log(messages.getMessage('logo'));

    const configHandler = new ConfigHandler(this.ux);
    const gitHandler = new GitHandler(this.ux);
    const sfdxHandler = new SfdxHandler(this.ux);

    if (!gitHandler.checkGitVersion()) return;
    if (
      !(await sfdxHandler.checkSfdxProject()) &&
      (!(await sfdxHandler.wantToCreateNewSfdxProject()) ||
        !(await sfdxHandler.createNewProject()))
    ) {
      return;
    }

    if (!gitHandler.checkGitStatus() && (await gitHandler.wantToGitInit())) {
      gitHandler.createNewRepository();
    }

    const config = await configHandler.getGitConfig();

    this.ux.startSpinner('creating branches');

    await configHandler.saveConfigFile(config);

    gitHandler.createInitialCommit();

    config.branches.forEach(branch => {
      branch.production = `${branch.production}: ${
        gitHandler.createNewBranch(branch.production)
          ? 'created'
          : 'not created or pre-existing'
      }`;
      branch.develop = `${branch.develop}: ${
        gitHandler.createNewBranch(branch.develop)
          ? 'created'
          : 'not created or pre-existing'
      }`;
    });
    gitHandler.checkoutBranch(config.branches[0].develop);

    this.ux.stopSpinner('done');

    return config;
  }
}
