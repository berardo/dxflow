import { UX } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { spawnSync } from 'child_process';
import { prompt, QuestionCollection } from 'inquirer';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('DXFlow', 'git-handler');

/**
 * Class to execute NodeGit commands
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

  public initialCommit(): boolean {
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

  public async initFlow(): Promise<boolean> {
    const gitBranch = spawnSync(
      'git',
      "branch --format '%(refname)',".split(' '),
    );
    let branches = gitBranch.output
      .toString()
      .replace(/'/g, '')
      .split(',')
      .filter(entry => entry.match(/(\n)?refs\/heads/g))
      .map(b => b.split('refs/heads/').pop());
    if (branches.length === 0) {
      this.ux.log(messages.getMessage('noBranchesYet'));
    }
    const codebases = await prompt([
      {
        type: 'number',
        name: 'totalNumber',
        message: messages.getMessage('totalCodebasesQuestion'),
        default: 1,
      },
    ]);

    let branchData = [];
    for (let x = 1; x <= codebases.totalNumber; x++) {
      // Master (Production)
      branches = await this.initFlowSetLongLivedBranch(
        'master',
        branches,
        branchData,
        x,
      );
      // Develop
      branches = await this.initFlowSetLongLivedBranch(
        'develop',
        branches,
        branchData,
        x,
      );
    }

    this.ux.log(messages.getMessage('nameConventions'));
    // Feature
    branches = await this.initFlowSetSupportBranches(
      'feature',
      branches,
      branchData,
    );

    // Release
    branches = await this.initFlowSetSupportBranches(
      'release',
      branches,
      branchData,
    );

    // Hotfix
    branches = await this.initFlowSetSupportBranches(
      'hotfix',
      branches,
      branchData,
    );
    console.log(branchData);

    return true;
  }

  private async initFlowSetLongLivedBranch(
    branchType: string,
    branches: string[],
    branchData: any[],
    codebaseNumber: number,
  ): Promise<string[]> {
    let name: string;
    if (branches.length > 0) {
      const choices =
        branchType === 'develop'
          ? [...branches, '[same as production]', '[other]']
          : [...branches, '[other]'];
      let questionDetails: QuestionCollection = {
        type: 'list',
        name: 'nameOption',
        message: messages.getMessage(`${branchType}NameOptionQuestion`, [
          codebaseNumber,
        ]),
        choices,
      };
      questionDetails = {
        ...questionDetails,
        default: choices.includes(branchType) ? branchType : '[other]',
      };

      const promptForBranch = await prompt([questionDetails]);
      name = promptForBranch.nameOption;
      branches = branches.filter(b => b !== promptForBranch.nameOption);
    }
    if (name === '[same as production]') {
      name = branchData[branchData.length - 1].production;
    } else if (!name || name === '[other]') {
      const message = messages.getMessage(`${branchType}NameQuestion`, [
        codebaseNumber,
      ]);
      const promptForBranch = await prompt([
        {
          type: 'input',
          name: 'name',
          message,
          validate: (value: string) => (!!value ? true : 'This is required'),
        },
      ]);
      name = promptForBranch.name;
    }
    if (branchType === 'master') {
      branchData.push({ production: name });
    } else {
      branchData[branchData.length - 1][branchType] = name;
    }
    return branches;
  }

  private async initFlowSetSupportBranches(
    branchType: string,
    branches: string[],
    branchData: any[],
  ): Promise<string[]> {
    let prefix: string;
    const message = messages.getMessage(`${branchType}NameQuestion`);
    const promptForBranch = await prompt([
      {
        type: 'input',
        name: 'prefix',
        message,
        validate: (value: string) => (!!value ? true : 'This is required'),
        default: `${branchType}/`,
      },
    ]);
    prefix = promptForBranch.prefix;
    if (!prefix.endsWith('/')) {
      prefix += '/';
    }
    if (branchType === 'feature') {
      branchData.push({ feature: prefix });
    } else {
      branchData[branchData.length - 1][branchType] = prefix;
    }
    return branches;
  }
}
