const { CLOSING_VERBS } = process.env;

const closingVerbs: string[] = CLOSING_VERBS ?
  // converts CLOSING_VERBS=test,abc to [ 'test', 'abc' ]
  CLOSING_VERBS.split(',') :
  // default
  ['closes', 'fixes', 'fixed', 'resolves', 'resolved', 'gotem'];

const descMatching = new RegExp(`(?:${closingVerbs.join('|')}) +([\\d, #]+)`, 'i');

export default function extractIssueNumbers(...str: string[]): string[] {
  return str.reduce((issueNumbers: string[], s: string) => {
    // branch mode
    if (s.indexOf(' ') < 0) {
      let brMatch = /#(\d+)/.exec(s);

      if (brMatch && brMatch[1]) {
        issueNumbers.push(brMatch[1]);
        return issueNumbers;
      }
    }

    // plain mode
    let match = descMatching.exec(s);

    if (!match || !match[1]) {
      return issueNumbers;
    }

    return [...issueNumbers, ...match[1].replace(/\s|#/g, '').split(',')];
  }, []);
};
