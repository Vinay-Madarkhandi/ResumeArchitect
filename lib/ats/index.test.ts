import { describe, expect, it } from 'vitest';
import { atsRegistry, atsTips, identifyAts } from './index';

const urls: Record<string, string> = {
  workday: 'https://acme.wd5.myworkdayjobs.com/en-US/External/job/Engineer?source=abc',
  greenhouse: 'https://job-boards.greenhouse.io/acme/jobs/123?source=abc',
  lever: 'https://jobs.lever.co/acme/123?lever-source=site',
  icims: 'https://careers-acme.icims.com/jobs/123/job?mode=view',
  taleo: 'https://acme.taleo.net/careersection/2/jobdetail.ftl?job=123',
  successfactors: 'https://career5.successfactors.eu/career?company=acme',
  smartrecruiters: 'https://jobs.smartrecruiters.com/Acme/123-engineer?trid=1',
  ashby: 'https://jobs.ashbyhq.com/acme/123?utm_source=site',
  bamboohr: 'https://acme.bamboohr.com/careers/123?source=site',
  jobvite: 'https://jobs.jobvite.com/acme/job/123?nl=1',
  workable: 'https://apply.workable.com/acme/j/ABC/?source=site',
  jazzhr: 'https://acme.applytojob.com/apply/123/Engineer?source=site',
  breezy: 'https://acme.breezy.hr/p/123-engineer?source=site',
  recruitee: 'https://acme.recruitee.com/o/engineer?source=site',
  teamtailor: 'https://acme.teamtailor.com/jobs/123?source=site',
  personio: 'https://acme.jobs.personio.de/job/123?language=en',
  rippling: 'https://ats.rippling.com/acme/jobs/123?source=site',
  paylocity: 'https://recruiting.paylocity.com/recruiting/jobs/Details/123/Acme/Engineer',
  adp: 'https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=123',
  ukg: 'https://recruiting.ultipro.com/ACM1000/JobBoard/123?source=site',
  pinpoint: 'https://acme.pinpointhq.com/en/postings/123?source=site',
  dover: 'https://jobs.dover.com/acme/123?source=site',
  wellfound: 'https://wellfound.com/jobs/123-engineer?source=site',
};
describe('ATS identification', () => {
  it.each(Object.entries(urls))('identifies %s', (id, url) => expect(identifyAts({ url })?.id).toBe(id));
  it.each([
    ['greenhouse', 'https://boards.greenhouse.io/acme/jobs/123'],
    ['greenhouse', 'https://careers.acme.com/jobs?gh_jid=123&utm_source=x'],
    ['taleo', 'https://acme.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/123'],
    ['personio', 'https://acme.jobs.personio.com/job/123'],
    ['dover', 'https://jobs.dover.io/acme/123'],
    ['wellfound', 'https://angel.co/jobs/123'],
  ])('recognizes an additional %s URL', (id, url) => expect(identifyAts({ url })?.id).toBe(id));
  it.each([['linkedin', '<button>Easy Apply</button>'], ['indeed', '<div class="indeed-apply-button"></div>'], ['greenhouse', '<iframe src="https://boards.greenhouse.io/acme"></iframe>']])('recognizes %s page markers', (id, html) => expect(identifyAts({ html })?.id).toBe(id));
  it.each(['https://careers.acme.com/jobs/123', 'https://myworkdayjobs.com.evil.example/job', 'https://acme.oraclecloud.com/other', 'https://linkedin.com/jobs/view/123', 'https://indeed.com/viewjob?jk=123', 'invalid'])('rejects %s without evidence', url => expect(identifyAts({ url })).toBeNull());
  it('provides guidance for every registered platform', () => { for (const entry of atsRegistry) expect(atsTips(entry.id)?.guidance.length).toBeGreaterThan(0); expect(atsTips('unknown')).toBeUndefined(); });
});

describe('sourced ATS guidance', () => {
  it('provides at least two sourced tips for each platform', () => {
    for (const entry of atsRegistry) {
      const tips = atsTips(entry.id)!.guidance;
      expect(tips.length).toBeGreaterThanOrEqual(2);
      expect(tips.length).toBeLessThanOrEqual(4);
      for (const tip of tips) if (tip.basis === 'vendor documentation') expect(tip.sources.length).toBeGreaterThan(0);
    }
  });
  it('preserves the Greenhouse parsing limit and Wellfound formats', () => {
    expect(atsRegistry.find(e => e.id === 'greenhouse')!.facts.sizeLimits.map(f => f.text).join(' ')).toContain('2.5 MB');
    const formats = atsRegistry.find(e => e.id === 'wellfound')!.facts.acceptedFileTypes.map(f => f.text).join(' ');
    expect(formats).toContain('PDF');
    expect(formats).toContain('Plain Text');
  });
});
