import { Octokit } from "@octokit/rest";
import { Time } from "@sapphire/time-utilities";
import ExpiryMap from "expiry-map";
import pMemoize from "p-memoize";

export const octokitAnon = new Octokit();

async function _getRepoCount() {
  let count = 0;
  for await (
    const { data: page } of octokitAnon.paginate.iterator(
      octokitAnon.rest.repos.listForOrg,
      {
        org: "Polyfrost",
        type: "public",
        per_page: 100,
      },
    )
  ) {
    count += page.length;
  }
  return count;
}
export const getRepoCount = pMemoize(_getRepoCount, {
  cache: new ExpiryMap(Time.Hour),
});
