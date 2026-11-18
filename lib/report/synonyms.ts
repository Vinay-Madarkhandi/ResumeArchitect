/**
 * Terms that mean the same skill. Jobscan credits a synonym at roughly
 * 70–80% of an exact match and tells the user to include both forms of an
 * acronym (docs/research/jobscan.md §15), so the report needs to know which
 * pairs are abbreviations ("K8s" for "Kubernetes": write both) and which are
 * spelling variants ("Postgres" for "PostgreSQL": use the posting's).
 *
 * Only true equivalents belong here. "Project management" and "program
 * management" are different jobs; listing them would hide a real gap.
 */

export type SynonymKind = "abbreviation" | "variant";

export interface SynonymGroup {
  kind: SynonymKind;
  /** Every form, the long or preferred one first. */
  forms: readonly string[];
}

const ABBREVIATIONS: readonly (readonly string[])[] = [
  // Software and data
  ["JavaScript", "JS"],
  ["TypeScript", "TS"],
  ["Kubernetes", "K8s"],
  ["Machine Learning", "ML"],
  ["Artificial Intelligence", "AI"],
  ["Deep Learning", "DL"],
  ["Natural Language Processing", "NLP"],
  ["Large Language Model", "LLM"],
  ["Retrieval-Augmented Generation", "RAG"],
  ["Generative AI", "GenAI", "Generative Artificial Intelligence"],
  ["Amazon Web Services", "AWS"],
  ["Google Cloud Platform", "GCP", "Google Cloud"],
  ["Amazon EC2", "EC2", "Elastic Compute Cloud"],
  ["Amazon S3", "S3", "Simple Storage Service"],
  ["Amazon EKS", "EKS", "Elastic Kubernetes Service"],
  ["Amazon ECS", "ECS", "Elastic Container Service"],
  ["Amazon RDS", "RDS", "Relational Database Service"],
  ["Azure Kubernetes Service", "AKS"],
  ["Google Kubernetes Engine", "GKE"],
  [
    "Continuous Integration/Continuous Delivery",
    "CI/CD",
    "Continuous Integration/Continuous Deployment",
    "Continuous Integration and Continuous Delivery",
    "Continuous Integration and Continuous Deployment",
  ],
  ["Infrastructure as Code", "IaC"],
  ["Site Reliability Engineering", "SRE"],
  ["Application Programming Interface", "API"],
  ["Structured Query Language", "SQL"],
  ["Object-Oriented Programming", "OOP"],
  ["Object-Oriented Design", "OOD"],
  ["Test-Driven Development", "TDD"],
  ["Behavior-Driven Development", "BDD"],
  ["Domain-Driven Design", "DDD"],
  ["Software Development Life Cycle", "SDLC"],
  ["Service-Oriented Architecture", "SOA"],
  ["Model-View-Controller", "MVC"],
  ["Single-Page Application", "SPA"],
  ["Single Sign-On", "SSO"],
  ["Role-Based Access Control", "RBAC"],
  ["Identity and Access Management", "IAM"],
  ["Virtual Private Cloud", "VPC"],
  ["Content Delivery Network", "CDN"],
  ["Domain Name System", "DNS"],
  ["Transmission Control Protocol/Internet Protocol", "TCP/IP"],
  ["Hypertext Markup Language", "HTML"],
  ["Cascading Style Sheets", "CSS"],
  ["Extract, Transform, Load", "ETL"],
  ["Business Intelligence", "BI"],
  ["Graphical User Interface", "GUI"],
  ["Command-Line Interface", "CLI"],
  ["Integrated Development Environment", "IDE"],
  ["Unified Modeling Language", "UML"],
  ["Data Structures and Algorithms", "DSA"],
  ["Robotic Process Automation", "RPA"],
  ["Optical Character Recognition", "OCR"],
  ["Internet of Things", "IoT"],
  ["Virtual Reality", "VR"],
  ["Software as a Service", "SaaS"],
  ["Platform as a Service", "PaaS"],
  ["Infrastructure as a Service", "IaaS"],
  ["User Experience", "UX"],
  ["User Interface", "UI"],
  ["Quality Assurance", "QA"],
  ["Quality Control", "QC"],
  ["Content Management System", "CMS"],
  ["Information Security", "InfoSec"],
  ["Security Information and Event Management", "SIEM"],
  ["Endpoint Detection and Response", "EDR"],
  ["Open Web Application Security Project", "OWASP"],
  ["Certified Information Systems Security Professional", "CISSP"],
  ["Payment Card Industry Data Security Standard", "PCI DSS"],
  ["General Data Protection Regulation", "GDPR"],
  ["System and Organization Controls 2", "SOC 2", "SOC2"],
  ["Computer Science", "CS"],
  ["Information Technology", "IT"],
  ["Electrical Engineering", "EE"],
  // Marketing, sales, and product
  ["Search Engine Optimization", "SEO"],
  ["Search Engine Marketing", "SEM"],
  ["Pay-Per-Click", "PPC"],
  ["Customer Relationship Management", "CRM"],
  ["Customer Data Platform", "CDP"],
  ["Account-Based Marketing", "ABM"],
  ["Go-to-Market", "GTM"],
  ["Key Performance Indicator", "KPI"],
  ["Return on Investment", "ROI"],
  ["Return on Ad Spend", "ROAS"],
  ["Net Promoter Score", "NPS"],
  ["Customer Acquisition Cost", "CAC"],
  ["Customer Lifetime Value", "CLV", "LTV", "Lifetime Value"],
  ["Monthly Recurring Revenue", "MRR"],
  ["Annual Recurring Revenue", "ARR"],
  ["Business-to-Business", "B2B"],
  ["Business-to-Consumer", "B2C"],
  ["Sales Development Representative", "SDR"],
  ["Business Development Representative", "BDR"],
  ["Minimum Viable Product", "MVP"],
  ["Product Requirements Document", "PRD"],
  ["Objectives and Key Results", "OKR"],
  ["Request for Proposal", "RFP"],
  ["Statement of Work", "SOW"],
  ["Service Level Agreement", "SLA"],
  ["Standard Operating Procedure", "SOP"],
  ["Research and Development", "R&D"],
  ["Point of Sale", "POS"],
  ["Digital Asset Management", "DAM"],
  // Project management
  ["Project Management Professional", "PMP"],
  ["Project Management Office", "PMO"],
  ["Certified ScrumMaster", "CSM", "Certified Scrum Master"],
  // Finance and accounting
  ["Certified Public Accountant", "CPA"],
  ["Chartered Financial Analyst", "CFA"],
  ["Generally Accepted Accounting Principles", "GAAP"],
  ["International Financial Reporting Standards", "IFRS"],
  ["Accounts Payable", "A/P"],
  ["Accounts Receivable", "A/R"],
  ["Financial Planning and Analysis", "FP&A"],
  ["Profit and Loss", "P&L"],
  ["Mergers and Acquisitions", "M&A"],
  ["Sarbanes-Oxley", "SOX"],
  ["Anti-Money Laundering", "AML"],
  ["Know Your Customer", "KYC"],
  ["Cost of Goods Sold", "COGS"],
  ["Earnings Before Interest, Taxes, Depreciation, and Amortization", "EBITDA"],
  ["Discounted Cash Flow", "DCF"],
  ["Year-over-Year", "YoY"],
  // People and HR
  ["Human Resources", "HR"],
  ["Human Resources Information System", "HRIS"],
  ["Applicant Tracking System", "ATS"],
  ["Learning and Development", "L&D"],
  ["Diversity, Equity, and Inclusion", "DEI", "DE&I"],
  // Healthcare
  ["Electronic Health Record", "EHR"],
  ["Electronic Medical Record", "EMR"],
  ["Health Insurance Portability and Accountability Act", "HIPAA"],
  ["Registered Nurse", "RN"],
  ["Licensed Practical Nurse", "LPN"],
  ["Certified Nursing Assistant", "CNA"],
  ["Basic Life Support", "BLS"],
  ["Advanced Cardiovascular Life Support", "ACLS"],
  ["Intensive Care Unit", "ICU"],
  ["Emergency Medical Technician", "EMT"],
  // Operations, engineering, and education
  ["Occupational Safety and Health Administration", "OSHA"],
  ["Good Manufacturing Practice", "GMP"],
  ["Statistical Process Control", "SPC"],
  ["Computer-Aided Design", "CAD"],
  ["Building Information Modeling", "BIM"],
  ["Programmable Logic Controller", "PLC"],
  ["Supply Chain Management", "SCM"],
  ["Third-Party Logistics", "3PL"],
  ["Electronic Data Interchange", "EDI"],
  ["Individualized Education Program", "IEP"],
  ["Applied Behavior Analysis", "ABA"],
  ["Teaching English as a Foreign Language", "TEFL"],
  // Degrees
  ["Master of Business Administration", "MBA"],
  ["Bachelor of Science", "B.S.", "BSc", "B.Sc."],
  ["Bachelor of Arts", "B.A."],
  ["Master of Science", "M.S.", "MSc", "M.Sc."],
  ["Doctor of Philosophy", "PhD", "Ph.D."],
  ["Bachelor of Technology", "B.Tech", "BTech"],
  ["Bachelor of Engineering", "B.E.", "BEng"],
];

const VARIANTS: readonly (readonly string[])[] = [
  // Languages and frameworks
  ["Go", "Golang"],
  ["C#", "C Sharp", "CSharp"],
  ["C++", "CPP"],
  ["Objective-C", "ObjC"],
  ["Node.js", "NodeJS"],
  ["React", "React.js", "ReactJS"],
  ["Vue.js", "Vue", "VueJS"],
  ["Next.js", "NextJS"],
  ["Express.js", "Express", "ExpressJS"],
  ["NestJS", "Nest.js"],
  [".NET", "dotnet"],
  ["Ruby on Rails", "Rails", "RoR"],
  ["Spring Boot", "SpringBoot"],
  ["scikit-learn", "sklearn"],
  ["TensorFlow", "Tensor Flow"],
  ["Jupyter Notebook", "Jupyter"],
  ["Selenium WebDriver", "Selenium"],
  // Data stores and platforms
  ["PostgreSQL", "Postgres"],
  ["MongoDB", "Mongo"],
  ["Elasticsearch", "Elastic Search"],
  ["Microsoft SQL Server", "SQL Server", "MSSQL", "MS SQL"],
  ["Amazon DynamoDB", "DynamoDB"],
  ["Apache Kafka", "Kafka"],
  ["Apache Spark", "Spark", "PySpark"],
  ["Apache Airflow", "Airflow"],
  ["Apache Hadoop", "Hadoop"],
  ["Microsoft Azure", "Azure"],
  ["GitHub Actions", "GH Actions"],
  ["GitLab CI", "GitLab CI/CD"],
  ["macOS", "Mac OS", "OS X", "OSX"],
  ["Atlassian Jira", "Jira"],
  // Business software
  ["Microsoft Excel", "Excel", "MS Excel"],
  ["Microsoft Word", "MS Word"],
  ["Microsoft PowerPoint", "PowerPoint", "MS PowerPoint"],
  ["Microsoft Office", "MS Office", "Office 365", "Microsoft 365", "M365"],
  ["Microsoft Power BI", "Power BI", "PowerBI"],
  ["Salesforce", "SFDC", "Salesforce.com"],
  ["Google Ads", "AdWords", "Google AdWords"],
  ["Google Analytics", "GA4"],
  ["Meta Ads", "Facebook Ads"],
  ["Adobe Photoshop", "Photoshop"],
  ["Adobe Illustrator", "Illustrator"],
  ["Adobe InDesign", "InDesign"],
  ["Adobe Creative Cloud", "Creative Cloud", "Adobe Creative Suite"],
  ["QuickBooks", "QuickBooks Online", "QBO"],
  ["Oracle NetSuite", "NetSuite"],
  // Practices
  ["Microservices", "Micro-services", "Microservice architecture"],
  ["Front-end", "Frontend"],
  ["Back-end", "Backend"],
  ["Full-stack", "Fullstack"],
  ["E-commerce", "Ecommerce"],
  ["A/B testing", "Split testing"],
  ["Data visualization", "Data visualisation"],
  ["Copywriting", "Copy writing"],
  // Soft skills
  ["Attention to detail", "Detail-oriented"],
  ["Communication skills", "Communication"],
  ["Teamwork", "Collaboration", "Team work"],
  ["Customer-focused", "Customer-centric", "Customer-oriented"],
  ["Self-motivated", "Self-starter"],
  ["Multitasking", "Multi-tasking"],
  ["Organizational skills", "Organisational skills", "Organization skills"],
  ["Interpersonal skills", "People skills"],
];

export const SYNONYM_GROUPS: readonly SynonymGroup[] = [
  ...ABBREVIATIONS.map((forms) => ({ kind: "abbreviation" as const, forms })),
  ...VARIANTS.map((forms) => ({ kind: "variant" as const, forms })),
];

/** Lookup key: case and separators don't distinguish forms ("Node.js" = "nodejs"). */
export function formKey(form: string): string {
  return form.toLowerCase().replace(/[\s\-_/.,]+/g, "");
}

const SMALL_WORDS = new Set(["and", "of", "for", "the", "to", "in", "on", "a", "an", "&"]);

function initialsMatch(words: string[], letters: string): boolean {
  if (words.length === 0 || SMALL_WORDS.has(words[0].toLowerCase())) return false;
  const all = words.map((w) => w[0]).join("").toUpperCase();
  const significant = words
    .filter((w) => !SMALL_WORDS.has(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return all === letters || significant === letters;
}

const ACRONYM_IN_PARENS = /\(([A-Za-z0-9&]{2,8})\)/g;
const PARENS_AFTER_ACRONYM = /\b([A-Z][A-Za-z0-9&]{1,7})\s*\(([^()]{3,80})\)/g;

/**
 * Acronyms a text defines itself: "search engine optimization (SEO)" or
 * "SEO (Search Engine Optimization)". Postings do this for the exact terms
 * they screen for, so these pairs extend the static table per report.
 */
export function acronymPairs(text: string): SynonymGroup[] {
  const pairs: SynonymGroup[] = [];
  for (const m of text.matchAll(ACRONYM_IN_PARENS)) {
    const short = m[1];
    const letters = short.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if ((short.match(/[A-Z]/g) ?? []).length < 2) continue;
    const before = text.slice(0, m.index).split(/[\n;:()]/).pop() ?? "";
    const words = Array.from(before.matchAll(/[^\s-]+/g));
    for (let k = letters.length; k <= Math.min(words.length, letters.length + 3); k++) {
      const candidate = words.slice(words.length - k);
      if (initialsMatch(candidate.map((w) => w[0]), letters)) {
        const long = before.slice(candidate[0].index).trim().replace(/[,\s]+$/, "");
        pairs.push({ kind: "abbreviation", forms: [long, short] });
        break;
      }
    }
  }
  for (const m of text.matchAll(PARENS_AFTER_ACRONYM)) {
    const [, short, long] = m;
    const letters = short.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if ((short.match(/[A-Z]/g) ?? []).length < 2) continue;
    if (initialsMatch(long.trim().split(/[\s-]+/), letters)) {
      pairs.push({ kind: "abbreviation", forms: [long.trim(), short] });
    }
  }
  return pairs;
}

export type Lexicon = (term: string) => SynonymGroup | null;

/** Looks terms up in the static table plus any acronyms the given texts define. */
export function buildLexicon(...texts: string[]): Lexicon {
  const byKey = new Map<string, SynonymGroup>();
  const add = (group: SynonymGroup) => {
    if (group.forms.some((f) => byKey.has(formKey(f)))) return;
    for (const form of group.forms) byKey.set(formKey(form), group);
  };
  SYNONYM_GROUPS.forEach(add);
  texts.flatMap(acronymPairs).forEach(add);
  return (term) => byKey.get(formKey(term)) ?? null;
}
