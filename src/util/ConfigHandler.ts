import { UX } from '@salesforce/command';
import { prompt, QuestionCollection } from 'inquirer';
import { Messages } from '@salesforce/core';
import { GitHandler } from '.';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('DXFlow', 'config-handler');

export interface RepoBranches {
  production: string;
  develop: string;
  prefix?: string;
}
export interface RepoPrefixes {
  feature: string;
  release: string;
  hotfix: string;
}

export interface GitConfig {
  prefixes: RepoPrefixes;
  branches: RepoBranches[];
}

export class ConfigHandler {
  constructor(private ux: UX) {}

  public async getGitConfig(): Promise<GitConfig> {
    const gitHandler = new GitHandler(this.ux);
    let existingBranches: string[] = gitHandler.getBranches();
    if (existingBranches.length === 0) {
      this.ux.log(messages.getMessage('noBranchesYet'));
    }
    const codebases = await prompt([
      {
        type: 'number',
        name: 'totalNumber',
        message: messages.getMessage('totalCodebasesQuestion'),
        default: 1,
        validate: (value: number) => value > 0,
      },
    ]);

    let branches: RepoBranches[] = [];
    for (let x = 1; x <= codebases.totalNumber; x++) {
      // Master (Production)
      existingBranches = await this.getPermanentBranch(
        'master',
        existingBranches,
        branches,
        x,
      );
      // Develop
      existingBranches = await this.getPermanentBranch(
        'develop',
        existingBranches,
        branches,
        x,
      );
      if (x > 1) {
        const prefixQuestion = await prompt([
          {
            type: 'input',
            name: 'answer',
            message: messages.getMessage('codebasePrefixQuestion'),
            default: `cb${x}`,
            validate: (value: string) => (!!value ? true : 'This is required'),
          },
        ]);
        branches[branches.length - 1].prefix = prefixQuestion.answer;
      }
    }

    this.ux.log(messages.getMessage('nameConventions'));
    const prefixes: RepoPrefixes = {
      feature: await this.getSupportBranchPrefix('feature'),
      release: await this.getSupportBranchPrefix('release'),
      hotfix: await this.getSupportBranchPrefix('hotfix'),
    };

    return { prefixes, branches };
  }

  private async getPermanentBranch(
    branchType: string,
    branches: string[],
    branchData: RepoBranches[],
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
      let questionDetails: QuestionCollection = {
        type: 'input',
        name: 'name',
        message,
        validate: (value: string) => (!!value ? true : 'This is required'),
      };
      if (
        !branchData.some(
          entry =>
            entry.production === branchType || entry.develop === branchType,
        )
      ) {
        questionDetails = { ...questionDetails, default: branchType };
      }

      const promptForBranch = await prompt([questionDetails]);
      name = promptForBranch.name;
    }
    if (branchType === 'master') {
      branchData.push({ production: name });
    } else {
      branchData[branchData.length - 1][branchType] = name;
    }
    return branches;
  }

  private async getSupportBranchPrefix(branchType: string): Promise<string> {
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
    return prefix;
  }
}
