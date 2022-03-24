#!/usr/bin/node
import "dotenv/config";
import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_AUTH_TOKEN,
});

const owner = "nervosnetwork";
const repo = "godwoken";
const target_branch = "compatibility-breaking-changes";

const branch = await octokit.rest.repos.getBranch({
  owner,
  repo,
  branch: target_branch,
});

console.log(branch.data.commit.sha);
console.log(branch.data.commit.url);
console.log(branch.data.commit.html_url);

const commit = await octokit.rest.git.getCommit({
  owner,
  repo,
  commit_sha: branch.data.commit.sha,
});

console.log(commit.data.sha);
console.log(commit.data.url);
console.log(commit.data.html_url);

const ref = await octokit.rest.git.getRef({
  owner,
  repo,
  ref: `heads/${target_branch}`,
});

console.log(JSON.stringify(ref.data));
console.log(ref.data.object.sha);
console.log(ref.data.object.type);
console.log(ref.data.object.url);
