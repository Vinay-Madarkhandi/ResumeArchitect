import { describe, expect, it } from "vitest";
import { buildSourceIndex, checkGrounding } from "./index";
import { verifyChange } from "./tailoring";

export interface PersonaDomain {
  domain: string;
  resumeLines: string[];
  pairs: Array<{
    kind: "legit" | "invented";
    label: string;
    before: string;
    after: string;
  }>;
}


export type LegacyPair = [kind: "legit" | "invented", label: string, before: string, after: string];

export const reviewerPairs: LegacyPair[] = [
  ["legit", "synonym Golang→Go", "Built Golang services for payments", "Built Go services for payments"],
  ["legit", "synonym Postgres→PostgreSQL", "Migrated reporting data to Postgres", "Migrated reporting data to PostgreSQL"],
  ["legit", "synonym k8s→Kubernetes", "Deployed internal apps on k8s", "Deployed internal apps on Kubernetes"],
  ["legit", "synonym JS→JavaScript", "Wrote front-end code in JS and Node.js", "Wrote front-end code in JavaScript and Node.js"],
  ["legit", "tense build→built", "Build REST APIs in Python", "Built REST APIs in Python"],
  ["legit", "tense maintain→maintained", "Maintain CI pipelines in GitHub Actions", "Maintained CI pipelines in GitHub Actions"],
  ["legit", "reorder clauses", "Reduced invoice latency by 38% using Redis caching", "Using Redis caching, reduced invoice latency by 38%"],
  ["legit", "reorder prepositional", "Led onboarding for 12 new hires at Acme Corp", "Led onboarding at Acme Corp for 12 new hires"],
  ["legit", "spelled-out five→5", "Managed a team of five engineers", "Managed a team of 5 engineers"],
  ["legit", "thirty percent→30%", "Cut cloud costs by thirty percent", "Cut cloud costs by 30%"],
  ["legit", "2,000→2000", "Processed 2,000 orders per day", "Processed 2000 orders per day"],
  ["legit", "$4M→$4 million", "Owned a $4M budget", "Owned a $4 million budget"],
  ["legit", "verb synonym improved→raised", "Improved test coverage from 40% to 85%", "Raised test coverage from 40% to 85%"],
  ["legit", "responsible for→active verb", "Responsible for maintaining the billing service", "Maintained the billing service"],
  ["legit", "compress collaboration", "Collaborated with designers and product managers to ship features", "Shipped features with designers and product managers"],
  ["legit", "adjective→noun phrase", "Developed dashboards in React and TypeScript", "Developed React and TypeScript dashboards"],
  ["legit", "drop article only", "Wrote the unit tests for the billing service", "Wrote unit tests for billing service"],
  ["invented", "added tool Kafka", "Built Go services for payments", "Built Go and Kafka services for payments"],
  ["invented", "added tool not in list (Rust)", "Wrote automation scripts in Bash", "Wrote automation scripts in Rust"],
  ["invented", "employer swap", "Software Engineer at Acme Corp", "Software Engineer at Google"],
  ["invented", "title inflation", "Software Engineer at Acme", "Senior Software Engineer at Acme"],
  ["invented", "duration change", "3 years of experience in Python", "5 years of experience in Python"],
  ["invented", "date change", "Junior Developer, 2021–2022", "Junior Developer, 2019–2022"],
  ["invented", "degree invented", "B.S. in Biology", "M.S. in Computer Science"],
  ["invented", "certification invented", "Studied for the AWS exam", "AWS Certified Solutions Architect"],
  ["invented", "team size", "Managed a team of 4", "Managed a team of 12"],
  ["invented", "metric to different outcome", "Sorted 38% of the incoming product samples", "Cut invoice latency by 38%"],
  ["invented", "new user count", "Built internal dashboards", "Built internal dashboards used by 10,000 users"],
  ["invented", "ownership inflation, no entities", "Helped with deployments", "Led all deployments"],
  ["invented", "invented revenue", "Assisted the sales team", "Closed $2M in enterprise deals"],
  ["invented", "scale inflation", "Worked on a payments app", "Architected a payments platform processing 1M transactions daily"],
  ["invented", "PhD invented", "Volunteer math tutor", "PhD in Mathematics"],
  ["invented", "causal link between separate claims", "Built Go services. Reduced costs by 20%.", "Built Go services that reduced costs by 20%"],
  ["invented", "spelled-out new metric", "Reduced costs", "Reduced costs by twenty percent"],
];

export const additionalPairs: LegacyPair[] = [
  ["legit", "synonym TS→TypeScript", "Frontend development with TS and React", "Frontend development with TypeScript and React"],
  ["legit", "split slash skills", "Proficient in Python/Django/PostgreSQL", "Proficient in Python, Django, and PostgreSQL"],
  ["legit", "split pipe skills", "Skills: Go | Docker | Kubernetes", "Skills: Go, Docker, and Kubernetes"],
  ["legit", "currency $3M→$3 million", "Managed $3M pipeline", "Managed $3 million pipeline"],
  ["legit", "range formatting", "Led team of 5-8 engineers", "Led team of 5 to 8 engineers"],
  ["legit", "synonym AWS S3", "Stored assets in AWS S3", "Stored assets in Amazon S3"],
  ["legit", "active verb assisted→helped", "Assisted senior engineers with code reviews", "Helped senior engineers with code reviews"],
  ["legit", "drop filler words", "Successfully managed and executed project delivery", "Managed project delivery"],
  ["legit", "reorder skills list", "Experience with Docker, Go, and Kafka", "Experience with Kafka, Go, and Docker"],
  ["legit", "tense lead→led", "Lead sprint planning meetings", "Led sprint planning meetings"],
  ["legit", "spelled-out twelve→12", "Mentored twelve junior developers", "Mentored 12 junior developers"],
  ["invented", "added tech Docker", "Deployed web app to production", "Deployed web app to Docker in production"],
  ["invented", "added database MongoDB", "Maintained backend services", "Maintained MongoDB backend services"],
  ["invented", "employer swap Apple", "Software Engineer at Startup Co", "Software Engineer at Apple"],
  ["invented", "seniority inflation Principal", "Software Engineer at Stripe", "Principal Software Engineer at Stripe"],
  ["invented", "seniority inflation Head of", "Managed sprint backlog", "Head of Engineering managing sprint backlog"],
  ["invented", "certification CKA", "Managed Kubernetes clusters", "Certified Kubernetes Administrator (CKA) managing clusters"],
  ["invented", "degree M.S.", "B.S. in Electrical Engineering", "M.S. in Electrical Engineering"],
  ["invented", "duration inflation 2 to 4 years", "2 years of Go development", "4 years of Go development"],
  ["invented", "date shift", "Backend Engineer, 2018–2020", "Backend Engineer, 2016–2020"],
  ["invented", "metric swap latency to throughput", "Reduced latency by 25%", "Increased throughput by 25%"],
  ["invented", "scope inflation contributed to owned", "Contributed to auth module", "Owned auth module"],
];

export const probePairs: Array<[kind: "legit" | "invented", label: string, before: string, after: string, expectedEntity?: string]> = [
  ["invented", "inflate worked->led", "Worked on services in Go backed by PostgreSQL", "Led payment services in Go backed by PostgreSQL", "Led"],
  ["invented", "inflate worked->led no domain", "Worked on services in Go backed by PostgreSQL", "Led services in Go backed by PostgreSQL", "Led"],
  ["invented", "new domain payments", "Worked on services in Go backed by PostgreSQL", "Worked on payment services in Go backed by PostgreSQL", "payment"],
  ["legit", "honest reword", "Worked on services in Go backed by PostgreSQL", "Built Go services backed by PostgreSQL"],
  ["invented", "invent kafka", "Worked on services in Go backed by PostgreSQL", "Built Go and Kafka services backed by PostgreSQL", "Kafka"],
  ["invented", "owned", "Contributed to the billing API", "Owned the billing API", "Owned"],
  ["invented", "sole", "Part of a team that shipped the mobile app", "Shipped the mobile app", "Shipped"],
];

const benchmarkDomains: PersonaDomain[] = [
  {
    domain: "Benchmark - Reviewer Pairs",
    resumeLines: [...new Set(reviewerPairs.map((p) => p[2]))],
    pairs: reviewerPairs.map(([kind, label, before, after]) => ({ kind, label, before, after })),
  },
  {
    domain: "Benchmark - Additional Pairs",
    resumeLines: [...new Set(additionalPairs.map((p) => p[2]))],
    pairs: additionalPairs.map(([kind, label, before, after]) => ({ kind, label, before, after })),
  },
  {
    domain: "Benchmark - Coordinator Probes",
    resumeLines: [...new Set(probePairs.map((p) => p[2]))],
    pairs: probePairs.map(([kind, label, before, after]) => ({ kind, label, before, after })),
  },
];

export const DOMAINS: PersonaDomain[] = [
  ...benchmarkDomains,
  {
    domain: "Software Engineering",
    resumeLines: [
      "Software Engineer at Acme Corp, 2021–Present",
      "Worked on services in Go backed by PostgreSQL and Redis",
      "Built internal telemetry pipelines in Python that processed 2,000 events per second",
      "Maintained CI/CD pipelines in GitHub Actions and deployed microservices on Kubernetes",
      "Collaborated with 4 engineers to build the core checkout service",
      "Reduced invoice latency by 38% through query caching",
      "Owned a $4M annual AWS infrastructure budget",
      "Migrated reporting data from MySQL to PostgreSQL without downtime",
      "Wrote unit and integration tests achieving 85% test coverage",
      "B.Sc. in Computer Science from State University",
    ],
    pairs: [
      { kind: "legit", label: "synonym Go", before: "Worked on services in Go backed by PostgreSQL and Redis", after: "Worked on services in Golang backed by PostgreSQL and Redis" },
      { kind: "legit", label: "synonym Postgres", before: "Migrated reporting data from MySQL to PostgreSQL without downtime", after: "Migrated reporting data from MySQL to Postgres without downtime" },
      { kind: "legit", label: "synonym Kubernetes", before: "Maintained CI/CD pipelines in GitHub Actions and deployed microservices on Kubernetes", after: "Maintained CI/CD pipelines in GitHub Actions and deployed microservices on k8s" },
      { kind: "legit", label: "2,000 to 2000", before: "Built internal telemetry pipelines in Python that processed 2,000 events per second", after: "Built internal telemetry pipelines in Python that processed 2000 events per second" },
      { kind: "legit", label: "$4M to $4 million", before: "Owned a $4M annual AWS infrastructure budget", after: "Owned a $4 million annual AWS infrastructure budget" },
      { kind: "legit", label: "38% to 38 percent", before: "Reduced invoice latency by 38% through query caching", after: "Cut invoice latency by 38 percent through query caching" },
      { kind: "legit", label: "reorder clauses", before: "Reduced invoice latency by 38% through query caching", after: "Through query caching, reduced invoice latency by 38%" },
      { kind: "legit", label: "active verb maintained", before: "Maintained CI/CD pipelines in GitHub Actions and deployed microservices on Kubernetes", after: "Deployed microservices on Kubernetes and maintained CI/CD pipelines in GitHub Actions" },
      { kind: "invented", label: "unknown tool Snowflake", before: "Migrated reporting data from MySQL to PostgreSQL without downtime", after: "Migrated reporting data from MySQL to Snowflake without downtime" },
      { kind: "invented", label: "swapped employer Google", before: "Software Engineer at Acme Corp, 2021–Present", after: "Software Engineer at Google, 2021–Present" },
      { kind: "invented", label: "degree inflation M.Sc.", before: "B.Sc. in Computer Science from State University", after: "M.Sc. in Computer Science from State University" },
      { kind: "invented", label: "scope inflation worked-on to led", before: "Worked on services in Go backed by PostgreSQL and Redis", after: "Led services in Go backed by PostgreSQL and Redis" },
      { kind: "invented", label: "scope inflation worked-on to architected", before: "Worked on services in Go backed by PostgreSQL and Redis", after: "Architected services in Go backed by PostgreSQL and Redis" },
      { kind: "invented", label: "removed team framing", before: "Collaborated with 4 engineers to build the core checkout service", after: "Built the core checkout service" },
      { kind: "invented", label: "causal join drove", before: "Built internal telemetry pipelines in Python that processed 2,000 events per second", after: "Built internal telemetry pipelines in Python which drove 2,000 events per second" },
      { kind: "invented", label: "unsupported domain global conglomerate", before: "Worked on services in Go backed by PostgreSQL and Redis", after: "Worked on services in Go for a global conglomerate" },
    ],
  },
  {
    domain: "Nursing & Healthcare",
    resumeLines: [
      "Staff Nurse at Metro Health Hospital, 2020–Present",
      "Provided acute inpatient bedside care for up to 6 patients per shift",
      "Documented patient assessments and medication administration in Epic EHR",
      "Administered IV medications and monitored vital signs in telemetry unit",
      "Mentored three new-graduate nurses on clinical procedures and hospital protocols",
      "Participated in unit quality committee meetings to review infection control protocols",
      "Coordinated discharge planning alongside social workers and case managers",
      "Maintained 98% patient safety compliance score across quarterly evaluations",
      "Conducted daily wound care and patient mobility assistance",
      "Registered Nurse (RN) with BSN degree from City College",
    ],
    pairs: [
      { kind: "legit", label: "word to digit 3 nurses", before: "Mentored three new-graduate nurses on clinical procedures and hospital protocols", after: "Mentored 3 new-graduate nurses on clinical procedures and hospital protocols" },
      { kind: "legit", label: "hyphen drop new graduate", before: "Mentored three new-graduate nurses on clinical procedures and hospital protocols", after: "Mentored 3 new graduate nurses on clinical procedures and hospital protocols" },
      { kind: "legit", label: "quarterly wording", before: "Maintained 98% patient safety compliance score across quarterly evaluations", after: "Maintained 98% patient safety compliance score each quarter" },
      { kind: "legit", label: "reorder bedside care", before: "Provided acute inpatient bedside care for up to 6 patients per shift", after: "Provided bedside care for up to 6 acute inpatient patients per shift" },
      { kind: "legit", label: "active voice wound care", before: "Conducted daily wound care and patient mobility assistance", after: "Assisted with patient mobility and performed daily wound care" },
      { kind: "legit", label: "synonym RN", before: "Registered Nurse (RN) with BSN degree from City College", after: "Registered Nurse with BSN degree from City College" },
      { kind: "legit", label: "ratio formatting", before: "Provided acute inpatient bedside care for up to 6 patients per shift", after: "Maintained patient care for up to 6 patients per shift" },
      { kind: "legit", label: "bedside nursing synonym", before: "Administered IV medications and monitored vital signs in telemetry unit", after: "Monitored vital signs and administered IV medications in telemetry unit" },
      { kind: "invented", label: "unknown tool Cerner", before: "Documented patient assessments and medication administration in Epic EHR", after: "Documented patient assessments and medication administration in Cerner EHR" },
      { kind: "invented", label: "certification CCRN", before: "Registered Nurse (RN) with BSN degree from City College", after: "CCRN certified Registered Nurse (RN) with BSN degree from City College" },
      { kind: "invented", label: "swapped employer Mayo Clinic", before: "Staff Nurse at Metro Health Hospital, 2020–Present", after: "Staff Nurse at Mayo Clinic, 2020–Present" },
      { kind: "invented", label: "scope participated to directed", before: "Participated in unit quality committee meetings to review infection control protocols", after: "Directed unit quality committee meetings to review infection control protocols" },
      { kind: "invented", label: "scope participated to led", before: "Participated in unit quality committee meetings to review infection control protocols", after: "Led unit quality committee meetings to review infection control protocols" },
      { kind: "invented", label: "patient count inflation 6 to 12", before: "Provided acute inpatient bedside care for up to 6 patients per shift", after: "Provided acute inpatient bedside care for up to 12 patients per shift" },
      { kind: "invented", label: "removed collaboration team", before: "Coordinated discharge planning alongside social workers and case managers", after: "Single-handedly coordinated discharge planning" },
      { kind: "invented", label: "causal join resulting in", before: "Administered IV medications and monitored vital signs in telemetry unit", after: "Administered IV medications resulting in improved vital signs" },
    ],
  },
  {
    domain: "Sales & Business Development",
    resumeLines: [
      "Account Executive at Apex Software, 2021–Present",
      "Managed 45 enterprise accounts across the Midwest territory",
      "Tracked sales pipeline, deal stages, and customer calls in Salesforce",
      "Generated $2.4M in new annual recurring revenue against a $2M target",
      "Collaborated with sales engineers to deliver 60 custom product demonstrations",
      "Closed 18 new contracts with average deal size of $130,000",
      "Conducted outbound prospecting via email and phone campaigns",
      "Exceeded sales quota for three consecutive quarters in 2023",
      "Partnered with customer success teams to secure 92% client renewal rate",
      "B.A. in Communications from State University",
    ],
    pairs: [
      { kind: "legit", label: "Salesforce CRM", before: "Tracked sales pipeline, deal stages, and customer calls in Salesforce", after: "Tracked sales pipeline, deal stages, and customer calls in Salesforce CRM" },
      { kind: "legit", label: "$2.4M to $2.4 million", before: "Generated $2.4M in new annual recurring revenue against a $2M target", after: "Generated $2.4 million in new annual recurring revenue against a $2 million target" },
      { kind: "legit", label: "quarter rephrase", before: "Exceeded sales quota for three consecutive quarters in 2023", after: "Exceeded sales quota for 3 consecutive quarters in 2023" },
      { kind: "legit", label: "number formatting $130k", before: "Closed 18 new contracts with average deal size of $130,000", after: "Closed 18 new contracts with average deal size of $130k" },
      { kind: "legit", label: "reorder demo clause", before: "Collaborated with sales engineers to deliver 60 custom product demonstrations", after: "Delivered 60 custom product demonstrations in collaboration with sales engineers" },
      { kind: "legit", label: "assisted/partnered synonym", before: "Partnered with customer success teams to secure 92% client renewal rate", after: "Collaborated with customer success teams to secure 92% client renewal rate" },
      { kind: "legit", label: "45 accounts rephrase", before: "Managed 45 enterprise accounts across the Midwest territory", after: "Managed 45 client accounts across the Midwest territory" },
      { kind: "legit", label: "active prospect", before: "Conducted outbound prospecting via email and phone campaigns", after: "Ran outbound prospecting via email and phone campaigns" },
      { kind: "invented", label: "unknown tool Gong", before: "Tracked sales pipeline, deal stages, and customer calls in Salesforce", after: "Tracked sales pipeline, deal stages, and customer calls in Gong" },
      { kind: "invented", label: "swapped employer Oracle", before: "Account Executive at Apex Software, 2021–Present", after: "Account Executive at Oracle, 2021–Present" },
      { kind: "invented", label: "title inflation Director", before: "Account Executive at Apex Software, 2021–Present", after: "Sales Director at Apex Software, 2021–Present" },
      { kind: "invented", label: "scope partnered to drove", before: "Partnered with customer success teams to secure 92% client renewal rate", after: "Drove a 92% client renewal rate" },
      { kind: "invented", label: "revenue inflation $2.4M to $5M", before: "Generated $2.4M in new annual recurring revenue against a $2M target", after: "Generated $5M in new annual recurring revenue against a $2M target" },
      { kind: "invented", label: "causal join which drove", before: "Closed 18 new contracts with average deal size of $130,000", after: "Closed 18 new contracts which drove $2.3M in revenue" },
      { kind: "invented", label: "removed team collaboration", before: "Collaborated with sales engineers to deliver 60 custom product demonstrations", after: "Delivered 60 custom product demonstrations" },
      { kind: "invented", label: "unsupported Fortune 500", before: "Managed 45 enterprise accounts across the Midwest territory", after: "Managed 45 Fortune 500 enterprise accounts across the Midwest territory" },
    ],
  },
  {
    domain: "Finance & Accounting",
    resumeLines: [
      "Financial Analyst at Summit Capital, 2020–Present",
      "Built quarterly financial forecasting models in Microsoft Excel",
      "Analyzed variance for $15M operational expense budget",
      "Assisted senior portfolio managers with financial due diligence for 8 acquisitions",
      "Automated recurring monthly reporting using Python and SQL scripts",
      "Prepared financial presentations for executive leadership each quarter",
      "Monitored cash flow positions and maintained daily treasury reconciliations",
      "Supported annual audit preparations with external CPA auditors",
      "Identified $350,000 in redundant operational expenses",
      "B.S. in Finance from University of Michigan",
    ],
    pairs: [
      { kind: "legit", label: "$15M to $15 million", before: "Analyzed variance for $15M operational expense budget", after: "Analyzed variance for $15 million operational expense budget" },
      { kind: "legit", label: "$350,000 to $350k", before: "Identified $350,000 in redundant operational expenses", after: "Identified $350k in redundant operational expenses" },
      { kind: "legit", label: "quarter reword", before: "Prepared financial presentations for executive leadership each quarter", after: "Prepared quarterly financial presentations for executive leadership" },
      { kind: "legit", label: "assisted to helped", before: "Assisted senior portfolio managers with financial due diligence for 8 acquisitions", after: "Helped senior portfolio managers with financial due diligence for 8 acquisitions" },
      { kind: "legit", label: "spelled-out eight to 8", before: "Assisted senior portfolio managers with financial due diligence for 8 acquisitions", after: "Assisted senior portfolio managers with financial due diligence for eight acquisitions" },
      { kind: "legit", label: "Excel spreadsheet synonym", before: "Built quarterly financial forecasting models in Microsoft Excel", after: "Built quarterly forecasting models in Excel" },
      { kind: "legit", label: "SQL uppercase", before: "Automated recurring monthly reporting using Python and SQL scripts", after: "Automated monthly reporting using Python and SQL" },
      { kind: "legit", label: "treasury daily", before: "Monitored cash flow positions and maintained daily treasury reconciliations", after: "Maintained daily treasury reconciliations and monitored cash flow" },
      { kind: "invented", label: "unknown tool Tableau", before: "Built quarterly financial forecasting models in Microsoft Excel", after: "Built quarterly financial forecasting dashboards in Tableau" },
      { kind: "invented", label: "swapped employer Goldman Sachs", before: "Financial Analyst at Summit Capital, 2020–Present", after: "Financial Analyst at Goldman Sachs, 2020–Present" },
      { kind: "invented", label: "credential CPA invented", before: "Supported annual audit preparations with external CPA auditors", after: "CPA certified analyst supporting annual audit preparations" },
      { kind: "invented", label: "scope assisted to led", before: "Assisted senior portfolio managers with financial due diligence for 8 acquisitions", after: "Led financial due diligence for 8 acquisitions" },
      { kind: "invented", label: "scope supported to owned", before: "Supported annual audit preparations with external CPA auditors", after: "Owned annual audit preparations" },
      { kind: "invented", label: "figure inflation 8 to 20", before: "Assisted senior portfolio managers with financial due diligence for 8 acquisitions", after: "Assisted senior portfolio managers with financial due diligence for 20 acquisitions" },
      { kind: "invented", label: "causal join resulting in", before: "Automated recurring monthly reporting using Python and SQL scripts", after: "Automated recurring monthly reporting resulting in 40 hours saved" },
      { kind: "invented", label: "unsupported Wall Street scale", before: "Analyzed variance for $15M operational expense budget", after: "Analyzed variance for $15M Wall Street investment budget" },
    ],
  },
  {
    domain: "Teaching & Education",
    resumeLines: [
      "High School Math Teacher at Oakridge Academy, 2019–Present",
      "Taught Algebra and Geometry courses to 120 students annually",
      "Designed differentiated lesson plans aligned with state mathematics standards",
      "Integrated Google Classroom and Khan Academy into daily instruction",
      "Mentored four student teachers on classroom management strategies",
      "Collaborated with 5 department faculty to revamp freshman curriculum",
      "Improved standardized test passing rates from 72% to 86% over two years",
      "Facilitated weekly after-school tutoring sessions for at-risk students",
      "Organized annual STEM science and mathematics exhibition with 300 participants",
      "B.A. in Mathematics Education from Central College",
    ],
    pairs: [
      { kind: "legit", label: "two years to 2 years", before: "Improved standardized test passing rates from 72% to 86% over two years", after: "Improved standardized test passing rates from 72% to 86% over 2 years" },
      { kind: "legit", label: "four to 4 mentors", before: "Mentored four student teachers on classroom management strategies", after: "Mentored 4 student teachers on classroom management strategies" },
      { kind: "legit", label: "reorder curriculum", before: "Collaborated with 5 department faculty to revamp freshman curriculum", after: "Revamped freshman curriculum in collaboration with 5 department faculty" },
      { kind: "legit", label: "72% to 86% percentage", before: "Improved standardized test passing rates from 72% to 86% over two years", after: "Raised standardized test passing rates from 72% to 86% over two years" },
      { kind: "legit", label: "120 students rephrase", before: "Taught Algebra and Geometry courses to 120 students annually", after: "Instructed 120 students annually in Algebra and Geometry courses" },
      { kind: "legit", label: "tutoring active", before: "Facilitated weekly after-school tutoring sessions for at-risk students", after: "Ran weekly after-school tutoring sessions for at-risk students" },
      { kind: "legit", label: "lesson plan verb", before: "Designed differentiated lesson plans aligned with state mathematics standards", after: "Created differentiated lesson plans aligned with state mathematics standards" },
      { kind: "legit", label: "300 attendees", before: "Organized annual STEM science and mathematics exhibition with 300 participants", after: "Organized annual STEM exhibition with 300 participants" },
      { kind: "invented", label: "swapped school Stuyvesant", before: "High School Math Teacher at Oakridge Academy, 2019–Present", after: "High School Math Teacher at Stuyvesant High School, 2019–Present" },
      { kind: "invented", label: "title inflation Principal", before: "High School Math Teacher at Oakridge Academy, 2019–Present", after: "Assistant Principal at Oakridge Academy, 2019–Present" },
      { kind: "invented", label: "degree inflation M.A.", before: "B.A. in Mathematics Education from Central College", after: "M.A. in Mathematics Education from Central College" },
      { kind: "invented", label: "student count inflation 120 to 300", before: "Taught Algebra and Geometry courses to 120 students annually", after: "Taught Algebra and Geometry courses to 300 students annually" },
      { kind: "invented", label: "removed team collaboration", before: "Collaborated with 5 department faculty to revamp freshman curriculum", after: "Revamped freshman curriculum" },
      { kind: "invented", label: "causal join which raised", before: "Integrated Google Classroom and Khan Academy into daily instruction", after: "Integrated Google Classroom which raised test scores by 15%" },
      { kind: "invented", label: "unsupported urban scale", before: "Taught Algebra and Geometry courses to 120 students annually", after: "Taught Algebra and Geometry courses to 120 inner-city urban students" },
      { kind: "invented", label: "invented tool Blackboard", before: "Integrated Google Classroom and Khan Academy into daily instruction", after: "Integrated Google Classroom and Blackboard into daily instruction" },
    ],
  },
  {
    domain: "Logistics & Supply Chain",
    resumeLines: [
      "Logistics Coordinator at Harbor Freight Logistics, 2020–Present",
      "Coordinated daily dispatch schedules for fleet of 35 freight trucks",
      "Handled 80 shipments weekly across regional distribution centers",
      "Monitored warehouse inventory counts and stock transfers in SAP",
      "Negotiated carrier freight rates reducing annual shipping spend by 12%",
      "Resolved shipping delays and transit exceptions with carrier dispatchers",
      "Collaborated with warehouse team of 10 to streamline loading docks",
      "Implemented barcode scanning procedures for inbound freight",
      "Maintained 99.2% on-time delivery metric across all client routes",
      "B.S. in Supply Chain Management from Penn State",
    ],
    pairs: [
      { kind: "legit", label: "80 shipments weekly", before: "Handled 80 shipments weekly across regional distribution centers", after: "Handled 80 inbound and outbound shipments a week across regional distribution centers" },
      { kind: "legit", label: "fleet of 35", before: "Coordinated daily dispatch schedules for fleet of 35 freight trucks", after: "Coordinated dispatch schedules daily for fleet of 35 trucks" },
      { kind: "legit", label: "12% to 12 percent", before: "Negotiated carrier freight rates reducing annual shipping spend by 12%", after: "Negotiated carrier freight rates reducing annual shipping spend by 12 percent" },
      { kind: "legit", label: "SAP ERP synonym", before: "Monitored warehouse inventory counts and stock transfers in SAP", after: "Monitored warehouse inventory and stock transfers in SAP ERP" },
      { kind: "legit", label: "reorder docks", before: "Collaborated with warehouse team of 10 to streamline loading docks", after: "Streamlined loading docks working with warehouse team of 10" },
      { kind: "legit", label: "on-time metric", before: "Maintained 99.2% on-time delivery metric across all client routes", after: "Achieved 99.2% on-time delivery metric across client routes" },
      { kind: "legit", label: "delays active", before: "Resolved shipping delays and transit exceptions with carrier dispatchers", after: "Handled shipping delays and transit exceptions with dispatchers" },
      { kind: "legit", label: "inbound freight barcode", before: "Implemented barcode scanning procedures for inbound freight", after: "Created barcode scanning procedures for inbound freight" },
      { kind: "invented", label: "Coordinator to Supervisor", before: "Logistics Coordinator at Harbor Freight Logistics, 2020–Present", after: "Logistics Supervisor at Harbor Freight Logistics, 2020–Present" },
      { kind: "invented", label: "unknown tool Oracle WMS", before: "Monitored warehouse inventory counts and stock transfers in SAP", after: "Monitored warehouse inventory counts and stock transfers in Oracle WMS" },
      { kind: "invented", label: "swapped employer FedEx", before: "Logistics Coordinator at Harbor Freight Logistics, 2020–Present", after: "Logistics Coordinator at FedEx, 2020–Present" },
      { kind: "invented", label: "scope coordinated to directed", before: "Coordinated daily dispatch schedules for fleet of 35 freight trucks", after: "Directed daily dispatch schedules for fleet of 35 freight trucks" },
      { kind: "invented", label: "truck count inflation 35 to 100", before: "Coordinated daily dispatch schedules for fleet of 35 freight trucks", after: "Coordinated daily dispatch schedules for fleet of 100 freight trucks" },
      { kind: "invented", label: "removed team collaboration", before: "Collaborated with warehouse team of 10 to streamline loading docks", after: "Streamlined loading docks" },
      { kind: "invented", label: "causal join which drove", before: "Implemented barcode scanning procedures for inbound freight", after: "Implemented barcode scanning procedures which drove $1.8M in cost savings" },
      { kind: "invented", label: "unsupported global conglomerate", before: "Handled 80 shipments weekly across regional distribution centers", after: "Handled 80 shipments weekly for a global conglomerate" },
    ],
  },
  {
    domain: "Digital Marketing",
    resumeLines: [
      "Marketing Specialist at BrandWave Agency, 2021–Present",
      "Managed $60,000 monthly paid search and social ad budget",
      "Created marketing campaigns across Google Ads, Meta Ads, and LinkedIn",
      "Increased organic web traffic by 45% through SEO content optimization",
      "Collaborated with creative team of 3 designers to produce ad assets",
      "Tracked website visitor funnels and conversion goals in Google Analytics",
      "Wrote weekly email newsletters distributed to 25,000 subscribers",
      "Boosted average email click-through rate from 2.1% to 3.8%",
      "Partnered with sales team to deliver 400 qualified inbound leads each quarter",
      "B.A. in Marketing from University of Florida",
    ],
    pairs: [
      { kind: "legit", label: "$60,000 to $60k", before: "Managed $60,000 monthly paid search and social ad budget", after: "Managed $60k monthly paid search and social ad budget" },
      { kind: "legit", label: "25,000 to 25k", before: "Wrote weekly email newsletters distributed to 25,000 subscribers", after: "Wrote weekly email newsletters distributed to 25k subscribers" },
      { kind: "legit", label: "quarterly leads", before: "Partnered with sales team to deliver 400 qualified inbound leads each quarter", after: "Delivered 400 qualified inbound leads each quarter partnering with sales team" },
      { kind: "legit", label: "45% to 45 percent", before: "Increased organic web traffic by 45% through SEO content optimization", after: "Boosted organic web traffic by 45 percent through SEO content optimization" },
      { kind: "legit", label: "Google Analytics GA", before: "Tracked website visitor funnels and conversion goals in Google Analytics", after: "Tracked visitor funnels and conversion goals in Google Analytics" },
      { kind: "legit", label: "reorder ad channels", before: "Created marketing campaigns across Google Ads, Meta Ads, and LinkedIn", after: "Created campaigns across LinkedIn, Meta Ads, and Google Ads" },
      { kind: "legit", label: "click-through rate", before: "Boosted average email click-through rate from 2.1% to 3.8%", after: "Raised email click-through rate from 2.1% to 3.8%" },
      { kind: "legit", label: "weekly newsletter active", before: "Wrote weekly email newsletters distributed to 25,000 subscribers", after: "Authored weekly email newsletters sent to 25,000 subscribers" },
      { kind: "invented", label: "unknown tool HubSpot", before: "Tracked website visitor funnels and conversion goals in Google Analytics", after: "Tracked website visitor funnels and conversion goals in HubSpot" },
      { kind: "invented", label: "swapped employer Ogilvy", before: "Marketing Specialist at BrandWave Agency, 2021–Present", after: "Marketing Specialist at Ogilvy, 2021–Present" },
      { kind: "invented", label: "title inflation Marketing Director", before: "Marketing Specialist at BrandWave Agency, 2021–Present", after: "Marketing Director at BrandWave Agency, 2021–Present" },
      { kind: "invented", label: "scope partnered to led", before: "Partnered with sales team to deliver 400 qualified inbound leads each quarter", after: "Led campaign delivering 400 qualified inbound leads each quarter" },
      { kind: "invented", label: "budget inflation $60k to $250k", before: "Managed $60,000 monthly paid search and social ad budget", after: "Managed $250,000 monthly paid search and social ad budget" },
      { kind: "invented", label: "removed creative team", before: "Collaborated with creative team of 3 designers to produce ad assets", after: "Produced ad assets" },
      { kind: "invented", label: "causal join resulting in", before: "Increased organic web traffic by 45% through SEO content optimization", after: "Optimized SEO content resulting in $500k incremental revenue" },
      { kind: "invented", label: "unsupported international multi-tenant", before: "Managed $60,000 monthly paid search and social ad budget", after: "Managed $60,000 monthly ad budget across international enterprise markets" },
    ],
  },
  {
    domain: "Product & UI/UX Design",
    resumeLines: [
      "Product Designer at CloudStudio, 2021–Present",
      "Designed user interfaces and end-to-end design systems in Figma",
      "Conducted 24 usability testing interviews with target enterprise users",
      "Collaborated with product manager and 6 software engineers on roadmap features",
      "Reduced mobile onboarding drop-off rate from 34% to 19%",
      "Created high-fidelity interactive prototypes for mobile and desktop apps",
      "Maintained component design library consisting of 200+ accessible components",
      "Partnered with user research team to analyze customer journey maps",
      "Delivered responsive design specifications in Zeplin and Figma",
      "B.F.A. in Graphic Design from Rhode Island School of Design",
    ],
    pairs: [
      { kind: "legit", label: "24 interviews", before: "Conducted 24 usability testing interviews with target enterprise users", after: "Ran 24 usability interviews with target enterprise users" },
      { kind: "legit", label: "drop-off percentage", before: "Reduced mobile onboarding drop-off rate from 34% to 19%", after: "Cut mobile onboarding drop-off from 34% to 19%" },
      { kind: "legit", label: "200+ components", before: "Maintained component design library consisting of 200+ accessible components", after: "Maintained component library of 200+ accessible components" },
      { kind: "legit", label: "Figma design system", before: "Designed user interfaces and end-to-end design systems in Figma", after: "Designed user interfaces and design systems in Figma" },
      { kind: "legit", label: "reorder prototypes", before: "Created high-fidelity interactive prototypes for mobile and desktop apps", after: "Created interactive prototypes for desktop and mobile apps" },
      { kind: "legit", label: "partnered to collaborated", before: "Partnered with user research team to analyze customer journey maps", after: "Collaborated with user research team to analyze customer journey maps" },
      { kind: "legit", label: "prototype verb", before: "Created high-fidelity interactive prototypes for mobile and desktop apps", after: "Built high-fidelity interactive prototypes for mobile and desktop apps" },
      { kind: "legit", label: "design specs", before: "Delivered responsive design specifications in Zeplin and Figma", after: "Delivered responsive design specifications in Figma and Zeplin" },
      { kind: "invented", label: "unknown tool Sketch", before: "Designed user interfaces and end-to-end design systems in Figma", after: "Designed user interfaces and end-to-end design systems in Sketch" },
      { kind: "invented", label: "swapped employer Apple", before: "Product Designer at CloudStudio, 2021–Present", after: "Product Designer at Apple, 2021–Present" },
      { kind: "invented", label: "title inflation Head of Design", before: "Product Designer at CloudStudio, 2021–Present", after: "Head of Design at CloudStudio, 2021–Present" },
      { kind: "invented", label: "scope partnered to directed", before: "Partnered with user research team to analyze customer journey maps", after: "Directed user research team to analyze customer journey maps" },
      { kind: "invented", label: "interview count inflation 24 to 80", before: "Conducted 24 usability testing interviews with target enterprise users", after: "Conducted 80 usability testing interviews with target enterprise users" },
      { kind: "invented", label: "removed team collaboration", before: "Collaborated with product manager and 6 software engineers on roadmap features", after: "Designed roadmap features" },
      { kind: "invented", label: "causal join which drove", before: "Reduced mobile onboarding drop-off rate from 34% to 19%", after: "Reduced mobile onboarding drop-off rate which drove $1.8M in new ARR" },
      { kind: "invented", label: "unsupported Fortune 100", before: "Conducted 24 usability testing interviews with target enterprise users", after: "Conducted 24 usability testing interviews with Fortune 100 enterprise users" },
    ],
  },
];

describe("Grounding pairs suite across 8 domains (>=120 pairs)", () => {
  it("satisfies reviewer acceptance criteria (0 FN, <= 1 FP) and prints evaluation table", () => {
    let totalLegit = 0;
    let totalInvented = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    const results: Array<{
      domain: string;
      label: string;
      kind: "legit" | "invented";
      flagged: boolean;
      flags: string[];
      status: "PASS" | "FP" | "FN";
    }> = [];

    for (const domain of DOMAINS) {
      const sourceText = domain.resumeLines.join("\n");
      const sourceIndex = buildSourceIndex([sourceText]);

      for (const pair of domain.pairs) {
        // Find line number of 'before' sentence
        const lineIdx = domain.resumeLines.findIndex((l) => l === pair.before) !== -1
          ? domain.resumeLines.findIndex((l) => l === pair.before)
          : domain.resumeLines.findIndex((l) => l.includes(pair.before));
        const citedLineNum = lineIdx >= 0 ? lineIdx + 1 : 1;

        // Verify with cited line number
        const check = checkGrounding(sourceIndex, pair.after, { cites: [citedLineNum] });
        const isFlagged = check.flags.length > 0;

        if (pair.kind === "legit") {
          totalLegit++;
          if (isFlagged) {
            falsePositives++;
            results.push({
              domain: domain.domain,
              label: pair.label,
              kind: pair.kind,
              flagged: true,
              flags: check.flags.map((f) => f.value),
              status: "FP",
            });
          } else {
            results.push({
              domain: domain.domain,
              label: pair.label,
              kind: pair.kind,
              flagged: false,
              flags: [],
              status: "PASS",
            });
          }
        } else {
          totalInvented++;
          if (!isFlagged) {
            falseNegatives++;
            results.push({
              domain: domain.domain,
              label: pair.label,
              kind: pair.kind,
              flagged: false,
              flags: [],
              status: "FN",
            });
          } else {
            results.push({
              domain: domain.domain,
              label: pair.label,
              kind: pair.kind,
              flagged: true,
              flags: check.flags.map((f) => f.value),
              status: "PASS",
            });
          }
        }
      }
    }

    const totalPairs = totalLegit + totalInvented;

    // Print evaluation table
    console.log("\n=======================================================");
    console.log("            GROUNDING EVALUATION REPORT               ");
    console.log("=======================================================");
    console.log(`Total Pairs Evaluated: ${totalPairs} across ${DOMAINS.length} domains`);
    console.log(`Legitimate Rewrites:   ${totalLegit}`);
    console.log(`Invented Rewrites:     ${totalInvented}`);
    console.log("-------------------------------------------------------");
    console.log(`False Positives (FP):  ${falsePositives} / ${totalLegit} (${((falsePositives / totalLegit) * 100).toFixed(1)}%)`);
    console.log(`False Negatives (FN):  ${falseNegatives} / ${totalInvented} (${((falseNegatives / totalInvented) * 100).toFixed(1)}%)`);
    console.log("-------------------------------------------------------");
    if (falsePositives > 0 || falseNegatives > 0) {
      console.log("Mismatches:");
      for (const r of results.filter((r) => r.status !== "PASS")) {
        console.log(`  [${r.status}] [${r.domain}] ${r.label}: flags=[${r.flags.join(", ")}]`);
      }
    }
    console.log("=======================================================\n");

    expect(totalPairs).toBeGreaterThanOrEqual(120);
    expect(falseNegatives, "Must catch 100% of inventions (0 FN)").toBe(0);
    expect(falsePositives, "Must allow honest rewrites (<= 1 FP)").toBeLessThanOrEqual(1);
  });

  describe("coordinator probe cases", () => {
    for (const [kind, label, before, after, expectedEntity] of probePairs) {
      it(`probe: ${kind} - ${label}`, () => {
        const g = checkGrounding([before], after, { cites: [1] });
        if (kind === "invented") {
          expect(g.flags.length, `Expected flags for invented claim: ${after}`).toBeGreaterThan(0);
          if (expectedEntity) {
            const hasExpected = g.flags.some((f) => f.value.toLowerCase() === expectedEntity.toLowerCase());
            expect(hasExpected, `Expected flagged entity "${expectedEntity}" in flags: ${JSON.stringify(g.flags)}`).toBe(true);
          }
        } else {
          expect(g.flags.length, `Expected no flags for legit reword: ${after}`).toBe(0);
        }
      });
    }
  });

  describe("individual pairs verification", () => {
    const allLegacyPairs = [
      ...reviewerPairs,
      ...additionalPairs,
      ...probePairs.map(([kind, label, before, after]): LegacyPair => [kind, label, before, after]),
    ];
    for (const [kind, label, before, after] of allLegacyPairs) {
      it(`legacy: ${kind} - ${label}`, () => {
        const g = checkGrounding([before], after, { cites: [1] });
        if (kind === "invented") {
          expect(g.flags.length, `Expected "${after}" to be flagged against "${before}"`).toBeGreaterThan(0);
        } else {
          expect(g.flags.length, `Expected no flags for legit rewrite "${after}"`).toBe(0);
        }
      });
    }
  });

  it("verifyChange blocks invented changes and allows legit changes on legacy benchmark", () => {
    const allLegacyPairs = [
      ...reviewerPairs,
      ...additionalPairs,
      ...probePairs.map(([kind, label, before, after]): LegacyPair => [kind, label, before, after]),
    ];
    const job = { requirements: [] } as unknown as Parameters<typeof verifyChange>[2];
    for (const [kind, label, before, after] of allLegacyPairs) {
      const t = verifyChange(
        { id: "c1", op: "rewrite", before, after, reason: "", requirementIds: [] },
        before,
        job,
        before,
      );
      const blockingFlags = t.filter((f) => f.kind !== "dropped" && f.kind !== "filler");
      if (kind === "invented") {
        expect(blockingFlags.length, `verifyChange should flag invented: ${label}`).toBeGreaterThan(0);
      } else {
        expect(blockingFlags.length, `verifyChange should allow legit: ${label}`).toBe(0);
      }
    }
  });

});
