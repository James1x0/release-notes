import { PullsListResponseItem, IssuesGetResponse } from '@octokit/rest';

export default function compileReleaseNotes (rels: { pr: PullsListResponseItem, issue: IssuesGetResponse[] }[]): String {
  return rels.reduce((notes: String, rel) => {
    return `${notes}\n${rel.pr.body}`;
  }, '');
};
