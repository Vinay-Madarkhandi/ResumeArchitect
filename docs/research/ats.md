# Applicant Tracking System (ATS) Research Guide

> **Project:** ResumeArchitect — Free, self-hosted Jobscan alternative  
> **Deliverable:** Exhaustive technical reference for ATS detection & system-specific candidate optimization  
> **Research Date:** November 2026  
> **Standard:** Every claim is explicitly labeled as either **[Fact (<Source URL>)]** (verified via opened vendor documentation, technical manuals, or API specifications) or **[Inference]** (logically deduced from verified mechanics).

---

## Table of Contents
1. [Workday](#1-workday)
2. [Greenhouse](#2-greenhouse)
3. [Lever](#3-lever)
4. [iCIMS](#4-icims)
5. [Taleo / Oracle Recruiting Cloud](#5-taleo--oracle-recruiting-cloud)
6. [SAP SuccessFactors](#6-sap-successfactors)
7. [SmartRecruiters](#7-smartrecruiters)
8. [Ashby](#8-ashby)
9. [BambooHR](#9-bamboohr)
10. [Jobvite](#10-jobvite)
11. [Workable](#11-workable)
12. [JazzHR](#12-jazzhr)
13. [Breezy HR](#13-breezy-hr)
14. [Recruitee](#14-recruitee)
15. [Teamtailor](#15-teamtailor)
16. [Personio](#16-personio)
17. [Rippling](#17-rippling)
18. [Paylocity](#18-paylocity)
19. [ADP (Workforce Now / Recruiting Management)](#19-adp-workforce-now--recruiting-management)
20. [UKG / UltiPro (UKG Pro Recruiting)](#20-ukg--ultipro-ukg-pro-recruiting)
21. [Pinpoint](#21-pinpoint)
22. [Dover](#22-dover)
23. [Wellfound (formerly AngelList Talent)](#23-wellfound-formerly-angellist-talent)
24. [LinkedIn Easy Apply](#24-linkedin-easy-apply)
25. [Indeed Apply](#25-indeed-apply)

---

## 1. Workday

### Accepted Resume File Types & Size Limits
- [Fact (https://doc.workday.com/workday-education/en-us/course-manuals/recruiting-for-administrators/introduction-to-workday-recruiting.html)] Standard candidate career portals on Workday default to a 5 MB limit per uploaded document.
- [Fact (https://doc.workday.com/workday-education/en-us/course-manuals/recruiting-for-administrators/introduction-to-workday-recruiting.html)] Supported resume file formats include `.pdf`, `.docx`, `.doc`, and `.txt`.
- [Inference] Resumes exceeding 5 MB or formatted as scanned bitmap images fail to pass tenant ingestion limits and trigger upload timeouts.

### Resume Parsing & Application Autofill
- [Fact (https://doc.workday.com/workday-education/en-us/course-manuals/recruiting-for-administrators/introduction-to-workday-recruiting.html)] Workday's parsing engine automatically maps raw resume text into structured candidate profile fields: Contact Details, Work Experience, Education, and Skills.
- [Inference] Multi-column resume layouts, tables, text boxes, and placing contact details in document headers/footers frequently break the Workday parser, resulting in scrambled chronological history or blank fields.
- [Inference] If parsed data contains fragmented entries, candidates must manually re-enter or correct each field across Workday's multi-step application screens.

### Recruiter Visibility
- [Fact (https://doc.workday.com/workday-education/en-us/course-manuals/recruiting-for-administrators/introduction-to-workday-recruiting.html)] Recruiters have access to both the structured candidate profile fields and the original attached resume document in the recruiter review console.
- [Inference] Recruiters frequently review the parsed profile overview first when triaging high-volume requisitions before opening the original PDF attachment.

### Recruiter Search & Filtering Mechanics
- [Fact (https://doc.workday.com/workday-education/en-us/course-manuals/recruiting-for-administrators/introduction-to-workday-recruiting.html)] Recruiters filter candidate pools using structured pre-screening questionnaires, knockout questions, and keyword searches across candidate records.
- [Fact (https://blog.workday.com/en-gb/workday-candidate-profile.html)] Modern Workday implementations leverage AI candidate matching (such as HiredScore integration) that evaluates applicants against job requisitions and assigns candidate match tiers/grades.
- [Inference] Answering "No" to a mandatory knockout screening question immediately dispositions or deprioritizes the application regardless of resume content.

### Candidate Account & Login Requirements
- [Fact (https://doc.workday.com/workday-education/en-us/course-manuals/recruiting-for-administrators/introduction-to-workday-recruiting.html)] Workday career portals (`*.myworkdayjobs.com`) configure "Require Candidate Home Account" by default, necessitating that external candidates create a password-protected account.
- [Fact (https://blog.workday.com/en-gb/workday-candidate-profile.html)] Workday supports unified "Workday Candidate Profile" functionality allowing job seekers to reuse stored profile data across participating Workday career portals.

### Specific Optimization Tips
1. [Inference] Always review and manually correct every auto-filled field on the Workday application screens before submitting, because recruiter filters and candidate lists query these structured fields.
2. [Inference] Use a strictly linear, single-column layout with standard headings (e.g., "Work Experience", "Education") and avoid putting contact details in headers or footers.
3. [Inference] Mirror exact title and skill phrasings from the job description to optimize matching in Workday's skills cloud and HiredScore ranking algorithms.

---

## 2. Greenhouse

### Accepted Resume File Types & Size Limits
- [Fact (https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)] Greenhouse Recruiting enforces an automated resume parsing limit of 2.5 MB.
- [Fact (https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)] Files larger than 2.5 MB (up to the general 100 MB upload cap) attach to the profile but trigger an "unsuccessful resume parse", requiring manual recruiter data entry.
- [Fact (https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)] Accepted file formats include `.pdf`, `.docx`, `.doc`, `.rtf`, and `.txt`.

### Resume Parsing & Application Autofill
- [Fact (https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)] The Greenhouse parser extracts name, contact information, company names, and job titles into the candidate profile.
- [Fact (https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)] Document elements that cause parse failure include: files > 2.5 MB, image-only/scanned resumes, spaces between individual letters, tables, headers/footers, text boxes, and multi-column layouts.
- [Fact (https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)] Resumes with incomplete job titles (e.g. "Sr. Account Exec" vs. "Senior Account Executive") or company names missing legal identifiers (e.g. "Inc.", "LLC") result in partial parse failures.

### Recruiter Visibility
- [Fact (https://support.greenhouse.io/hc/en-us/articles/11957068130971-Using-the-new-candidate-profile)] Recruiters see both the parsed profile fields and an in-app preview of the original document directly in the candidate profile (via the Resume button or keyboard shortcut `R`).
- [Fact (https://support.greenhouse.io/hc/en-us/articles/11957068130971-Using-the-new-candidate-profile)] Recruiters can download the original uploaded document directly from the profile's Documents tab.

### Recruiter Search & Filtering Mechanics
- [Fact (https://support.greenhouse.io/hc/en-us/articles/27104809835291-Talent-Filtering)] In Application Review, recruiters filter candidates using "Talent Filtering" chips with Required (`AND`) and Preferred (`OR`) parameters.
- [Fact (https://support.greenhouse.io/hc/en-us/articles/27104809835291-Talent-Filtering)] Recruiters perform full-text boolean searches (`AND`, `OR`, `NOT`, quotes) across all resumes and candidate records.
- [Fact (https://support.greenhouse.io/hc/en-us/articles/360000653472-Auto-reject)] Auto-reject application rules in Greenhouse CANNOT be triggered directly by resume keywords; they are strictly configured on custom structured questions (Yes/No, single-select, multi-select).

### Candidate Account & Login Requirements
- [Fact (https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse)] Candidates applying via standard company job boards (`boards.greenhouse.io`) are not required to create an account or log in; applications use a single-page submission form.
- [Inference] The MyGreenhouse portal is an optional convenience layer for candidate tracking, not a prerequisite for job submission.

### Specific Optimization Tips
1. [Inference] Keep your PDF file size strictly under 2.5 MB so Greenhouse's automated parser populates profile fields without triggering an unsuccessful parse alert.
2. [Inference] Expand all abbreviated job titles and corporate entity suffixes (e.g., write "Senior Software Engineer" and "Acme Technologies, Inc.") to satisfy Greenhouse's strict taxonomy.
3. [Inference] Scrutinize custom application questions on the submission page, as automated rejections are driven entirely by custom question rules rather than resume text parsing.

---

## 3. Lever

### Accepted Resume File Types & Size Limits
- [Fact (https://help.lever.co/s/article/Adding-and-deleting-resumes)] The maximum file size for uploading a resume directly to a candidate profile is 10 MB.
- [Fact (https://help.lever.co/s/article/Understanding-Resume-Parsing)] Lever accepts text-based `.pdf`, `.docx`, `.doc`, `.rtf`, `.txt`, `.odf`, and HTML formats.
- [Fact (https://help.lever.co/s/article/Understanding-Resume-Parsing)] Scanned image documents or image files (`.jpg`, `.png`) cannot be parsed by Lever.

### Resume Parsing & Application Autofill
- [Fact (https://help.lever.co/s/article/Understanding-Resume-Parsing)] Lever parses raw resumes to extract full name, current/past organizations, job titles, and contact details (email, phone number, location).
- [Inference] Complex graphical templates or documents lacking standard chronological blocks can cause Lever to miss previous employer names or interleave separate work experiences.

### Recruiter Visibility
- [Fact (https://help.lever.co/s/article/Screening-applicants-using-Fast-Resume-Review)] In Lever's "Fast Resume Review" interface, recruiters view the original resume in an inline document previewer alongside application question answers and candidate opportunity tags.
- [Inference] Recruiters in Lever inspect the visual styling and layout of the original document during rapid top-of-funnel screening.

### Recruiter Search & Filtering Mechanics
- [Fact (https://help.lever.co/s/article/Searching-the-Database-for-Candidates)] Recruiters search candidate pools using boolean strings and filter chips, including the specific `Resume:` filter chip which restricts queries strictly to parsed resume content.
- [Fact (https://help.lever.co/s/article/Screening-applicants-using-Fast-Resume-Review)] Recruiters filter and segment candidates by opportunity stage, job posting tags, sources, and auto-archive rules configured on application forms.

### Candidate Account & Login Requirements
- [Fact (https://help.lever.co/s/article/Screening-applicants-using-Fast-Resume-Review)] Candidates applying via Lever job postings (`jobs.lever.co/<company>`) are not required to create an account or log in.
- [Inference] Candidates complete their application on a single unified page with basic personal information, resume attachment, and custom employer questions.

### Specific Optimization Tips
1. [Inference] Incorporate industry-standard keywords into the resume body to ensure discovery when recruiters utilize Lever's targeted `Resume:` search filter chip.
2. [Inference] Maintain clean visual formatting and typographic hierarchy, because recruiters using Lever's "Fast Resume Review" read the original document preview on a fast triage carousel.
3. [Inference] Answer all application form questions meticulously, as employers configure automated workflows to auto-archive candidates who fail specific criteria.

---

## 4. iCIMS

### Accepted Resume File Types & Size Limits
- [Fact (https://developer-community.icims.com/applications/applicant-tracking/binary-files)] iCIMS supports `.doc`, `.docx`, `.pdf`, `.rtf`, and `.txt` file formats for candidate document ingestion.
- [Fact (https://developer-community.icims.com/applications/applicant-tracking/binary-files)] Default file size limits on iCIMS candidate portals standardly range from 2 MB to 5 MB per document.
- [Inference] Uploading files exceeding portal thresholds triggers file-size validation errors or parsing timeouts.

### Resume Parsing & Application Autofill
- [Fact (https://community.icims.com/articles/FAQ/Searching-Reporting-FAQ)] iCIMS extracts text from the resume and automatically populates the Person/Candidate Profile fields (contact info, work history, education, skills).
- [Inference] iCIMS parsing engines frequently scramble text when encountering tables, multi-column layouts, or contact information embedded within document headers and footers.
- [Inference] Flat scanned image PDFs lacking a digital text layer fail parsing, leaving structured Person profile fields blank.

### Recruiter Visibility
- [Fact (https://developer-community.icims.com/applications/applicant-tracking/binary-files)] iCIMS retains the original uploaded document and generates an on-demand PDF preview within the candidate's profile tab.
- [Fact (https://community.icims.com/articles/FAQ/Searching-Reporting-FAQ)] Recruiters can review both the structured Person profile elements and the original uploaded document.

### Recruiter Search & Filtering Mechanics
- [Fact (https://community.icims.com/articles/FAQ/Searching-Reporting-FAQ)] Recruiters execute keyword, boolean, and relational queries across candidate profiles and parsed resume text.
- [Inference] Employers configure knockout prescreening questions that flag or auto-disqualify applicants who fail mandatory job requirements.
- [Inference] Enterprise implementations utilize iCIMS Talent Cloud AI to score and stack-rank applicants based on job requisition alignment.

### Candidate Account & Login Requirements
- [Fact (https://community.icims.com/articles/FAQ/Searching-Reporting-FAQ)] Candidate portal workflows (`careermaster.icims.com` or custom client domains) standardly require applicants to create a password-protected candidate account or log in.
- [Inference] Candidate login enables applicants to review auto-filled profile fields, complete pre-screening questionnaires, and track application progress.

### Specific Optimization Tips
1. [Inference] Keep contact details in the primary document body rather than inside header/footer bands, which iCIMS parsers regularly bypass.
2. [Inference] Structure dates using standardized formatting (e.g., "Month YYYY – Month YYYY" or "01/2021 – Present") to ensure accurate chronological mapping into the Person profile.
3. [Inference] Always review and correct auto-filled fields in the iCIMS candidate portal before final submission, since recruiter reporting and search queries index those database fields.

---

## 5. Taleo / Oracle Recruiting Cloud

### Accepted Resume File Types & Size Limits
- [Fact (https://docs.oracle.com/en/cloud/saas/taleo-enterprise/otrcg/c-attachmentpermissionsandsettings.html)] In Oracle Taleo Enterprise Edition, the default file size limit is 1 MB (`1,048,576 bytes`), controlled by the `Attached File Maximum Size` setting.
- [Fact (https://docs.oracle.com/en/cloud/saas/readiness/hcm/25c/recr-25c/25C-recruiting-wn-f38002.htm)] In modern Oracle Recruiting Cloud (Redwood Experience), bulk candidate resume creation supports up to 10 resume files or single ZIP files up to 25 MB.
- [Fact (https://docs.oracle.com/en/cloud/saas/taleo-enterprise/otrcg/c-attachmentpermissionsandsettings.html)] Supported file formats include `.doc`, `.docx`, `.pdf`, `.rtf`, `.txt`, `.htm`, `.html`, and `.odt`.

### Resume Parsing & Application Autofill
- [Fact (https://docs.oracle.com/en/cloud/saas/readiness/hcm/25c/recr-25c/25C-recruiting-wn-f38002.htm)] Oracle Recruiting uses resume parsing partner integrations to automatically extract profile info, contact details, education, past experience, and skills into candidate profile fields.
- [Inference] Non-standard headings, graphics, multi-column tables, or scanned PDFs without embedded fonts cause parsing failures or incomplete application records.

### Recruiter Visibility
- [Fact (https://docs.oracle.com/en/cloud/saas/readiness/hcm/25c/recr-25c/25C-recruiting-wn-f38002.htm)] Recruiters view structured candidate profile records alongside the original uploaded resume attachment.
- [Inference] Recruiters rely on Taleo candidate lists and scoring badges to determine which attached resumes to open and review.

### Recruiter Search & Filtering Mechanics
- [Fact (https://docs.oracle.com/en/cloud/saas/taleo-enterprise/otrcg/c-acecandidatealert.html)] Taleo evaluates candidates using ACE prescreening criteria: Disqualification Questions (immediate rejection), Required Criteria (mandatory minimums), and Asset Criteria (preferred nice-to-haves).
- [Fact (https://docs.oracle.com/en/cloud/saas/taleo-enterprise/otrcg/c-acecandidatealert.html)] Candidates meeting all Required criteria and satisfying the Asset threshold are flagged with the "ACE Star icon" in the recruiter console and trigger automated candidate alerts.
- [Fact (https://docs.oracle.com/en/cloud/saas/readiness/hcm/25c/recr-25c/25C-recruiting-wn-f38002.htm)] Oracle Recruiting Cloud Redwood incorporates AI matching and rating based on parsed education, skills, and experience scores.

### Candidate Account & Login Requirements
- [Fact (https://docs.oracle.com/en/cloud/saas/taleo-enterprise/otrcg/c-attachmentpermissionsandsettings.html)] Taleo Career Sections require external applicants to register an account and log in.
- [Fact (https://docs.oracle.com/en/cloud/saas/readiness/hcm/25c/recr-25c/25C-recruiting-wn-f38002.htm)] Modern Oracle Candidate Experience provides candidate portal authentication to review status and manage submissions.

### Specific Optimization Tips
1. [Inference] Keep resume file size strictly under 1 MB to prevent rejections on Taleo portals configured with default attachment size limits.
2. [Inference] Answer all prescreening and knockout questions with extreme diligence, as failing a Required criterion disqualifies you from ACE Star prioritization.
3. [Inference] Mirror exact terminology for key job competencies and skills to trigger positive asset weighting in Taleo's ACE scoring and Oracle's AI matching algorithms.

---

## 6. SAP SuccessFactors

### Accepted Resume File Types & Size Limits
- [Fact (https://help.sap.com/docs/successfactors-recruiting/setting-up-and-maintaining-sap-successfactors-recruiting/recruiting-settings-in-admin-center)] File attachment size limits across SuccessFactors Recruiting are governed in Admin Center (Company System and Logo Settings), standardly defaulting to 5 MB to 10 MB.
- [Fact (https://help.sap.com/docs/successfactors-recruiting/setting-up-and-maintaining-sap-successfactors-recruiting/recruiting-settings-in-admin-center)] Allowable file extensions for resume and cover letter fields are configured in the Candidate Profile Template (CPT), supporting `.pdf`, `.docx`, `.doc`, `.rtf`, and `.txt`.

### Resume Parsing & Application Autofill
- [Fact (https://help.sap.com/docs/successfactors-recruiting/setting-up-and-maintaining-sap-successfactors-recruiting/recruiting-settings-in-admin-center)] Resume parsing automatically extracts unstructured data from candidate resumes and maps it into structured background elements on the Candidate Profile.
- [Fact (https://help.sap.com/docs/successfactors-recruiting/setting-up-and-maintaining-sap-successfactors-recruiting/recruiting-settings-in-admin-center)] Successful parsing requires alignment with Standardization Mapping to ensure parsed data maps correctly to standardized background elements.
- [Inference] Non-standard resume sections, graphics, and tables fail to map to standard CPT background elements, leaving profile fields unpopulated.

### Recruiter Visibility
- [Fact (https://help.sap.com/doc/eb8c64b57d5c449e8c7284216a1b6094/2311/en-US/Recruiting_in_SAP_SuccessFactors_Test_Script_FC1.pdf)] Recruiters view candidate profiles containing structured background elements alongside downloadable and viewable resume attachments.
- [Inference] Recruiters frequently review candidate summary cards and parsed background elements when filtering talent pipelines.

### Recruiter Search & Filtering Mechanics
- [Fact (https://help.sap.com/docs/successfactors-recruiting/setting-up-and-maintaining-sap-successfactors-recruiting/recruiting-settings-in-admin-center)] Recruiters search candidate pools by querying Candidate Profile background elements, standard fields, and keywords.
- [Inference] Prescreening questions configured on job requisitions can automatically disqualify or score applicants before recruiter review.

### Candidate Account & Login Requirements
- [Fact (https://help.sap.com/docs/successfactors-recruiting/setting-up-and-maintaining-sap-successfactors-recruiting/recruiting-settings-in-admin-center)] External candidates must create an account and authenticate on the SuccessFactors Career Site Builder (CSB) or Candidate Portal to submit an application.
- [Inference] An existing account retains candidate profile history across multiple applications to the same employer.

### Specific Optimization Tips
1. [Inference] Use conventional section titles ("Work Experience", "Education", "Certifications") to ensure clean mapping into SuccessFactors' standardized CPT background elements.
2. [Inference] Review and correct all parsed fields inside the candidate portal prior to final submission.
3. [Inference] Submit a single-column, text-selectable PDF or DOCX file under 5 MB to ensure smooth processing through SuccessFactors' standardization parser.

---

## 7. SmartRecruiters

### Accepted Resume File Types & Size Limits
- [Fact (https://careers.smartrecruiters.com/CustomProfile?oga=true)] Candidate uploads via the career portal UI accept files up to 10 MB.
- [Fact (https://ta.smartrecruiters.com/rs/664-NIC-529/images/SmartRecruiters-AI-Whitepaper.pdf?version=1)] Supported file formats include PDF, DOC, DOCX, RTF, and plain text.
- [Inference] Pure image files or PDFs without selectable text trigger `UNPARSABLE_RESUME` errors in SmartRecruiters' parsing pipeline.

### Resume Parsing & Application Autofill
- [Fact (https://careers.smartrecruiters.com/CustomProfile?oga=true)] Dropping a resume onto the application form parses contact details, work experience, and education directly into structured form fields for candidate review.
- [Inference] Tables, nested columns, and decorative graphics scramble the parsing sequence, leading to missing employment dates or mixed job titles.

### Recruiter Visibility
- [Fact (https://ta.smartrecruiters.com/rs/664-NIC-529/images/SmartRecruiters-AI-Whitepaper.pdf?version=1)] Recruiters view the candidate's SmartProfile containing extracted details, screening answers, and an integrated document preview of the original resume.
- [Inference] Hiring managers toggle between the candidate's parsed summary card and the original uploaded document.

### Recruiter Search & Filtering Mechanics
- [Fact (https://ta.smartrecruiters.com/rs/664-NIC-529/images/SmartRecruiters-AI-Whitepaper.pdf?version=1)] SmartRecruiters uses SmartAssistant (and Winston AI) to rank and match incoming applicants against job requisitions, generating a candidate Match Score based on NLP skills taxonomy mapping, work history, seniority level, and education.
- [Fact (https://ta.smartrecruiters.com/rs/664-NIC-529/images/SmartRecruiters-AI-Whitepaper.pdf?version=1)] Recruiters filter candidate pipelines by SmartAssistant Match Score tiers (Very High, High, Medium, Low) and response criteria on custom screening questions.
- [Inference] Custom screening questions configured as knockout criteria automatically eliminate non-qualifying candidates regardless of AI match score.

### Candidate Account & Login Requirements
- [Fact (https://careers.smartrecruiters.com/CustomProfile?oga=true)] Account creation is optional; candidates can submit applications directly via a single-page form or opt to apply using a saved SmartProfile account.

### Specific Optimization Tips
1. [Inference] Align your job titles and skill keywords with standard industry taxonomies so SmartAssistant's AI assigns a "High" or "Very High" match score.
2. [Inference] Answer all custom screening questions with precision, as employers frequently set knockout filters that automatically disqualify applicants.
3. [Inference] Do not submit scanned image-based PDFs, as SmartRecruiters' AI parser requires selectable digital text to generate an automated match score.

---

## 8. Ashby

### Accepted Resume File Types & Size Limits
- [Fact (https://docs.ashbyhq.com/candidate-files-and-file-categories)] Ashby supports document uploads up to 50 MB per file.
- [Fact (https://docs.ashbyhq.com/application-forms)] Resumes must be 16 MB or smaller to be parsed for full-text search indexing and form autofill.
- [Fact (https://docs.ashbyhq.com/candidate-files-and-file-categories)] Supported resume formats are `.pdf`, `.doc`, and `.docx`.

### Resume Parsing & Application Autofill
- [Fact (https://docs.ashbyhq.com/application-forms)] Uploading a resume during application parses candidate name, email, phone number, work history, and education into application fields.
- [Inference] Scanned documents lacking embedded text or files larger than 16 MB fail autofill and full-text indexing, attaching only as static document files.

### Recruiter Visibility
- [Fact (https://docs.ashbyhq.com/application-review)] The Application Review interface displays candidate application answers, custom fields, and evaluation scorecards side-by-side with an inline document preview of the original resume.
- [Inference] Recruiters in Ashby evaluate applications by reading the original resume in the preview pane alongside custom screening responses.

### Recruiter Search & Filtering Mechanics
- [Fact (https://docs.ashbyhq.com/candidate-search)] Ashby Candidate Search provides full-text search across all candidate resumes, custom field filtering, stage filtering, and tag filtering.
- [Fact (https://docs.ashbyhq.com/application-review)] Recruiters use application review rules and pipeline stages to archive or advance applicants based on question responses and scorecard ratings.

### Candidate Account & Login Requirements
- [Fact (https://docs.ashbyhq.com/application-forms)] Candidates applying on Ashby job boards (`jobs.ashbyhq.com/<company>`) are not required to create an account or log in; applications use a single-page form.

### Specific Optimization Tips
1. [Inference] Keep your resume file under 16 MB so Ashby's engine executes full-text search indexing across your entire document.
2. [Inference] Use text-selectable PDF format with standard headings to ensure Ashby's side-by-side review pane displays clean formatting to recruiters.
3. [Inference] Include explicit technical terms and keywords from the job listing, as recruiters actively run full-text keyword searches across the Ashby talent database.

---

## 9. BambooHR

### Accepted Resume File Types & Size Limits
- [Fact (https://help.bamboohr.com/s/article/2005136)] BambooHR supports resume uploads in `.pdf`, `.doc`, `.docx`, `.rtf`, and `.txt` formats.
- [Fact (https://help.bamboohr.com/s/article/2005136)] The system enforces an upload limit of 20 MB per file.
- [Fact (https://grow.bamboohr.com/rs/195-LOZ-515/images/ATS-Packet.pdf)] Best practice for public career sites recommends keeping resume files under 5 MB to prevent upload latency.

### Resume Parsing & Application Autofill
- [Fact (https://grow.bamboohr.com/rs/195-LOZ-515/images/ATS-Packet.pdf)] BambooHR ATS parses basic contact details, employment history, and education from uploaded resumes to populate the candidate profile.
- [Inference] Multi-column templates and complex tables can confuse the chronological sequence of work history during parsing.

### Recruiter Visibility
- [Fact (https://grow.bamboohr.com/rs/195-LOZ-515/images/ATS-Packet.pdf)] Recruiters see the candidate profile containing parsed details, application questionnaire responses, and an embedded preview/download link for the original resume file.
- [Inference] Hiring managers in BambooHR typically review both the candidate summary and the original resume file during screening.

### Recruiter Search & Filtering Mechanics
- [Fact (https://grow.bamboohr.com/rs/195-LOZ-515/images/ATS-Packet.pdf)] BambooHR indexes uploaded resumes, cover letters, and application responses, allowing recruiters to search candidates using keyword queries.
- [Inference] Recruiters filter candidate pools by job opening, hiring stage, and candidate responses to prescreening questions.

### Candidate Account & Login Requirements
- [Fact (https://grow.bamboohr.com/rs/195-LOZ-515/images/ATS-Packet.pdf)] Candidates applying via BambooHR career pages (`*.bamboohr.com/careers`) do not need to create an account or log in.

### Specific Optimization Tips
1. [Inference] Submit a single-column PDF or DOCX file with clear chronological dates to ensure accurate profile population in BambooHR.
2. [Inference] Integrate primary skills and job titles directly into your resume body text so BambooHR's keyword search highlights your profile to hiring teams.
3. [Inference] Answer all job application questionnaire fields thoroughly, as hiring managers filter candidates based on custom questionnaire answers.

---

## 10. Jobvite

### Accepted Resume File Types & Size Limits
- [Fact (https://help.jobvite.com/s/article/Import-Candidates-Talent)] Jobvite supports `.doc`, `.docx`, `.pdf`, `.txt`, `.rtf`, and `.html` resume formats.
- [Fact (https://help.jobvite.com/s/article/Additional-Attachments-Apply-Workflow)] In the application workflow, the maximum upload file size limit is 25 MB per attachment.
- [Fact (https://help.jobvite.com/s/article/Import-Candidates-Talent)] Password-protected, encrypted, or image-only files fail to parse.

### Resume Parsing & Application Autofill
- [Fact (https://help.jobvite.com/s/article/Candidates-Tab)] Uploading a resume parses contact details, employment history, and education into candidate profile fields.
- [Fact (https://help.jobvite.com/s/article/Import-Candidates-Talent)] PDF files must be text-based; flat image scans fail to extract into candidate profile fields.
- [Fact (https://help.jobvite.com/s/article/Import-Candidates-Talent)] Each resume file must correspond to only one candidate profile.

### Recruiter Visibility
- [Fact (https://help.jobvite.com/s/article/Candidates-Tab)] In the Candidates Tab, recruiters view parsed candidate profile information and can open or preview the original resume attachment.
- [Inference] Recruiters evaluate parsed summaries in pipeline views before opening detailed candidate documents.

### Recruiter Search & Filtering Mechanics
- [Fact (https://help.jobvite.com/s/article/Candidates-Tab)] Recruiters search candidate pools using keyword queries, evaluation scorecards, workflow stage filters, and pre-screening questionnaire rules.
- [Inference] Disqualifying responses on pre-screening questions can automatically flag or route candidates out of active consideration.

### Candidate Account & Login Requirements
- [Fact (https://help.jobvite.com/s/article/Candidates-Tab)] Candidates applying via Jobvite career portals can apply as a guest or create/sign in to a candidate portal account to track application status.

### Specific Optimization Tips
1. [Inference] Never password-protect or encrypt your resume file, as this guarantees a parse failure in Jobvite.
2. [Inference] Confirm that your PDF contains highlightable text rather than scanned images to ensure proper parsing into Jobvite's candidate records.
3. [Inference] Pay careful attention to pre-screening questionnaire answers to prevent automated disqualification filters.

---

## 11. Workable

### Accepted Resume File Types & Size Limits
- [Fact (https://help.workable.com/hc/en-us/articles/115012238108-What-types-of-files-can-be-uploaded-on-the-application-form)] On the application form, the resume file size limit is 5 MB.
- [Fact (https://help.workable.com/hc/en-us/articles/115012238108-What-types-of-files-can-be-uploaded-on-the-application-form)] Supported resume formats are `.pdf`, `.doc`, `.docx`, `.rtf`, `.html`, and `.odt`.
- [Fact (https://help.workable.com/hc/en-us/articles/115012238108-What-types-of-files-can-be-uploaded-on-the-application-form)] General and custom field uploads allow up to 20 MB per file.

### Resume Parsing & Application Autofill
- [Fact (https://help.workable.com/hc/en-us/articles/115012661408-Uploading-candidate-resumes-CVs-Individual-and-bulk-options)] Workable parses resumes to extract candidate name, email, phone number, social media links, work experience, and education directly into the Candidate Profile.
- [Fact (https://help.workable.com/hc/en-us/articles/115012661408-Uploading-candidate-resumes-CVs-Individual-and-bulk-options)] Duplicate detection checks email addresses against existing records.
- [Inference] Parsing accuracy degrades when resumes use complex visual sidebars, icon-only labels, or unformatted contact blocks.

### Recruiter Visibility
- [Fact (https://help.workable.com/hc/en-us/articles/115012857047-Candidate-profile-in-pipeline-view-overview)] In the pipeline view, the candidate profile displays parsed experience, education, skills, and application answers alongside an integrated preview of the uploaded resume document.
- [Inference] Recruiters review candidate qualifications directly from the profile overview and can open the original file for full visual context.

### Recruiter Search & Filtering Mechanics
- [Fact (https://help.workable.com/hc/en-us/articles/115012857047-Candidate-profile-in-pipeline-view-overview)] Recruiters filter and search candidates using keyword search, candidate tags, pipeline stages, and custom screening questions with auto-disqualification settings.
- [Inference] Answering incorrectly on auto-disqualify questions immediately shifts the applicant to the Disqualified bucket.

### Candidate Account & Login Requirements
- [Fact (https://help.workable.com/hc/en-us/articles/115012238108-What-types-of-files-can-be-uploaded-on-the-application-form)] Candidates applying through Workable-hosted job pages are not required to create an account or log in.

### Specific Optimization Tips
1. [Inference] Keep your resume document strictly under 5 MB to avoid upload errors on the Workable application form.
2. [Inference] Include your LinkedIn profile URL and clear contact information in standard text in the body of the document so Workable parses them into your profile header.
3. [Inference] Review custom screening questions carefully, as Workable allows recruiters to set automatic disqualification rules on question answers.

---

## 12. JazzHR

### Accepted Resume File Types & Size Limits
- [Fact (https://help.jazzhr.com/s/article/Managing-Files-and-Documents-In-JazzHR)] The resume upload limit is up to 5 MB per file.
- [Fact (https://help.jazzhr.com/s/article/Managing-Files-and-Documents-In-JazzHR)] Supported resume file formats are `.pdf`, `.doc`, `.docx`, `.rtf`, `.txt`, and `.odt`.
- [Fact (https://help.jazzhr.com/s/article/Managing-Files-and-Documents-In-JazzHR)] General non-resume attachments in candidate profiles accept up to 8.5 MB.

### Resume Parsing & Application Autofill
- [Fact (https://help.jazzhr.com/s/article/Data-Import-Process-Overview)] JazzHR parses uploaded resume text to extract candidate name, contact info, and work history into the Candidate Profile.
- [Fact (https://help.jazzhr.com/s/article/Managing-Files-and-Documents-In-JazzHR)] JazzHR does NOT perform OCR on scanned or image-only documents; resumes without embedded digital text fail to parse into candidate profile fields.

### Recruiter Visibility
- [Fact (https://help.jazzhr.com/s/article/Managing-Files-and-Documents-In-JazzHR)] Recruiters view candidate profiles with parsed history and can open, preview, or download the original uploaded document.
- [Inference] Recruiters frequently read resumes inside JazzHR's document preview pane during applicant review stages.

### Recruiter Search & Filtering Mechanics
- [Fact (https://help.jazzhr.com/s/article/Data-Import-Process-Overview)] Recruiters search candidate pools using keyword queries and filter by workflow stages, tags, and job openings.
- [Inference] Questionnaire responses can be scored and configured with knockout criteria that automatically reject unqualified applicants.

### Candidate Account & Login Requirements
- [Fact (https://help.jazzhr.com/s/article/Managing-Files-and-Documents-In-JazzHR)] Candidates applying on JazzHR-hosted job boards or embedded widgets do not need to create an account or log in.

### Specific Optimization Tips
1. [Inference] Never upload a scanned image PDF to JazzHR, because JazzHR does not perform OCR and will fail to extract your experience into searchable profile fields.
2. [Inference] Submit a clean PDF or DOCX file under 5 MB with standard section headers.
3. [Inference] Incorporate target job keywords naturally into your job descriptions to match recruiter keyword searches in the JazzHR candidate database.

---

## 13. Breezy HR

### Accepted Resume File Types & Size Limits
- [Fact (https://help.breezy.hr/en/articles/5596777-supported-file-types)] Breezy HR accepts resume uploads up to 50 MB per file.
- [Fact (https://help.breezy.hr/en/articles/5596777-supported-file-types)] Supported resume formats include `.pdf`, `.doc`, `.docx`, `.pages`, `.rtf`, and `.txt`.

### Resume Parsing & Application Autofill
- [Fact (https://help.breezy.hr/en/articles/5596777-supported-file-types)] Breezy HR parses contact information, employment history, and education from uploaded resumes into the candidate profile.
- [Inference] Complex multi-column graphic layouts can lead to misattributed company names or out-of-order dates during parsing.

### Recruiter Visibility
- [Fact (https://help.breezy.hr/en/articles/5596777-supported-file-types)] Recruiters view the candidate profile with parsed summary data alongside an integrated document viewer displaying the original resume.
- [Inference] Hiring managers in Breezy HR evaluate candidate cards visually on Kanban pipeline boards and inspect original resumes in the document previewer.

### Recruiter Search & Filtering Mechanics
- [Fact (https://help.breezy.hr/en/articles/5596777-supported-file-types)] Recruiters filter and search candidate pools using keyword search, candidate tags, stage movement, and automated questionnaire scoring.
- [Inference] Automated disqualification stages can be triggered by negative responses to mandatory screening questions.

### Candidate Account & Login Requirements
- [Fact (https://help.breezy.hr/en/articles/5596777-supported-file-types)] Candidates applying via Breezy career portals do not need to create an account or log in; applications use a single-page submission form.

### Specific Optimization Tips
1. [Inference] While Breezy uniquely supports Apple Pages (`.pages`) files, exporting to a clean, text-selectable PDF remains best practice for consistent visual rendering.
2. [Inference] Ensure contact details (email, phone, location) are formatted cleanly at the top of the body text for automatic profile population.
3. [Inference] Answer all questionnaire questions carefully, as employers configure automated pipeline triggers based on questionnaire answers.

---

## 14. Recruitee

### Accepted Resume File Types & Size Limits
- [Fact (https://support.recruitee.com/en/articles/1066338-csv-importer)] Supported file formats for CV parsing in Recruitee include `.pdf`, `.docx`, `.doc`, `.odt`, and `.rtf`.
- [Fact (https://support.recruitee.com/en/articles/1066315-receive-candidates-from-external-recruiters-and-agencies)] Plain text (`.txt`) files, image-only files without selectable text, and password-protected documents are NOT supported for parsing.
- [Fact (https://support.recruitee.com/en/articles/1066315-receive-candidates-from-external-recruiters-and-agencies)] Maximum file attachment size across job mailbox interactions is 25 MB.

### Resume Parsing & Application Autofill
- [Fact (https://support.recruitee.com/en/articles/1066315-receive-candidates-from-external-recruiters-and-agencies)] Recruitee requires an email address located within the body of the CV itself; if absent, the message is routed to the non-candidates mailbox folder and requires manual conversion.
- [Fact (https://support.recruitee.com/en/articles/1066338-csv-importer)] The parsing engine extracts name, email, phone number, work history, education, social links, and custom candidate profile fields (e.g., certifications, languages).
- [Fact (https://support.recruitee.com/en/articles/1066315-receive-candidates-from-external-recruiters-and-agencies)] Text must be highlightable and selectable, using standard web-safe fonts.

### Recruiter Visibility
- [Fact (https://support.recruitee.com/en/articles/1066315-receive-candidates-from-external-recruiters-and-agencies)] Recruiters view the parsed Candidate Profile alongside an inline document viewer showing the original CV.
- [Inference] Recruiters can toggle between candidate timeline data and the original uploaded document.

### Recruiter Search & Filtering Mechanics
- [Fact (https://support.recruitee.com/en/articles/1066315-receive-candidates-from-external-recruiters-and-agencies)] Recruiters search candidate pools using keyword queries, candidate tags, pipeline stages, and screening questions with auto-disqualification rules.
- [Inference] Failing a mandatory screening question moves the candidate directly to the disqualified pool.

### Candidate Account & Login Requirements
- [Fact (https://support.recruitee.com/en/articles/1066315-receive-candidates-from-external-recruiters-and-agencies)] Candidates applying on Recruitee career sites do not need to create an account or log in.

### Specific Optimization Tips
1. [Inference] You MUST include your email address in the readable body text of your resume; omitting it causes Recruitee to misclassify your file as a non-candidate.
2. [Inference] Do not submit `.txt` or image-based files, as Recruitee explicitly does not parse them.
3. [Inference] Clearly list standard skills, languages, and certifications in separate bullet points to facilitate mapping into Recruitee's custom profile fields.

---

## 15. Teamtailor

### Accepted Resume File Types & Size Limits
- [Fact (https://support.teamtailor.com/en/articles/118259-add-candidates-to-your-account)] Supported resume formats in Teamtailor include PDF, DOC, and DOCX.
- [Fact (https://support.teamtailor.com/en/articles/118259-add-candidates-to-your-account)] Standard application document uploads accept files up to 10 MB to 20 MB.
- [Fact (https://support.teamtailor.com/en/articles/118259-add-candidates-to-your-account)] Uploaded files are scanned by an integrated AntiVirus scanner upon submission.

### Resume Parsing & Application Autofill
- [Fact (https://support.teamtailor.com/en/articles/16127956-co-pilot-resume-parser)] Teamtailor Co-pilot automatically parses candidate resumes, extracting personal information (name, email, phone, location, LinkedIn link), work history, education history, and profile photo.
- [Fact (https://support.teamtailor.com/en/articles/16127956-co-pilot-resume-parser)] Skills and competencies identified in the resume that match skills configured in the company account are mapped directly to the candidate's profile.
- [Fact (https://support.teamtailor.com/en/articles/16127956-co-pilot-resume-parser)] Co-pilot actively detects "hidden instructions" in uploaded resumes (e.g. prompt injection, white text, micro-fonts, transparent styling meant to manipulate AI evaluations).

### Recruiter Visibility
- [Fact (https://support.teamtailor.com/en/articles/16127956-co-pilot-resume-parser)] Recruiters view an interactive career and education timeline, an AI resume summary, auto-tagged skills, and an embedded preview of the original document.
- [Fact (https://support.teamtailor.com/en/articles/16127956-co-pilot-resume-parser)] When anonymous hiring mode is active, personal identifying information is automatically redacted from the candidate card and resume preview.

### Recruiter Search & Filtering Mechanics
- [Fact (https://support.teamtailor.com/en/articles/16127956-co-pilot-resume-parser)] Recruiters filter candidates by matched skills/traits, smart filters, keyword queries, and automated triggers tied to screening questions.
- [Inference] Trigger actions can automatically move candidates to reject stages or advance them based on screening question responses.

### Candidate Account & Login Requirements
- [Fact (https://support.teamtailor.com/en/articles/118259-add-candidates-to-your-account)] Candidates do not need to create an account or password to apply on Teamtailor career sites.
- [Inference] Candidates can optionally request a magic-link authentication email to view their stored data under GDPR settings.

### Specific Optimization Tips
1. [Inference] NEVER use white-text keywords or hidden AI prompt injections; Teamtailor Co-pilot explicitly scans for and flags hidden instructions directly to recruiters.
2. [Inference] Explicitly list standard industry skill keywords in a dedicated skills section to trigger Teamtailor's automated skill tagging.
3. [Inference] Include your full LinkedIn profile URL in plain text, as Teamtailor's parser automatically extracts and embeds it on your candidate card.

---

## 16. Personio

### Accepted Resume File Types & Size Limits
- [Fact (https://guul.io/ats-guide/personio)] Personio accepts `.pdf` and `.docx` as the standard supported formats for CV parsing into candidate profiles.
- [Fact (https://resumeats.net/blog/personio-ats-resume-guide-europe-2026)] The maximum file size limit for CV parsing is 10 MB per document (with API endpoints supporting up to 20 MB).
- [Inference] Uploading non-text formats or files larger than 10 MB causes parsing errors or defaults to unparsed attachments.

### Resume Parsing & Application Autofill
- [Fact (https://guul.io/ats-guide/personio)] Personio integrates with Textkernel as its underlying CV parsing engine, extracting name, email, phone number, location, current employer, current job title, total years of experience, and public profile links.
- [Fact (https://resumeats.net/blog/personio-ats-resume-guide-europe-2026)] Parsing errors frequently occur if: the document is an image or scanned PDF without a text layer; contact information is located within headers/footers; complex tables or multi-column layouts are used; font size is ≤ 8 pt; or skills are displayed as graphics/bar charts rather than text.

### Recruiter Visibility
- [Fact (https://guul.io/ats-guide/personio)] Recruiters see parsed candidate attributes across recruiting pipeline tables and can view the original attached CV inside Personio's embedded document viewer.
- [Inference] Recruiters evaluate parsed years of experience and current title before opening the original document.

### Recruiter Search & Filtering Mechanics
- [Fact (https://resumeats.net/blog/personio-ats-resume-guide-europe-2026)] Recruiters filter candidate pools by parsed attributes (experience, job title, location), tags, application phases, and evaluation scorecards.
- [Inference] Mandatory screening questions on Personio application forms can filter out unqualified candidates during intake.

### Candidate Account & Login Requirements
- [Fact (https://guul.io/ats-guide/personio)] Candidates applying on Personio-hosted career pages are not required to create an account or log in.

### Specific Optimization Tips
1. [Inference] Avoid font sizes of 8 pt or smaller, which Personio's Textkernel parser is documented to misread or skip.
2. [Inference] Do not use graphical rating bars, percentage meters, or dots for skills; write skills out as standard text bullet points so the parser extracts them.
3. [Inference] Keep contact information in the main document body rather than in headers/footers to ensure accurate profile population.

---

## 17. Rippling

### Accepted Resume File Types & Size Limits
- [Fact (https://www.rippling.com/blog/april-2025-product-updates)] Rippling Recruiting supports standard resume file formats including `.pdf`, `.docx`, and `.doc`.
- [Inference] Candidate document uploads are capped at 10 MB per file across standard job application forms.

### Resume Parsing & Application Autofill
- [Fact (https://www.rippling.com/blog/april-2025-product-updates)] Rippling features automatic resume parsing that extracts candidate contact details, work history, and education into candidate profiles and application records.
- [Fact (https://www.rippling.com/blog/april-2025-product-updates)] Rippling's resume parser supports both English and non-English resumes.
- [Inference] Highly complex multi-column sidebars and image-only scans fail text extraction and require manual recruiter data entry.

### Recruiter Visibility
- [Fact (https://www.rippling.com/blog/april-2025-product-updates)] Recruiters view the parsed candidate record, interview evaluation scorecards, and an attached preview of the original resume document.
- [Inference] Recruiters review structured candidate details in Rippling's modern single-pane employee graph interface.

### Recruiter Search & Filtering Mechanics
- [Fact (https://www.rippling.com/blog/april-2025-product-updates)] Recruiters search candidate pools using keyword queries, custom stage filters, and structured application question responses.
- [Inference] Pre-screening questions configured on the requisition can automatically advance or disposition candidates.

### Candidate Account & Login Requirements
- [Fact (https://www.rippling.com/blog/april-2025-product-updates)] Candidates applying via Rippling job boards do not need to create an account or log in; applications use a single-page submission form.

### Specific Optimization Tips
1. [Inference] Use a clean, single-column layout so Rippling's parser correctly extracts company names, titles, and dates into the candidate graph.
2. [Inference] Ensure date ranges are formatted clearly (e.g., "MM/YYYY - MM/YYYY" or "Month YYYY - Present") to assist accurate experience calculation.
3. [Inference] Keep your resume file under 10 MB and formatted as a text-based PDF or DOCX.

---

## 18. Paylocity

### Accepted Resume File Types & Size Limits
- [Fact (https://www.paylocity.com/resources/glossary/resume-parsing/)] Paylocity Recruiting supports `.pdf`, `.doc`, and `.docx` file formats for candidate resume submissions.
- [Fact (https://dc1prodrecruiting.paylocity.com/Recruiting/PublicLeads/New/3fdf778b-0a6d-41da-b1d8-c47d5500eb71)] Application forms cap individual document uploads at 10 MB per file.

### Resume Parsing & Application Autofill
- [Fact (https://www.paylocity.com/resources/glossary/resume-parsing/)] Paylocity utilizes Natural Language Processing (NLP) resume parsing to extract contact details, work history, education, and skills to auto-fill application fields.
- [Fact (https://www.paylocity.com/resources/glossary/resume-parsing/)] The NLP parser recognizes standard and non-standard job titles and varying layouts rather than relying solely on exact keyword matches.
- [Inference] Scanned bitmap files or heavily partitioned table designs can still cause misaligned chronological records.

### Recruiter Visibility
- [Fact (https://www.paylocity.com/resources/glossary/resume-parsing/)] Recruiters view structured candidate profile records and have direct access to the original uploaded resume attachment.
- [Inference] Recruiters inspect the parsed profile fields in applicant lists before opening the original document.

### Recruiter Search & Filtering Mechanics
- [Fact (https://www.paylocity.com/resources/glossary/resume-parsing/)] Parsed candidate information is indexed within the recruiter dashboard, allowing hiring teams to filter candidates by skills, experience level, education, and questionnaire responses.
- [Inference] Knockout questions configured on job postings can automatically disqualify non-qualifying candidates.

### Candidate Account & Login Requirements
- [Fact (https://dc1prodrecruiting.paylocity.com/Recruiting/PublicLeads/New/3fdf778b-0a6d-41da-b1d8-c47d5500eb71)] Paylocity candidate portals standardly prompt applicants to create an account or provide email authentication to complete and track applications.

### Specific Optimization Tips
1. [Inference] Always review and verify auto-filled fields in the Paylocity portal before final submission, as recruiter search filters query those database fields.
2. [Inference] Answer all prescreening questionnaire items carefully to prevent automated knockout filters.
3. [Inference] Incorporate standard industry skills and certifications in text format so Paylocity's NLP parser indexes them for recruiter search queries.

---

## 19. ADP (Workforce Now / Recruiting Management)

### Accepted Resume File Types & Size Limits
- [Fact (https://developers.adp.com/articles/guides/job-applications-v2-api-guide)] Supported resume formats across ADP Workforce Now include `.pdf`, `.doc`, `.docx`, `.rtf`, and `.txt`.
- [Fact (https://developers.adp.com/articles/guides/job-applications-v2-api-guide)] Standard document attachment size limits in ADP Career Center portals typically cap uploads at 5 MB (configurable up to 10–12 MB).

### Resume Parsing & Application Autofill
- [Fact (https://developers.adp.com/articles/guides/job-applications-v2-api-guide)] ADP's native parser extracts contact details, work experience, education, skills, and licenses/certifications to auto-fill the Candidate Profile schema.
- [Inference] Tables, nested columns, and contact info placed inside header/footer bands are frequently dropped or scrambled by the parser.

### Recruiter Visibility
- [Fact (https://developers.adp.com/articles/guides/job-applications-v2-api-guide)] Recruiters have access to both the structured candidate profile fields and the original attached resume document.
- [Inference] Recruiters frequently review candidate relevancy indicators and parsed summary cards before opening original documents.

### Recruiter Search & Filtering Mechanics
- [Fact (https://developers.adp.com/articles/guides/job-applications-v2-api-guide)] ADP Workforce Now features screening question configuration and candidate relevancy scoring that compares applicant resumes against job requirements.
- [Fact (https://developers.adp.com/articles/guides/job-applications-v2-api-guide)] Recruiters filter candidates by screening question responses, background screening statuses, and keyword queries.

### Candidate Account & Login Requirements
- [Fact (https://developers.adp.com/articles/guides/job-applications-v2-api-guide)] External candidates applying via ADP Workforce Now Career Centers standardly must create an ADP account or sign in to submit and track applications.

### Specific Optimization Tips
1. [Inference] Mirror core competencies and job title terminology from the job posting to maximize ADP's Candidate Relevancy profile score.
2. [Inference] Review and correct all parsed fields during the application process, as recruiters query structured ADP database fields.
3. [Inference] Avoid placing contact details in document headers/footers; keep your name, phone, and email in the top body text.

---

## 20. UKG / UltiPro (UKG Pro Recruiting)

### Accepted Resume File Types & Size Limits
- [Fact (https://www.ukg.com/learn/resources/product-info/ukg-pro-solution-guide)] UKG Recruiting environments support `.pdf`, `.doc`, `.docx`, `.rtf`, and `.txt` file formats.
- [Fact (https://www.ukg.com/learn/resources/product-info/ukg-pro-solution-guide)] Document uploads are generally capped at 5 MB to 10 MB per file.
- [Inference] Resumes saved as image scans or password-protected files fail text parsing.

### Resume Parsing & Application Autofill
- [Fact (https://www.ukg.com/learn/resources/product-info/ukg-pro-solution-guide)] UKG Pro Recruiting parses uploaded resumes to extract name, contact details, work history, job titles, employer names, dates, education, and skills into candidate profile fields.
- [Inference] Multi-column templates, sidebars, and tables frequently cause out-of-order text extraction during parsing.

### Recruiter Visibility
- [Fact (https://www.ukg.com/learn/resources/product-info/ukg-pro-solution-guide)] Recruiters view candidate profiles populated with parsed data and can access the original attached resume file.
- [Inference] Candidate search results and match scores drive which original resumes recruiters open.

### Recruiter Search & Filtering Mechanics
- [Fact (https://www.ukg.com/learn/resources/product-info/ukg-pro-solution-guide)] Recruiters filter candidate pools using keyword searches, qualification scoring, and prescreening questionnaires with knockout criteria.
- [Inference] Knockout questions automatically disposition unqualified candidates before hiring manager review.

### Candidate Account & Login Requirements
- [Fact (https://www.ukg.com/learn/resources/product-info/ukg-pro-solution-guide)] External applicants are standardly required to create an account with email and password on the UKG Pro Recruiting portal.

### Specific Optimization Tips
1. [Inference] Use a strict single-column format to ensure UKG's parser maps your chronological work history cleanly.
2. [Inference] Double-check all pre-filled fields in the UKG portal after upload to ensure no dates or job titles were misallocated.
3. [Inference] Answer all prescreening questions carefully to avoid automated knockout filters.

---

## 21. Pinpoint

### Accepted Resume File Types & Size Limits
- [Fact (http://help.pinpoint.support/en/articles/2639431-can-i-upload-a-cv-to-an-existing-application)] Pinpoint supports CV uploads in `.pdf` and `.docx` (as well as `.doc`, `.txt`, and `.rtf`).
- [Fact (http://help.pinpoint.support/en/articles/2639431-can-i-upload-a-cv-to-an-existing-application)] Upload file size limits support documents up to 30 MB for CVs (and 10 MB for general attachments).

### Resume Parsing & Application Autofill
- [Fact (https://www.pinpointhq.com/security-privacy/sub-processors)] Pinpoint partners with Affinda as its sub-processor for resume parsing and redaction.
- [Fact (https://www.pinpointhq.com/security-privacy/sub-processors)] The parsing engine extracts work history, contact details, and education, and automatically applies skill tagging (*Automatic Skill Tagging*) to the candidate record.
- [Fact (http://help.pinpoint.support/en/articles/5311202-how-can-i-add-multiple-candidates-in-bulk)] Bulk resume uploads allow recruiters to drag and drop multiple resumes simultaneously, with Pinpoint parsing each file to create candidate records without manual entry.

### Recruiter Visibility
- [Fact (http://help.pinpoint.support/en/articles/2639431-can-i-upload-a-cv-to-an-existing-application)] Recruiters view a unified candidate profile showing the original document, parsed qualifications, auto-tagged skills, and application question responses.
- [Fact (https://www.pinpointhq.com/security-privacy/sub-processors)] When blind hiring is enabled, Affinda's redaction engine automatically redacts personally identifiable information (PII) from the recruiter view.

### Recruiter Search & Filtering Mechanics
- [Fact (https://www.pinpointhq.com/security-privacy/sub-processors)] Recruiters filter and search candidate pools using boolean queries across parsed text, auto-tagged skills, candidate scorecards, and custom question answers.
- [Inference] Rejection rules can automatically flag candidates who do not meet required criteria.

### Candidate Account & Login Requirements
- [Fact (http://help.pinpoint.support/en/articles/2639431-can-i-upload-a-cv-to-an-existing-application)] Candidates applying via Pinpoint career portals are not required to create an account or log in; applications use a single-page submission form.

### Specific Optimization Tips
1. [Inference] Explicitly mention key technical and domain skills to trigger Affinda's Automatic Skill Tagging in Pinpoint.
2. [Inference] Ensure clean typographic hierarchy so automated PII redaction does not inadvertently obscure your core qualifications during blind screening.
3. [Inference] Submit a text-based PDF or DOCX file under 30 MB.

---

## 22. Dover

### Accepted Resume File Types & Size Limits
- [Fact (https://help.dover.com/en/articles/10498369-migrating-data-to-dover)] Dover supports PDF as the primary document format, with an upload limit of 10 MB per file.
- [Fact (https://help.dover.com/en/articles/10498369-migrating-data-to-dover)] Bulk candidate migrations support up to 100 resumes per batch.

### Resume Parsing & Application Autofill
- [Fact (https://help.dover.com/en/articles/10498369-migrating-data-to-dover)] Dover automatically parses uploaded resumes to extract and autofill First Name, Last Name, Email, and LinkedIn profile link.
- [Fact (https://www.dover.com/blog/what-is-an-applicant-tracking-system)] The parsed text feeds Dover's AI sourcing and candidate evaluation algorithms.
- [Inference] Scanned image PDFs or documents lacking digital text fail parsing and cannot be scored by Dover's AI matching engine.

### Recruiter Visibility
- [Fact (https://help.dover.com/en/articles/10498369-migrating-data-to-dover)] Recruiters view the parsed candidate profile, AI assessment highlights, and an integrated preview of the original PDF resume.
- [Inference] Recruiters rely heavily on Dover's AI evaluation summaries and match ratings when triaging applicant pools.

### Recruiter Search & Filtering Mechanics
- [Fact (https://www.dover.com/blog/what-is-an-applicant-tracking-system)] Dover uses AI-driven candidate scoring and matching to evaluate applicants against job requisition criteria, along with keyword filters and stage tracking.
- [Inference] Candidates with higher AI match scores are elevated to hiring managers for expedited review.

### Candidate Account & Login Requirements
- [Fact (https://help.dover.com/en/articles/10498369-migrating-data-to-dover)] Candidates applying via Dover-hosted job application links do not need to create an account or log in.

### Specific Optimization Tips
1. [Inference] Submit your resume as a text-based PDF under 10 MB.
2. [Inference] Prominently display your full LinkedIn profile URL, as Dover's parser specifically extracts and indexes LinkedIn links for enrichment.
3. [Inference] Clearly align your experience bullet points with the job description's core requirements to maximize Dover's automated AI evaluation score.

---

## 23. Wellfound (formerly AngelList Talent)

### Accepted Resume File Types & Size Limits
- [Fact (https://help.wellfound.com/article/770-how-do-i-upload-my-resume)] Wellfound accepts only **PDF** (`.pdf`) and **Plain Text** (`.txt`) file formats for resume uploads.
- [Fact (https://help.wellfound.com/article/780-cant-upload-a-resume)] The resume file size limit is strictly 10 MB.
- [Fact (https://help.wellfound.com/article/780-cant-upload-a-resume)] Fonts must be embedded when exporting to PDF, and design tools (e.g. Adobe Illustrator) should use the "Smallest File Size" preset.

### Resume Parsing & Application Autofill
- [Fact (https://help.wellfound.com/article/780-cant-upload-a-resume)] High-resolution images increase file size and cause parsing difficulties.
- [Fact (https://help.wellfound.com/article/770-how-do-i-upload-my-resume)] Wellfound candidate search relies primarily on information transcribed directly into candidate profile fields (skills, work history, education, roles) rather than raw resume attachment text.
- [Inference] Information existing solely within the uploaded resume file is not indexed by recruiter search filters on Wellfound.

### Recruiter Visibility
- [Fact (https://help.wellfound.com/article/770-how-do-i-upload-my-resume)] Recruiters view the candidate's complete Wellfound profile card, application pitch note, and downloadable/viewable attached resume document.
- [Inference] Recruiters read the candidate's pitch note and online profile overview before deciding to download the resume attachment.

### Recruiter Search & Filtering Mechanics
- [Fact (https://help.wellfound.com/article/770-how-do-i-upload-my-resume)] Recruiters search and filter candidates primarily by structured profile attributes: primary role, technical skills, years of experience, location/remote preference, and salary requirements.
- [Inference] Candidates whose online profiles lack explicit skill tags do not appear in recruiter search results, regardless of what is written on their attached resume.

### Candidate Account & Login Requirements
- [Fact (https://help.wellfound.com/article/770-how-do-i-upload-my-resume)] A Wellfound candidate account is strictly required to apply for jobs or upload a resume.

### Specific Optimization Tips
1. [Inference] Completely fill out all structured fields on your Wellfound online profile (skills, roles, experience, compensation), because recruiter search filters query the profile fields, NOT the resume text.
2. [Inference] Upload only text-based PDF or TXT formats under 10 MB; Word documents (`.docx`/`.doc`) are NOT accepted by Wellfound.
3. [Inference] Craft a tailored, concise pitch note with every application, as Wellfound surfaces this directly alongside your profile to startup founders and hiring managers.

---

## 24. LinkedIn Easy Apply

### Accepted Resume File Types & Size Limits
- [Fact (https://www.linkedin.com/help/linkedin/answer/a510363/uploading-your-resume-when-applying-for-jobs-on-linkedin)] LinkedIn Easy Apply supports Microsoft Word (`.doc`, `.docx`) and PDF (`.pdf`) formats.
- [Fact (https://www.linkedin.com/help/linkedin/answer/a510363/uploading-your-resume-when-applying-for-jobs-on-linkedin)] Resume file size must be less than 5 MB (2 MB recommended for mobile applications).
- [Fact (https://www.linkedin.com/help/linkedin/answer/a510363/uploading-your-resume-when-applying-for-jobs-on-linkedin)] LinkedIn stores your 4 most recently uploaded resumes under Job Application Settings for easy reuse.

### Resume Parsing & Application Autofill
- [Fact (https://www.linkedin.com/help/linkedin/answer/a510363/uploading-your-resume-when-applying-for-jobs-on-linkedin)] Easy Apply auto-fills contact information, recent experience, and education directly from the applicant's LinkedIn profile.
- [Fact (https://www.linkedin.com/help/linkedin/answer/a510363/uploading-your-resume-when-applying-for-jobs-on-linkedin)] Once an Easy Apply application is submitted, it cannot be edited or reopened to attach a different resume.
- [Inference] Applications submitted via Easy Apply sync candidate data and attached resumes directly into the employer's external ATS via LinkedIn Apply Connect.

### Recruiter Visibility
- [Fact (https://www.linkedin.com/help/linkedin/answer/a510363/uploading-your-resume-when-applying-for-jobs-on-linkedin)] In LinkedIn Recruiter, recruiters view the applicant's full LinkedIn profile alongside their attached resume file.
- [Inference] Recruiters often evaluate the candidate's live profile headline, recommendations, and shared connections before reviewing the attached resume document.

### Recruiter Search & Filtering Mechanics
- [Fact (https://www.linkedin.com/help/linkedin/answer/a510363/uploading-your-resume-when-applying-for-linkedin-jobs)] Recruiters configure screening questions on Easy Apply and can mark them as "deal-breakers" (must-have qualifications).
- [Inference] Applicants who do not satisfy deal-breaker screening questions are automatically filtered into the "Not a fit" / Archived tab in the recruiter's dashboard.
- [Inference] LinkedIn Recruiter ranks applicants based on skills match, headline relevance, and location parameters.

### Candidate Account & Login Requirements
- [Fact (https://www.linkedin.com/help/linkedin/answer/a510363/uploading-your-resume-when-applying-for-jobs-on-linkedin)] A LinkedIn member account is strictly required to use Easy Apply.

### Specific Optimization Tips
1. [Inference] Align your public LinkedIn profile with your resume, as recruiters in LinkedIn Recruiter see both side-by-side.
2. [Inference] Answer all screening questions accurately and affirmatively where possible; deal-breaker questions will automatically route your application to "Not a fit".
3. [Inference] Verify which of your 4 stored resumes is selected before clicking Submit, because submitted Easy Apply applications cannot be retracted or updated.

---

## 25. Indeed Apply

### Accepted Resume File Types & Size Limits
- [Fact (https://www.indeed.com/help/job-seekers/articles/4408783727629-uploading-a-resume-file-to-your-profile?hl=en&co=AU)] Indeed supports `.pdf`, `.doc`, `.docx`, `.rtf`, and `.txt` file formats.
- [Fact (https://www.indeed.com/help/job-seekers/articles/4408783727629-uploading-a-resume-file-to-your-profile?hl=en&co=AU)] File size must be under 5 MB for standard profile uploads (and under 15 MB for full API payloads).
- [Fact (https://www.indeed.com/help/job-seekers/articles/4408783727629-uploading-a-resume-file-to-your-profile?hl=en&co=AU)] Uploaded resume files are automatically converted to PDF for employer viewing.

### Resume Parsing & Application Autofill
- [Fact (https://www.indeed.com/help/job-seekers/articles/4408783727629-uploading-a-resume-file-to-your-profile?hl=en&co=AU)] Uploading a resume parses work experience and education to generate or update the candidate's Indeed Resume profile.
- [Fact (https://ca.indeed.com/help/employers/articles/troubleshooting-issues-with-indeed-questions-platform-iqp?hl=en&co=CA)] Applications submitted via Indeed Apply pass parsed candidate payloads and resume attachments directly into integrated employer ATS platforms.
- [Inference] Submitted Indeed Apply applications cannot be edited; errors must be communicated directly to the employer.

### Recruiter Visibility
- [Fact (https://www.indeed.com/help/job-seekers/articles/4408783727629-uploading-a-resume-file-to-your-profile?hl=en&co=AU)] Employers view candidate information via the Indeed Employer Dashboard or within their integrated ATS, displaying both the Indeed Resume profile and the original uploaded document.
- [Inference] Recruiters scan screener question results and candidate summary cards in their pipeline before opening the full document.

### Recruiter Search & Filtering Mechanics
- [Fact (https://ca.indeed.com/help/employers/articles/troubleshooting-issues-with-indeed-questions-platform-iqp?hl=en&co=CA)] Employers configure screener questions with "deal-breaker" (required) status.
- [Fact (https://www.indeed.com/help/employers/articles/policy-indeed-apply)] If screener questions are present in an external application flow, all screener questions must be replicated in the Indeed Apply setup.
- [Inference] Candidates who answer negatively to a deal-breaker question are automatically filtered out into the employer's rejected candidate pool.
- [Inference] Employers search candidate databases (Indeed Smart Sourcing) using keywords, job titles, and location radius filters.

### Candidate Account & Login Requirements
- [Fact (https://www.indeed.com/help/job-seekers/articles/4408783727629-uploading-a-resume-file-to-your-profile?hl=en&co=AU)] Job seekers must have an active Indeed account to submit applications via Indeed Apply.

### Specific Optimization Tips
1. [Inference] Check both your uploaded resume document and your generated Indeed Resume profile, as employers may review either format.
2. [Inference] Answer deal-breaker screener questions with extreme care; failing any required question triggers automated rejection.
3. [Inference] Keep your file formatted as a text-selectable PDF or DOCX under 5 MB.
