import { Application, Context } from 'probot';
import inflector from 'i';
import commands from 'probot-commands';
import { PullsListResponseItem, IssuesGetResponse } from '@octokit/rest';
import compileReleaseNotes from './compile-release-notes';
import resolveIssueNumber from './resolve-issue-number';

const { titleize } = inflector();

type ReleaseIssue = {
  pr: PullsListResponseItem,
  issues?: IssuesGetResponse[]
};

async function requestHandler (context: Context, command: any) {
  const milestoneName = command.arguments;

  if (!milestoneName) {
    return;
  }

  const milestones = await context.github.issues.listMilestonesForRepo(context.issue({
    state: 'open'
  }));


  const milestone = milestones.data.find((ms) => ms.title.toLowerCase().replace(/\W/g, '') === milestoneName.toLowerCase().replace(/\W/g, ''));

  const prQuery = context.github.pulls.list.endpoint.merge(context.issue({
    state: 'closed'
  }));

  const releaseIssues: ReleaseIssue[] = [];

  console.log('Milestone:', milestone);

  for await (const response of context.github.paginate.iterator(prQuery)) {
    for (let i = 0; i < response.data.length; i++) {
      const pr = response.data[i];

      if (pr.body.toLowerCase().indexOf('[rn]') < 0 || (pr.milestone || {}).id !== (milestone || {}).id) {
        continue;
      }

      const closesIssues = resolveIssueNumber(pr.body);

      let releaseItem: ReleaseIssue = {
        pr,
        issues: []
      };

      if (closesIssues.length) {
        releaseItem.issues = await Promise.all(closesIssues.map(async (issNum: string) =>
          (await context.github.issues.get(context.issue({
            issue_number: issNum
          }))).data
        ));
      }

      releaseIssues.push(releaseItem);
    }
  }

  let repoVersion;

  try {
    const packageJsonReq = (await context.github.repos.getContents(context.repo({
      path: 'package.json',
      ref: context.payload.pull_request.head.ref
    })));


    const data: any = packageJsonReq.data;

    if (data.content) {
      repoVersion = JSON.parse(Buffer.from(data.content, data.encoding).toString()).version;
    }
    console.log(repoVersion);
  } catch (e) {
    context.log.error(`Unable to get package version: ${e}`);
  }

  const releaseNotesHeader = `## ${titleize(context.repo().repo)} ${repoVersion ? '@ ' + repoVersion : ''}`.trim(),
        releaseNotes       = `${releaseNotesHeader}\n${compileReleaseNotes(releaseIssues)}`,
        prBody             = context.payload.pull_request?.body,
        reworkedPrBody     = prBody.replace(/\/releasenotes.*/, releaseNotes);

  await context.github.pulls.update(context.issue({
    body: reworkedPrBody
  }));
}

export = (destroyAllHumans: Application) => {
  commands(destroyAllHumans, 'releasenotes', requestHandler);
};
