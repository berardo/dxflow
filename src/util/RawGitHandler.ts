import { UX } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { spawnSync } from 'child_process';
import { prompt } from 'inquirer';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('DXFlow', 'git-handler');

/**
 * Class to execute Git commands
 *
 * @export
 * @class RawGitHandler
 * @author Jose Cunha
 */
export class RawGitHandler {
  constructor(private ux: UX) {}

  public checkGitVersion(): boolean {
    const gitVersion = spawnSync('git', ['--version']);
    if (gitVersion.status !== 0) {
      this.ux.error(messages.getMessage('noGitInstalled'));
    }

    return gitVersion.status === 0;
  }

  public checkGitStatus(): boolean {
    const gitStatus = spawnSync('git', ['status']);
    if (gitStatus.status !== 0) {
      this.ux.log(messages.getMessage('noRepositoryError'));
    }
    return gitStatus.status === 0;
  }

  public async wantToGitInit(): Promise<boolean> {
    const wantToInit = await prompt([
      {
        type: 'confirm',
        name: 'wantToGitInit',
        message: messages.getMessage('newRepositoryQuestion'),
        default: true,
      },
    ]);
    return wantToInit.wantToGitInit;
  }

  public createNewRepository(): boolean {
    const projectCreate = spawnSync('git', ['init'], { stdio: 'inherit' });
    return projectCreate.status === 0;
  }

  public createNewBranch(branchName: string): boolean {
    const branchCreate = spawnSync('git', ['branch', branchName]);
    return branchCreate.status === 0;
  }

  public checkoutBranch(branchName: string): boolean {
    const checkout = spawnSync('git', `checkout ${branchName}`.split(' '));
    return checkout.status === 0;
  }

  public getBranches(): string[] {
    const gitBranch = spawnSync(
      'git',
      "branch --format '%(refname)',".split(' '),
    );
    return gitBranch.output
      .toString()
      .replace(/'/g, '')
      .split(',')
      .filter(entry => entry.match(/(\n)?refs\/heads/g))
      .map(b => b.split('refs/heads/').pop());
  }

  public createInitialCommit(): boolean {
    const addAll = spawnSync('git', ['add', '.']);
    if (addAll.status === 0) {
      const initialCommit = spawnSync('git', [
        'commit',
        '-m',
        messages.getMessage('initialCommit'),
      ]);
      return initialCommit.status === 0;
    }
    return false;
  }
}
