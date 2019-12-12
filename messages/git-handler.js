module.exports = {
  noGitInstalled:
    'Unable to locate your git installation. Make sure you ' +
    "have installed git within your system's command path",
  noRepositoryError: "You doesn't seem to be under a git repository",
  commitAllError: 'Failed to Commit',
  createBranchError: "Failed to create branch '%s'",
  deleteBranchError: "Failed to delete branch '%s'",
  initError: 'Git init command has failed',
  gitInitialised: 'Initialized empty Git repository in %s',
  branchCreated: "Branch '%s' successfully created",
  checkoutDone: "Checkout '%s'",
  initialCommit: 'Initial Commit',
  newRepositoryQuestion: 'Would you like to start a new repository?',
  totalCodebasesQuestion:
    'How many parallel codebases do you want to maintain (e.g. multi-org development)?',
  codebasePrefixQuestion:
    'As this is not your first codebase, please define a prefix for its support branches',
};
