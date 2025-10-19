import logger from "./logger.ts";
import { Octokit } from "@octokit/rest";
import { Time } from "@sapphire/time-utilities";
import { envParseString } from "@skyra/env-utilities";
import { assert } from "@std/assert";
import ExpiryMap from "expiry-map";
import pmap from "p-map";
import pMemoize from "p-memoize";
import { decodeBase64 } from "@std/encoding/base64";

export const octokit = new Octokit({ auth: envParseString("GH_KEY", null) });
export const committer = {
  name: "SkyClient-repo-bot",
  email: "SkyClient-repo-bot@users.noreply.github.com",
};

type GHContent = {
  owner: string;
  repo: string;
  path: string;
  content: string;
  sha: string;
};

export async function readGHFile(
  owner: string,
  repo: string,
  path: string,
): Promise<GHContent> {
  const { data: rawData } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  const data = Array.isArray(rawData) ? rawData[0] : rawData;
  assert(data);
  assert(data.type == "file", "not a file");
  assert(data.content, "no content");

  const bytes = decodeBase64(data.content.replaceAll("\n", ""));
  const content = new TextDecoder("utf-8").decode(bytes);

  return { owner, repo, path, content, sha: data.sha };
}

export async function readGHContent(
  owner: string,
  repo: string,
  path: string,
): Promise<string> {
  const { content } = await readGHFile(owner, repo, path);
  return content;
}

export async function writeGHFile(
  oldFile: GHContent,
  content: string,
  commitMsg: string,
) {
  if (oldFile.content == content) return;

  await octokit.rest.repos.createOrUpdateFileContents({
    owner: oldFile.owner,
    repo: oldFile.repo,
    path: oldFile.path,

    committer,
    message: commitMsg,
    content: btoa(content),
    sha: oldFile.sha,
  });
}

async function getBaseTreeSha(owner: string, repo: string, branch: string) {
  try {
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const baseCommitSha = refData.object.sha;

    const { data: treeData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha,
    });
    const baseTreeSha = treeData.tree.sha;

    return { baseCommitSha, baseTreeSha };
  } catch (error) {
    logger.error("Error retrieving base tree SHA:", error);
    throw error;
  }
}

async function createBlob(
  owner: string,
  repo: string,
  content: string,
  encoding = "utf-8",
) {
  try {
    const { data } = await octokit.git.createBlob({
      owner,
      repo,
      content,
      encoding,
    });
    return data.sha;
  } catch (error) {
    logger.error("Error creating blob:", error);
    throw error;
  }
}

async function createBinaryBlob(
  owner: string,
  repo: string,
  content: ArrayBuffer,
) {
  const base64Content = Buffer.from(content).toString("base64");
  return createBlob(owner, repo, base64Content, "base64");
}

async function createTree(
  owner: string,
  repo: string,
  baseTreeSha: string,
  files: Blob[],
) {
  try {
    const tree = files.map((file) => ({
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      sha: file.sha,
    }));
    logger.info("tree", tree);

    const { data } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree,
    });

    return data.sha;
  } catch (error) {
    logger.error("Error creating tree:", error);
    throw error;
  }
}

async function createCommit(
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentSha: string,
) {
  try {
    const { data } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: treeSha,
      parents: [parentSha],
    });

    return data.sha;
  } catch (error) {
    logger.error("Error creating commit:", error);
    throw error;
  }
}

async function updateReference(
  owner: string,
  repo: string,
  branch: string,
  commitSha: string,
) {
  try {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commitSha,
    });
  } catch (error) {
    logger.error("Error updating reference:", error);
    throw error;
  }
}

export interface FileToCommit {
  path: string;
  content: string | ArrayBuffer;
}

interface Blob {
  path: string;
  sha: string;
}

export async function commitFiles(
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: FileToCommit[],
) {
  const { baseCommitSha, baseTreeSha } = await getBaseTreeSha(
    owner,
    repo,
    branch,
  );
  logger.info("baseCommit", baseCommitSha);
  logger.info("baseTreeSha", baseTreeSha);

  const blobs: Blob[] = await pmap(files, async (file) => {
    const sha = await (typeof file.content == "string"
      ? createBlob(owner, repo, file.content)
      : createBinaryBlob(owner, repo, file.content));
    return { path: file.path, sha };
  });
  logger.info("blobs", blobs);

  const treeSha = await createTree(owner, repo, baseTreeSha, blobs);
  logger.info("treeSha", treeSha);
  const commitSha = await createCommit(
    owner,
    repo,
    message,
    treeSha,
    baseCommitSha,
  );
  logger.info("commitSha", commitSha);
  await updateReference(owner, repo, branch, commitSha);
}

async function _getRepoCount() {
  let count = 0;
  for await (const { data: page } of octokit.paginate.iterator(
    octokit.rest.repos.listForOrg,
    {
      org: "Polyfrost",
      type: "public",
      per_page: 100,
    },
  ))
    count += page.length;
  return count;
}
export const getRepoCount = pMemoize(_getRepoCount, {
  cache: new ExpiryMap(Time.Hour),
});
