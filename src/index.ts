import { Application } from 'probot';
import commands from 'probot-commands';

export = (destroyAllHumans: Application) => {
  commands(destroyAllHumans, 'releasenotes', async (context: any, command: any) => {
    const milestoneName = command.arguments;

    console.log('milestoneName', milestoneName);
    console.log(context.payload.pull_request);
  });
};
