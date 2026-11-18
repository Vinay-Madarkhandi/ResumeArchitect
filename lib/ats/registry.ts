import factsData from './facts.json';

export interface SourcedFact { text: string; sources: string[]; }
export interface AtsFacts { acceptedFileTypes: SourcedFact[]; sizeLimits: SourcedFact[]; parsesIntoFields: 'yes' | 'no' | 'unknown'; recruiterSees: 'original' | 'parsed' | 'both' | 'unknown'; accountRequired: 'yes' | 'no' | 'unknown'; parsing: SourcedFact[]; recruiterVisibility: SourcedFact[]; searchFeatures: SourcedFact[]; account: SourcedFact[]; }

/** Patterns are matched against the parsed URL, never against arbitrary substrings. */
export interface AtsEntry {
  facts: AtsFacts;
  id: string;
  name: string;
  hosts: string[];
  urlPatterns?: RegExp[];
  htmlMarkers: RegExp[];
  parsingNotes: string;
}

const entry = (id: string, name: string, hosts: string[], htmlMarkers: RegExp[], parsingNotes = 'Review every field after uploading your resume.', urlPatterns?: RegExp[]): AtsEntry => ({ id, name, hosts, htmlMarkers, parsingNotes, urlPatterns, facts: factsData[id as keyof typeof factsData] as AtsFacts });

export const atsRegistry: AtsEntry[] = [
  entry('workday', 'Workday', ['myworkdayjobs.com'], [/\bmyworkdayjobs\.com\b/i]),
  entry('greenhouse', 'Greenhouse', ['boards.greenhouse.io', 'job-boards.greenhouse.io'], [/\b(?:boards|job-boards)\.greenhouse\.io\b/i], undefined, [/^(?:boards|job-boards)\.greenhouse\.io\//i, /^[^/]+\/.*[?&]gh_jid=\d+(?:&|$)/i]),
  entry('lever', 'Lever', ['jobs.lever.co'], [/\bjobs\.lever\.co\b/i]),
  entry('icims', 'iCIMS', ['icims.com'], [/\bicims\.com\b/i]),
  entry('taleo', 'Taleo / Oracle Recruiting Cloud', ['taleo.net', 'oraclecloud.com'], [/\btaleo\.net\b/i, /\bfa-[a-z0-9-]+\.oraclecloud\.com\/hcmUI\/CandidateExperience\b/i], undefined, [/^(?:[^/]+\.)?taleo\.net\//i, /^[^/]*oraclecloud\.com\/hcmUI\/CandidateExperience(?:\/|\?|$)/i]),
  entry('successfactors', 'SAP SuccessFactors', ['successfactors.com', 'successfactors.eu', 'career5.successfactors.eu'], [/\bsuccessfactors\.(?:com|eu)\b/i]),
  entry('smartrecruiters', 'SmartRecruiters', ['jobs.smartrecruiters.com'], [/\bjobs\.smartrecruiters\.com\b/i]),
  entry('ashby', 'Ashby', ['jobs.ashbyhq.com'], [/\bjobs\.ashbyhq\.com\b/i]),
  entry('bamboohr', 'BambooHR', ['bamboohr.com'], [/\bbamboohr\.com\/careers\b/i], undefined, [/^[^/]*bamboohr\.com\/careers(?:\/|\?|$)/i]),
  entry('jobvite', 'Jobvite', ['jobs.jobvite.com'], [/\bjobs\.jobvite\.com\b/i]),
  entry('workable', 'Workable', ['apply.workable.com'], [/\bapply\.workable\.com\b/i]),
  entry('jazzhr', 'JazzHR', ['applytojob.com'], [/\bapplytojob\.com\b/i]),
  entry('breezy', 'Breezy', ['breezy.hr'], [/\bbreezy\.hr\b/i]),
  entry('recruitee', 'Recruitee', ['recruitee.com'], [/\brecruitee\.com\b/i]),
  entry('teamtailor', 'Teamtailor', ['teamtailor.com'], [/\bteamtailor\.com\b/i]),
  entry('personio', 'Personio', ['jobs.personio.de', 'jobs.personio.com'], [/\bjobs\.personio\.(?:de|com)\b/i]),
  entry('rippling', 'Rippling', ['ats.rippling.com'], [/\bats\.rippling\.com\b/i]),
  entry('paylocity', 'Paylocity', ['recruiting.paylocity.com'], [/\brecruiting\.paylocity\.com\b/i]),
  entry('adp', 'ADP', ['workforcenow.adp.com', 'recruiting.adp.com'], [/\b(?:workforcenow|recruiting)\.adp\.com\b/i]),
  entry('ukg', 'UKG / UltiPro', ['ultipro.com', 'recruiting.ultipro.com'], [/\b(?:recruiting\.)?ultipro\.com\b/i]),
  entry('pinpoint', 'Pinpoint', ['pinpointhq.com'], [/\bpinpointhq\.com\b/i]),
  entry('dover', 'Dover', ['jobs.dover.com', 'jobs.dover.io'], [/\bjobs\.dover\.(?:com|io)\b/i]),
  entry('wellfound', 'Wellfound / AngelList', ['wellfound.com', 'angel.co'], [/\bwellfound\.com\b/i], undefined, [/^(?:www\.)?(?:wellfound\.com|angel\.co)\/(?:jobs|company)\//i]),
  entry('linkedin', 'LinkedIn Easy Apply', ['linkedin.com'], [/\beasy apply\b/i], undefined, [/^(?:[\w-]+\.)?linkedin\.com\/jobs\/(?:view|collections)\//i]),
  entry('indeed', 'Indeed Apply', ['indeed.com'], [/\bindeed-apply\b/i], undefined, [/^(?:[\w-]+\.)?indeed\.com\/(?:viewjob|rc\/clk|pagead\/clk)(?:\?|\/|$)/i]),
];
