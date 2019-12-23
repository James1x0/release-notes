import { Application, Context } from 'probot';
import commands from 'probot-commands';
import { PullsListResponseItem, IssuesGetResponse } from '@octokit/rest';
import compileReleaseNotes from './compile-release-notes';
import resolveIssueNumber from './resolve-issue-number';

type ReleaseIssue = {
  pr: PullsListResponseItem,
  issues?: IssuesGetResponse[]
};

export = (destroyAllHumans: Application) => {
  commands(destroyAllHumans, 'releasenotes', async (context: Context, command: any) => {
    const milestoneName = command.arguments;

    if (!milestoneName) {
      return;
    }

    const milestones = await context.github.issues.listMilestonesForRepo(context.issue({
      state: 'open'
    }));
    

    const milestone = milestones.data.find((ms) => ms.title.toLowerCase().replace(/\w/g, '') === milestoneName.toLowerCase().replace(/\w/g, ''));
    console.log('milestones?');
    console.log(milestone);

    const prQuery = context.github.pulls.list.endpoint.merge(context.issue({
      state: 'closed',
    }));

    context.github.issues.get()

    const releaseIssues: ReleaseIssue[] = [];

    for await (const response of context.github.paginate.iterator(prQuery)) {
      for (let i = 0; i < response.data.length; i++) {
        const pr = response.data[i];

        if (pr.body.indexOf('[RN]') < 0) {
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

    console.log('releaseissues', releaseIssues);


    // let commitList = await context.github.pulls.listCommits(context.issue());
    // console.dir(commitList.data, { depth: 12 });

    console.log('milestoneName', milestoneName);
    // console.log(context.payload.pull_request);
  });
};
