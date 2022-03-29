#!/usr/bin/node
import "dotenv/config";
import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_AUTH_TOKEN,
});

const context = {
  repo: {
    owner: "nervosnetwork",
    repo: "godwoken",
  },
  issue: {
    number: 628,
  },
};

const getPrebuilds = async (org, page, perPage) => {
  return await octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
    package_type: "container",
    package_name: "godwoken-prebuilds",
    org,
    page,
    per_page: perPage,
  });
};

const getPrebuildsByTag = async (org, tag) => {
  const pkgs = await getPrebuilds(org, 1, 100);
  for (const pkg of pkgs.data) {
    if (pkg.metadata.container.tags.includes(tag)) {
      return pkg;
    }
  }
};

const commentBody = `
prebuilds: dev-202203280240
godwoken: develop
scripts: 81676d9d53ffdf5bbaa60483928d07da16eb4a88
polyjuice: e37553b9
`;
console.log(`comment: ${commentBody}`);

// Parse commentBody
const prebuilds = {
  org: "nervosnetwork",
  repo: "godwoken-docker-prebuilds",
  pattern: /prebuilds: (.*)/,
  packageType: "container",
  packageName: "godwoken-prebuilds",
  tags: undefined,
  sha: undefined,
  htmlUrl: undefined,
  manifest: {
    godwoken: {
      pattern: /&quot;ref.component.godwoken-sha1&quot;: &quot;(.{40})&quot;,/,
      sha: undefined,
    },
    scripts: {
      pattern: /&quot;ref.component.godwoken-scripts-sha1&quot;: &quot;(.{40})&quot;,/,
      sha: undefined,
    },
    polyjuice: {
      pattern: /&quot;ref.component.godwoken-polyjuice-sha1&quot;: &quot;(.{40})&quot;,/,
      sha: undefined,
    },
  },
};
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
  tests: {
    owner: "nervosnetwork",
    repo: "godwoken-tests",
    branch: "develop",
    pattern: /tests: (.*)/,
    commit: undefined,
    htmlUrl: undefined,
    branchOrCommit: undefined,
  },
};

// Fetch pr commit
const pr = (
  await octokit.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number,
  })
).data.head;
console.log(`${JSON.stringify(pr.ref)}`);
console.log(`${JSON.stringify(pr.repo.name)}`);

// Fetch prebuilds
const matchPrebuilds = async () => {
  const match = prebuilds.pattern.exec(`${commentBody}`);
  if (match) {
    return await getPrebuildsByTag(prebuilds.org, match[1]);
  } else {
    return (await getPrebuilds(prebuilds.org, 1, 2)).data[0];
  }
};
const pkg = await matchPrebuilds();

prebuilds.tags = pkg.metadata.container.tags;
prebuilds.htmlUrl = pkg.html_url;
prebuilds.sha = pkg.name;
console.log(`pkg: ${JSON.stringify(pkg)}`);

// Fetch prebuilds components commit;
const manifestPage = JSON.stringify(
  await octokit.request(`GET ${prebuilds.htmlUrl}`)
);
for (const name in prebuilds.manifest) {
  const label = prebuilds.manifest[name];
  const match = label.pattern.exec(manifestPage);
  if (match) {
    label.sha = match[1];
  } else {
    throw `${name}-sha1 not found`;
  }
}
console.log(`${JSON.stringify(prebuilds)}`);

for (const name in components) {
  const comp = components[name];

  // Ref from pr is priority
  if (pr.repo.name === comp.repo) {
    comp.branchOrCommit = pr.sha;
    continue;
  }

  const match = comp.pattern.exec(`${commentBody}`);
  if (match) {
    comp.branchOrCommit = match[1];
  } else if (prebuilds.manifest[name]) {
    comp.branchOrCommit = prebuilds.manifest[name].sha;
  } else {
    if (name === "web3") {
      continue;
    }
    comp.branchOrCommit = comp.branch;
  }
}
console.log(JSON.stringify(components));

// Fetch branch/commit sha and html url
for (const name in components) {
  const comp = components[name];
  console.log(`fetch branch or commit ${name}`);

  if (comp.branchOrCommit === undefined) {
    console.log(`skip fetch component info ${name}`);
    continue;
  }

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
    console.log(`${comp.branchOrCommit} full commit not found`);
  }

  try {
    if (comp.commit === undefined) {
      // Try serach commits
      const resp = await octokit.rest.repos.listCommits({
        owner: comp.owner,
        repo: comp.repo,
        sha: comp.branchOrCommit,
        per_page: 1,
        page: 1,
      });
      if (resp.data[0].sha.startsWith(comp.branchOrCommit)) {
        comp.commit = resp.data[0].sha;
        comp.htmlUrl = resp.data[0].html_url;
      } else {
        throw `${comp.branchOrCommit} short sha commit not found`;
      }
    }
  } catch {
    console.log(`${comp.branchOrCommit} short commit not found`);
  }

  if (comp.commit === undefined) {
    throw `${comp.branchOrCommit} not found`;
  }
}
console.log(JSON.stringify(components));

// Post integration test info
let componentInfo = `
Run integration with following specific components:

prebuilds: [${prebuilds.tags}](${prebuilds.htmlUrl})
`;
for (const name in components) {
  const comp = components[name];
  if (comp.commit === undefined) {
    continue;
  }
  const shortSha = comp.commit.substr(0, 7);
  componentInfo = `${componentInfo}\n${name}: [${shortSha}](${comp.htmlUrl})`;
}
console.log(`${componentInfo}`);
