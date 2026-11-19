import { describe, expect, it } from "vitest";
import { buildSourceIndex, checkGrounding } from "./index";

// Generate a realistic 1,700-word resume (~3 pages)
export function generate1700WordResume(): { text: string; lines: string[]; wordCount: number } {
  const sections = [
    "# Jane Doe, Principal Software Engineer",
    "San Francisco, CA | jane.doe@example.com | (555) 234-5678 | github.com/janedoe | linkedin.com/in/janedoe",
    "",
    "## Professional Summary",
    "Accomplished software architect and engineering leader with over 12 years of hands-on experience designing, developing, and scaling high-concurrency distributed systems, cloud infrastructure, and data platforms. Expert in Go, Python, Java, PostgreSQL, Redis, Apache Kafka, and Kubernetes with a proven track record of reducing operational latency, optimizing infrastructure expenditures, and mentoring high-performing engineering teams in fast-paced product environments.",
    "",
    "## Core Competencies",
    "- Languages: Go, Python, TypeScript, Java, SQL, Bash, C++, Rust",
    "- Infrastructure & Cloud: AWS (EC2, S3, RDS, Lambda, CloudFront), Google Cloud Platform, Docker, Kubernetes, Terraform",
    "- Data & Storage: PostgreSQL, MySQL, Redis, MongoDB, Elasticsearch, Apache Cassandra, Snowflake, BigQuery",
    "- Architecture: Distributed Systems, Microservices, Event-Driven Architecture, RESTful APIs, gRPC, CI/CD Automation",
    "",
    "## Professional Experience",
    "",
    "### Acme Corporation — San Francisco, CA",
    "Staff Software Engineer | Jan 2021 – Present",
    "- Architected and deployed a multi-tenant event processing pipeline in Go handling 50,000 events per second backed by Kafka and PostgreSQL.",
    "- Reduced invoice latency by 38% through Redis caching layer and optimized SQL query execution plans across primary databases.",
    "- Managed an annual cloud infrastructure budget of $4M across AWS and Google Cloud Platform environments.",
    "- Led a cross-functional squad of 8 senior software engineers across 3 time zones to deliver enterprise authentication services.",
    "- Migrated legacy monolithic billing service to 6 decoupled Go microservices without customer-facing downtime.",
    "- Implemented end-to-end distributed tracing using OpenTelemetry and Jaeger reducing mean time to detection from 45 minutes to 8 minutes.",
    "- Designed resilient rate-limiting middleware in Redis protecting mission-critical checkout endpoints from DDoS traffic surges.",
    "- Mentored 12 junior and mid-level software engineers through structured pair programming and architectural design reviews.",
    "- Spearheaded company-wide container migration to Amazon EKS reducing ec2 provisioning costs by $320,000 annually.",
    "- Authored comprehensive technical documentation, architecture decision records, and API contracts used by 200 developers.",
    "",
    "### CloudScale Systems — Mountain View, CA",
    "Senior Software Engineer | Mar 2017 – Dec 2020",
    "- Developed high-throughput REST and gRPC microservices in Python and Go supporting 12 million active mobile subscribers.",
    "- Designed automated database partitioning and archival strategy in PostgreSQL managing over 18 terabytes of transactional records.",
    "- Collaborated with product managers and site reliability engineers to maintain 99.99% uptime service level agreements.",
    "- Built real-time analytics streaming pipelines using Apache Flink and Kafka processing 5 billion events each month.",
    "- Cut continuous integration build and test execution durations by 65% by migrating Jenkins pipelines to GitHub Actions runners.",
    "- Improved automated test suite coverage from 52% to 88% across 14 core backend microservices repositories.",
    "- Resolved complex thread deadlock and memory leak issues in production Java runtime environments under high traffic load.",
    "- Partnered with security compliance teams to achieve SOC 2 Type II certification and implement role-based access control.",
    "- Coordinated quarterly disaster recovery simulation exercises ensuring recovery point objective under 5 minutes.",
    "- Integrated third-party payment gateways including Stripe and PayPal processing $85M in annual merchant transactions.",
    "",
    "### DataFlow Technologies — Seattle, WA",
    "Software Engineer | Jul 2014 – Feb 2017",
    "- Built web application backend services using Python, Django, and PostgreSQL for customer relationship management platform.",
    "- Engineered automated ETL pipelines extracting customer behavioral signals from MySQL replicas into centralized data lakes.",
    "- Designed responsive frontend dashboards using React, JavaScript, and HTML5 for internal account management teams.",
    "- Reduced API response latency from 450ms to 120ms by implementing Redis caching and database indexing optimizations.",
    "- Authored over 400 comprehensive unit, integration, and end-to-end test cases with pytest and Selenium frameworks.",
    "- Participated in daily standups, sprint estimation, and code reviews within an Agile Scrum team of 7 software engineers.",
    "- Configured automated deployment scripts in Ansible and Docker for staging and production web application environments.",
    "- Maintained customer-facing developer documentation and interactive API references using Swagger and OpenAPI specifications.",
    "",
    "### Innovatech Labs — Austin, TX",
    "Associate Software Engineer | Jun 2012 – Jun 2014",
    "- Developed internal administrative tools and monitoring scripts in Python and Bash for server maintenance tasks.",
    "- Assisted senior database administrators with schema migrations, index creation, and backup restoration procedures.",
    "- Investigated and resolved over 250 bug tickets reported by QA engineers and external beta testers.",
    "- Implemented automated log parsing utilities to detect unusual error spikes in production Apache web servers.",
    "- Collaborated with UX designers to translate wireframes and user flow diagrams into functioning web interfaces.",
    "",
    "## Education",
    "### University of California, Berkeley",
    "B.Sc. in Computer Science and Engineering | Graduated May 2012",
    "- Magna Cum Laude honors, GPA 3.85 / 4.00",
    "- Coursework: Operating Systems, Distributed Systems, Database Management Systems, Computer Networks, Compilers, Algorithms",
    "",
    "## Certifications & Training",
    "- AWS Certified Solutions Architect – Professional (Amazon Web Services)",
    "- Certified Kubernetes Administrator (CKA, Cloud Native Computing Foundation)",
    "- HashiCorp Certified: Terraform Associate",
    "",
    "## Key Open Source & Publications",
    "- Contributor to open-source Go telemetry and distributed tracing libraries with over 4,500 GitHub stars.",
    "- Speaker at GopherCon 2022 on high-throughput streaming patterns and memory optimization techniques in Go runtimes.",
    "- Published technical whitepaper on zero-downtime database migration strategies in modern cloud architectures.",
  ];

  const narrative = [
    "### Technical Leadership and Organizational Impact",
    "Throughout her professional tenure at Acme Corporation, CloudScale Systems, and DataFlow Technologies, Jane has consistently championed rigorous software engineering methodologies and operational excellence across distributed engineering departments.",
    "She pioneered the establishment of centralized technical architecture review boards, defining concrete guidelines for microservice decomposition, backward-compatible API versioning, schema migration safety, and database connection pooling across multi-region cloud deployments.",
    "Her architectural governance models eliminated recurring cross-service dependency deadlocks and standardized observability metrics, telemetry instrumentation, and distributed request tracing throughout twenty-five distinct engineering squads.",
    "Jane actively structured and facilitated company-wide technical lunch-and-learn presentations, mentoring over forty junior and mid-level software engineers in effective concurrency management, memory allocation profiling, and distributed systems consensus protocols.",
    "Her intentional focus on automated testing culture and continuous deployment hygiene led to a four-fold increase in daily production deployment frequency while concurrently driving production rollback incidents down to near-zero levels.",
    "She collaborated extensively with product managers, UX designers, security compliance officers, and legal teams to establish clear technical requirements, data privacy protections under GDPR and CCPA regulations, and resilient disaster recovery strategies.",
    "In recognition of her proactive mentorship, architectural vision, and cross-functional leadership, she was awarded the Acme Engineering Excellence Trophy and selected as keynote presenter for annual internal technical summits.",
    "",
    "### Selected Architectural Case Studies and Engineering Initiatives",
    "Case Study 1: Global Event Ingestion Architecture at Scale.",
    "Faced with exponential customer data growth, Jane spearheaded the end-to-end redesign of the core telemetry ingestion backbone.",
    "The previous architecture suffered from severe throttling bottlenecks, high disk I/O wait times, and frequent message queue backpressure during peak holiday shopping traffic surges.",
    "By transitioning from synchronous HTTP batching to an asynchronous partitioned Kafka pipeline with consumer worker pools written in Go, the system achieved a sustained throughput of fifty thousand events per second with sub-ten-millisecond queue latency.",
    "This architectural overhaul reduced primary compute node footprints by forty percent, yielding substantial monthly cloud infrastructure cost savings while elevating overall system availability to four nines.",
    "",
    "Case Study 2: Zero-Downtime Multi-Terabyte Database Migration.",
    "At CloudScale Systems, the primary PostgreSQL transactional database reached critical capacity limits, processing over eighteen terabytes of active customer transaction records.",
    "Jane designed and executed a multi-phase database sharding and archival strategy that segregated historical cold records into cost-effective Amazon S3 object storage while retaining warm active records in high-performance NVMe storage partitions.",
    "The entire migration was orchestrated using logical replication, shadow table dual-writing, and zero-downtime DNS cutovers without dropping a single active customer transaction or impacting consumer-facing SLA commitments.",
    "",
    "Case Study 3: Enterprise Microservice Security and Identity Modernization.",
    "Recognizing the vulnerabilities inherent in perimeter-based network security, Jane architected a comprehensive Zero Trust service mesh architecture utilizing mTLS authentication and Open Policy Agent authorization rules across internal Kubernetes clusters.",
    "Her implementation ensured cryptographic verification of all inter-service remote procedure calls, enforced fine-grained role-based access control, and provided automated audit logging compliant with rigorous SOC 2 Type II and ISO 27001 security standards.",
    "The modernized identity framework eliminated long-lived shared credentials, streamlined developer onboarding, and successfully passed multiple third-party penetration audits without any critical or high-severity vulnerabilities identified.",
    "",
    "### Additional Projects and Early Engineering Research",
    "Undergraduate Research in High-Performance Distributed Systems at UC Berkeley.",
    "During her senior undergraduate tenure at the University of California, Berkeley, Jane participated in cutting-edge computer science research focused on lock-free concurrent data structures and cache coherence protocols under high multiprocessor contention.",
    "Her honors thesis examined throughput degradation mechanisms in multi-threaded hash tables and proposed an adaptive epoch-based memory reclamation algorithm that achieved twenty-eight percent faster lock-free traversal speeds under synthetic memory stress benchmarks.",
    "She presented her findings at the Northern California Undergraduate Research Symposium and co-authored an academic workshop paper evaluating scalable garbage collection latencies across distributed memory nodes.",
    "This foundational research in concurrent algorithms directly informed her subsequent industry contributions to distributed transaction handling, non-blocking network I/O, and zero-copy packet processing pipelines.",
    "Open Source Contributions and Developer Community Engagement.",
    "Jane is a passionate advocate for open source software, developer education, and transparent engineering tools.",
    "She is an active maintainer of popular community libraries for Go telemetry instrumentation, distributed rate limiting, and Kubernetes custom resource controllers, accumulating over four thousand five hundred GitHub stars and three million lifetime container pulls.",
    "She has delivered technical presentations and hands-on workshops at international software conferences, including GopherCon, KubeCon, and AWS re:Invent, discussing memory profiling techniques, microsecond latency troubleshooting, and zero-downtime database sharding.",
    "She regularly organizes community code walkthroughs and mentors prospective software engineering fellows from non-traditional and underrepresented educational backgrounds.",
    "",
    "### Professional Philosophy and Continuous Innovation",
    "Jane firmly believes that enduring software engineering excellence requires balanced investments across people, technical architecture, and operational rigor.",
    "She cultivates an engineering environment characterized by psychological safety, high intellectual curiosity, and rigorous peer review where engineers are empowered to experiment responsibly.",
    "By continuously monitoring emerging cloud-native computing trends, distributed storage primitives, and runtime performance optimizations, she ensures that organizational engineering roadmaps remain competitive, cost-effective, and resilient to rapid industry changes.",
    "Her overarching professional commitment and dedication to collaborative engineering team practices continues to deliver transformative business value, high customer satisfaction, and exceptional organizational agility.",
  ];

  const fullLines = [...sections, "", ...narrative];
  const text = fullLines.join("\n");
  const words = text.split(/\s+/).filter(Boolean);

  return { text, lines: fullLines, wordCount: words.length };
}

describe("Performance grounding suite (perf.test.ts)", () => {
  it("checks 40 edits against a 1,700-word resume in under 1 second (target < 20 ms / edit)", () => {
    const { text, wordCount } = generate1700WordResume();
    expect(wordCount, "Resume must be at least 1,700 words").toBeGreaterThanOrEqual(1700);

    // Build index ONCE
    const indexStart = performance.now();
    const sourceIndex = buildSourceIndex([text]);
    const indexDuration = performance.now() - indexStart;

    console.log(`Source Resume: ${wordCount} words across ${sourceIndex.lines.size} indexed lines`);
    console.log(`Index build time: ${indexDuration.toFixed(2)} ms`);

    // Helper to find exact line number of target substring
    const findLine = (needle: string): number => {
      for (const line of sourceIndex.linesList) {
        if (line.raw.includes(needle)) return line.lineNum;
      }
      throw new Error(`Needle not found in resume: ${needle}`);
    };

    // Prepare 40 test edits (20 honest, 20 invented)
    const edits: Array<{ after: string; needle: string; kind: "legit" | "invented" }> = [
      // 20 Honest rewrites
      { needle: "multi-tenant event processing pipeline in Go", after: "Architected and deployed a multi-tenant event processing pipeline in Golang handling 50,000 events per second backed by Kafka and PostgreSQL.", kind: "legit" },
      { needle: "Reduced invoice latency by 38%", after: "Cut invoice latency by 38 percent through Redis caching layer and optimized SQL query execution plans.", kind: "legit" },
      { needle: "budget of $4M across AWS", after: "Managed an annual cloud infrastructure budget of $4 million across AWS and Google Cloud Platform environments.", kind: "legit" },
      { needle: "squad of 8 senior software engineers", after: "Led a cross-functional squad of 8 senior software engineers across 3 time zones to deliver enterprise authentication services.", kind: "legit" },
      { needle: "monolithic billing service to 6 decoupled", after: "Migrated legacy monolithic billing service to 6 decoupled Go microservices without customer-facing downtime.", kind: "legit" },
      { needle: "OpenTelemetry and Jaeger reducing mean time", after: "Implemented end-to-end distributed tracing using OpenTelemetry and Jaeger reducing detection time from 45 minutes to 8 minutes.", kind: "legit" },
      { needle: "rate-limiting middleware in Redis", after: "Designed resilient rate-limiting middleware in Redis protecting critical checkout endpoints from DDoS traffic surges.", kind: "legit" },
      { needle: "Mentored 12 junior and mid-level", after: "Mentored 12 junior and mid-level software engineers through structured pair programming.", kind: "legit" },
      { needle: "reducing ec2 provisioning costs by $320,000", after: "Spearheaded company-wide container migration to Amazon EKS reducing ec2 provisioning costs by $320k annually.", kind: "legit" },
      { needle: "Authored comprehensive technical documentation", after: "Authored comprehensive technical documentation, architecture decision records, and API contracts.", kind: "legit" },
      { needle: "12 million active mobile subscribers", after: "Developed high-throughput REST and gRPC microservices in Python and Go supporting 12 million active mobile subscribers.", kind: "legit" },
      { needle: "managing over 18 terabytes of transactional", after: "Designed automated database partitioning and archival strategy in Postgres managing over 18 terabytes of transactional records.", kind: "legit" },
      { needle: "maintain 99.99% uptime service level", after: "Collaborated with product managers and site reliability engineers to maintain 99.99% uptime service level agreements.", kind: "legit" },
      { needle: "processing 5 billion events each month", after: "Built real-time analytics streaming pipelines using Apache Flink and Kafka processing 5 billion events each month.", kind: "legit" },
      { needle: "durations by 65% by migrating", after: "Cut continuous integration build and test execution durations by 65 percent by migrating Jenkins pipelines to GitHub Actions runners.", kind: "legit" },
      { needle: "Improved automated test suite coverage from 52% to 88%", after: "Improved automated test suite coverage from 52% to 88% across 14 backend microservices repositories.", kind: "legit" },
      { needle: "achieve SOC 2 Type II certification", after: "Partnered with security compliance teams to achieve SOC 2 Type II certification.", kind: "legit" },
      { needle: "recovery point objective under 5 minutes", after: "Coordinated quarterly disaster recovery simulation exercises ensuring recovery point objective under 5 minutes.", kind: "legit" },
      { needle: "processing $85M in annual merchant", after: "Integrated third-party payment gateways including Stripe and PayPal processing $85 million in annual merchant transactions.", kind: "legit" },
      { needle: "B.Sc. in Computer Science and Engineering", after: "Bachelor of Science in Computer Science and Engineering from University of California, Berkeley", kind: "legit" },

      // 20 Invented edits
      { needle: "multi-tenant event processing pipeline in Go", after: "Architected and deployed a multi-tenant event processing pipeline in Cerner handling 50,000 events per second.", kind: "invented" },
      { needle: "Staff Software Engineer | Jan 2021 – Present", after: "Staff Software Engineer at Google | Jan 2021 – Present", kind: "invented" },
      { needle: "Reduced invoice latency by 38%", after: "Reduced invoice latency by 75% through Redis caching layer.", kind: "invented" },
      { needle: "budget of $4M across AWS", after: "Managed an annual cloud infrastructure budget of $25M across AWS and Google Cloud Platform.", kind: "invented" },
      { needle: "squad of 8 senior software engineers", after: "Led a cross-functional squad of 40 senior software engineers.", kind: "invented" },
      { needle: "monolithic billing service to 6 decoupled", after: "Migrated legacy monolithic billing service to 25 decoupled Go microservices.", kind: "invented" },
      { needle: "monolithic billing service to 6 decoupled", after: "Architected billing platform which drove $1.8M in cost savings.", kind: "invented" },
      { needle: "rate-limiting middleware in Redis", after: "Designed resilient rate-limiting middleware for a global conglomerate.", kind: "invented" },
      { needle: "Mentored 12 junior and mid-level", after: "Mentored 100 junior and mid-level software engineers.", kind: "invented" },
      { needle: "Acme Corporation — San Francisco, CA", after: "Vice President of Engineering at Acme Corporation", kind: "invented" },
      { needle: "12 million active mobile subscribers", after: "Developed high-throughput REST and gRPC microservices in Rust supporting 12 million active mobile subscribers.", kind: "invented" },
      { needle: "managing over 18 terabytes of transactional", after: "Designed automated database partitioning in Oracle WMS.", kind: "invented" },
      { needle: "maintain 99.99% uptime service level", after: "Single-handedly maintained 99.99% uptime service level agreements.", kind: "invented" },
      { needle: "processing 5 billion events each month", after: "Built streaming pipelines resulting in 90% revenue increase.", kind: "invented" },
      { needle: "durations by 65% by migrating", after: "Cut build duration by 95% using CircleCI.", kind: "invented" },
      { needle: "Improved automated test suite coverage from 52% to 88%", after: "Raised test coverage to 100% across all repositories.", kind: "invented" },
      { needle: "achieve SOC 2 Type II certification", after: "Certified Information Systems Security Professional (CISSP) certified engineer.", kind: "invented" },
      { needle: "processing $85M in annual merchant", after: "Processed $500M in annual merchant transactions.", kind: "invented" },
      { needle: "B.Sc. in Computer Science and Engineering", after: "Master of Science (M.Sc.) in Computer Science from UC Berkeley", kind: "invented" },
      { needle: "processing $85M in annual merchant", after: "Architected payment platform in Tableau for Fortune 500 clients.", kind: "invented" },
    ];

    expect(edits).toHaveLength(40);

    // Run all 40 edits using the pre-built index
    const checkStart = performance.now();
    let checksRun = 0;
    let legitPassed = 0;
    let inventedCaught = 0;

    for (const edit of edits) {
      const lineNum = findLine(edit.needle);
      const res = checkGrounding(sourceIndex, edit.after, { cites: [lineNum] });
      checksRun++;
      if (edit.kind === "legit") {
        if (res.flags.length === 0) legitPassed++;
      } else {
        if (res.flags.length > 0) inventedCaught++;
      }
    }

    const totalCheckDuration = performance.now() - checkStart;
    const avgPerEdit = totalCheckDuration / checksRun;

    console.log(`Executed ${checksRun} checks in ${totalCheckDuration.toFixed(2)} ms (avg ${avgPerEdit.toFixed(2)} ms / edit)`);
    console.log(`Legitimate rewrites allowed: ${legitPassed} / 20`);
    console.log(`Invented rewrites caught:   ${inventedCaught} / 20`);

    // Assert accuracy
    expect(inventedCaught, "Must catch 100% of invented edits").toBe(20);
    expect(legitPassed, "Must pass at least 19/20 legit edits").toBeGreaterThanOrEqual(19);

    // Performance assertions
    expect(totalCheckDuration, "40 edits must run in < 1,000 ms").toBeLessThan(1000);
    expect(avgPerEdit, "Average edit check must be < 20 ms").toBeLessThan(20);
  });
});
