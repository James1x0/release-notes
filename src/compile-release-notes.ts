import { PullsListResponseItem, IssuesGetResponse } from '@octokit/rest';

const RN_MATCHER = /\[RN\](.*)/i;

// Hey! Ordering matters here for sorting of release notes
const issueTypeRnMappings = {
  feature: 'Feature',
  enhancement: 'Enhancement',
  bug: 'Squashed Bug'
};

const issueTypes = Object.keys(issueTypeRnMappings);

type ReleaseLineItem = {
  type: string,
  note: string
};

export default function compileReleaseNotes (rels: { pr: PullsListResponseItem, issues?: IssuesGetResponse[] }[]): string {
  const releaseLineItems: ReleaseLineItem[] = rels.map((rel): ReleaseLineItem => {
    // Gather issue labels, determine first match for issue type
    const issueType = rel.issues && rel.issues[0] && rel.issues[0].labels.length && (rel.issues[0].labels.find(issue =>
      issueTypes.some(type => type === issue.name.toLowerCase())
    ) || {}).name;

    const issueTypeTitle = issueType ? issueTypeRnMappings[issueType] : 'Unknown';

    const issueStr = rel.issues?.length ? rel.issues.map(iss => `#${iss.number}`).join(' ') : '',
          releaseNotesMatches = RN_MATCHER.exec(rel.pr.body || '');

    const rn = releaseNotesMatches && releaseNotesMatches[1] ? releaseNotesMatches[1] : rel.pr.body;

    return {
      type: issueType || 'unknown',
      note: `**[${issueTypeTitle}]** ${rn.trim()} ${issueStr}`
    };
  });

  return releaseLineItems.sort((a, b) => {
    return issueTypes.indexOf(a.type) - issueTypes.indexOf(b.type);
  }).reduce((notes: string, item) => {
    return `${notes}\n${item.note}`.trim();
  }, '');
};
