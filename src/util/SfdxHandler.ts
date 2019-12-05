import { SfdxProject, Messages } from '@salesforce/core';
import { UX } from '@salesforce/command';
import { prompt } from 'inquirer';
import { spawnSync } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

const messages = Messages.loadMessages('DXFlow', 'sfdx-handler');

export class SfdxHandler {
  constructor(private ux: UX) {}

  public newScratchOrg(): void {}

  public async checkSfdxProject(): Promise<boolean> {
    try {
      const project: SfdxProject = await SfdxProject.resolve();
      this.ux.log(`SFDX Project: ${project.getPath()}`);
      return true;
    } catch (error) {
      this.ux.error(messages.getMessage('notDXDirectory'));
      return false;
    }
  }

  public async wantToCreateNewSfdxProject(): Promise<boolean> {
    const wantToCreateProject = await prompt([
      {
        type: 'confirm',
        name: 'answer',
        message: messages.getMessage('startProjectQuestion'),
        default: true,
      },
    ]);
    return wantToCreateProject.answer;
  }

  public async createNewProject(): Promise<boolean> {
    const createQuestions = [
      {
        type: 'input',
        name: 'projectName',
        message: messages.getMessage('projectNameQuestion'),
        validate: (value: string) =>
          value.match(/^\S+$/) ? true : messages.getMessage('spacesNotAllowed'),
      },
      {
        type: 'input',
        name: 'projectFolder',
        message: messages.getMessage('projectFolderQuestion'),
        default: '.',
        validate: (value: string) =>
          value.match(/^\S+$/) ? true : messages.getMessage('spacesNotAllowed'),
      },
      {
        type: 'input',
        name: 'packageDir',
        message: messages.getMessage('packageFolderQuestion'),
        default: 'force-app',
        validate: (value: string) =>
          value.match(/^\S+$/) ? true : messages.getMessage('spacesNotAllowed'),
      },
      {
        type: 'input',
        name: 'namespace',
        message: messages.getMessage('namespaceQuestion'),
        validate: (value: string) =>
          value.match(/^($)|(\S+$)/)
            ? true
            : messages.getMessage('spacesNotAllowed'),
      },
      {
        type: 'input',
        name: 'template',
        message: messages.getMessage('templateQuestion'),
        default: 'standard',
        validate: (value: string) =>
          value.match(/^\S+$/) ? true : messages.getMessage('spacesNotAllowed'),
      },
      {
        type: 'confirm',
        name: 'manifest',
        message: messages.getMessage('manifestQuestion'),
        default: false,
      },
    ];
    const inquiry = await prompt(createQuestions);

    let commandParams = [
      'force:project:create',
      '-n',
      inquiry.projectName,
      '--loglevel=debug',
    ];

    if (inquiry.projectFolder != '.') {
      commandParams = [...commandParams, '-d', inquiry.projectFolder];
    }
    if (inquiry.packageDir != 'force-app') {
      commandParams = [...commandParams, '-p', inquiry.packageDir];
    }
    if (!!inquiry.namespace) {
      commandParams = [...commandParams, '-s', inquiry.namespace];
    }
    if (inquiry.template != 'standard') {
      commandParams = [...commandParams, '-t', inquiry.template];
    }
    if (inquiry.manifest) {
      commandParams = [...commandParams, '-x'];
    }

    const path = join(
      <string>inquiry.projectFolder,
      <string>inquiry.projectName,
    );
    if (
      !existsSync(path) ||
      (
        await prompt([
          {
            type: 'confirm',
            name: 'answer',
            message: messages.getMessage('existentPathQuestion', [path]),
            default: true,
          },
        ])
      ).answer
    ) {
      const projectCreate = await spawnSync('sfdx', commandParams);
      // return new Promise(resolve => {
      //   projectCreate.stdout.on('data', (data: any) => {
      //     console.log(`stdout: ${data}`);
      //   });

      //   projectCreate.stderr.on('data', (data: any) => {
      //     console.error(`stderr: ${data}`);
      //   });

      //   projectCreate.on('close', (code: number) => resolve(code === 0));
      // });

      if (projectCreate.status !== 0) {
        this.ux.log(
          `Failed to create your project (${projectCreate.stderr.toString()})`,
        );
        return false;
      }
      process.chdir(path);
      this.ux.log(`Project created on ${process.cwd()}`);
      return true;
    }
    return false;
  }
}
