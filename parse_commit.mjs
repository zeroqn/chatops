#!/usr/bin/node
import "dotenv/config";
import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_AUTH_TOKEN,
});

const commentBody = `
godwoken: develop
polyjuice: e37553b94ce3255f9ceec07f28ad71a092bc3d62
`;
console.log(`comment: ${commentBody}`);

// Parse commentBody
const components = {
  godwoken: {
    owner: "nervosnetwork",
    repo: "godwoken",
    branch: "compatibility-breaking-changes",
    pattern: /godwoken: (.*)/,
    commit: undefined,
    htmlUrl: undefined,
    branchOrCommit: undefined,
  },
  scripts: {
    owner: "nervosnetwork",
    repo: "godwoken-scripts",
    branch: "compatibility-breaking-changes",
    pattern: /scripts: (.*)/,
    commit: undefined,
    htmlUrl: undefined,
    branchOrCommit: undefined,
  },
  polyjuice: {
    owner: "nervosnetwork",
    repo: "godwoken-polyjuice",
    branch: "compatibility-breaking-changes",
    pattern: /polyjuice: (.*)/,
    commit: undefined,
    htmlUrl: undefined,
    branchOrCommit: undefined,
  },
  web3: {
    owner: "nervosnetwork",
    repo: "godwoken-web3",
    branch: "compatibility-breaking-changes",
    pattern: /web3: (.*)/,
    commit: undefined,
    htmlUrl: undefined,
    branchOrCommit: undefined,
  },
  kicker: {
    owner: "RetricSu",
    repo: "godwoken-kicker",
    branch: "compatibility-changes",
    pattern: /kicker: (.*)/,
    commit: undefined,
    htmlUrl: undefined,
    branchOrCommit: undefined,
  },
};

for (const name in components) {
  const comp = components[name];
  const match = comp.pattern.exec(`${commentBody}`);
  if (match) {
    comp.branchOrCommit = match[1];
  } else {
    comp.branchOrCommit = comp.branch;
  }
}
console.log(JSON.stringify(components));

// Fetch branch/commit sha and html url
for (const name in components) {
  const comp = components[name];
  console.log(`fetch branch or commit ${name}`);

  try {
    // Try branch
    const resp = await octokit.rest.repos.getBranch({
      owner: comp.owner,
      repo: comp.repo,
      branch: comp.branchOrCommit,
    });
    comp.commit = resp.data.commit.sha;
    comp.htmlUrl = resp.data.commit.html_url;
  } catch {
    console.log(`${comp.branchOrCommit} branch not found`);
  }

  try {
    if (comp.commit === undefined) {
      // Try commit
      const resp = await octokit.rest.git.getCommit({
        owner: comp.owner,
        repo: comp.repo,
        commit_sha: comp.branchOrCommit,
      });
      comp.commit = resp.data.sha;
      comp.htmlUrl = resp.data.html_url;
    }
  } catch {
    console.log(`${comp.branchOrCommit} is neither branch nor commit`);
  }
}
console.log(JSON.stringify(components));

// Post integration test info
let componentInfo = `
Run integration with following specific components:
`;
for (const name in components) {
  const comp = components[name];
  const shortSha = comp.commit.substr(0, 7);
  componentInfo = `${componentInfo}\n${name}: [${shortSha}](${comp.htmlUrl})`;
}
console.log(`${componentInfo}`);
