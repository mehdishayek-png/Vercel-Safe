import { calculatePandaScore } from '../lib/panda-matcher.js';

const today = new Date().toISOString().slice(0,10);
const prefs_blr = { city: 'bengaluru', country: 'in' };

// ── PROFILES ─────────────────────────────────────────────────────────────────
const profiles = {
    sanmitra: {
        headline: 'Senior Software Developer',
        skills: ['Java', 'Python', 'JavaScript', 'SQL', 'Spring Boot', 'React', 'Angular', 'Node.js', 'AWS', 'Docker', 'Grafana', 'ETL', 'Apache Airflow'],
        experience_years: 6,
        location: 'Bengaluru, India',
    },
    mehdi: {
        headline: 'AI Product Operations & Workflow Automation Specialist',
        skills: ['Workato', 'Zendesk', 'Okta', 'SSO', 'IAM', 'LLM', 'Python', 'automation', 'incident management'],
        experience_years: 5,
        location: 'Bengaluru, India',
    },
    jayanth: {
        headline: 'Game Designer',
        skills: ['Unity', 'Unreal Engine', 'system design', 'economy design', 'game design', 'F2P', 'live ops', 'narrative design'],
        experience_years: 5,
        location: 'Bengaluru, India',
    },
    gilles: {
        headline: 'Senior Project Coordinator',
        skills: ['workflow coordination', 'quality control', 'asset management', 'Microsoft Excel', 'Google Sheets', 'subtitle editing', 'vendor management'],
        experience_years: 8,
        location: 'Bengaluru, India',
    },
    tanish: {
        headline: 'Production Manager',
        skills: ['video production', 'production management', 'scheduling', 'team management', 'quality control', 'Microsoft Excel', 'OBS', 'content production'],
        experience_years: 4,
        location: 'Bengaluru, India',
    },
};

// ── TEST CASES ────────────────────────────────────────────────────────────────
const tests = [
    // === SANMITRA (Senior SW Dev) ===
    { profile: 'sanmitra', label: 'GOOD: Sr SW Engineer @ Atlassian',
      job: { title: 'Senior Software Engineer', company: 'Atlassian', location: 'Bengaluru, India', date_posted: today,
             summary: 'Build scalable backend services with Java, Spring Boot, SQL. Experience with AWS, Docker, REST APIs. Grafana monitoring. ETL pipelines. Agile/Scrum team.' }},
    { profile: 'sanmitra', label: 'GOOD: Full Stack Dev @ Razorpay',
      job: { title: 'Full Stack Developer', company: 'Razorpay', location: 'Bengaluru, India', date_posted: today,
             summary: 'React and Node.js fullstack development. Python data pipelines, ETL workflows, REST APIs. Docker and AWS deployment. Grafana dashboards for monitoring.' }},
    { profile: 'sanmitra', label: 'GOOD: Data Engineer @ Swiggy',
      job: { title: 'Data Engineer', company: 'Swiggy', location: 'Bengaluru, India', date_posted: today,
             summary: 'Design and build ETL pipelines using Apache Airflow, Python, SQL. Column-oriented databases BigQuery and Redshift. AWS S3 integration. Java backend services.' }},
    { profile: 'sanmitra', label: 'WRONG: CX Manager @ Zepto',
      job: { title: 'Customer Experience Manager', company: 'Zepto', location: 'Bengaluru, India', date_posted: today,
             summary: 'Manage customer support operations. Zendesk, Workato automation. SLA compliance, client relationships. B2B enterprise accounts.' }},
    { profile: 'sanmitra', label: 'WRONG: Civil Engineer @ L&T',
      job: { title: 'Civil Site Engineer', company: 'L&T', location: 'Bengaluru, India', date_posted: today,
             summary: 'Structural analysis, site supervision, quantity surveying. STAAD Pro, AutoCAD. Construction project management. Civil engineering degree required.' }},

    // === MEHDI (AI Product Ops) ===
    { profile: 'mehdi', label: 'GOOD: AI Product Ops @ OpenAI',
      job: { title: 'AI Product Operations Manager', company: 'OpenAI', location: 'Bengaluru, India', date_posted: today,
             summary: 'Manage AI product operations and LLM workflow automation for enterprise clients. Workato, Zendesk. SSO and IAM administration using Okta. P0/P1 incident management, RCA, SLA ownership.' }},
    { profile: 'mehdi', label: 'GOOD: CX Automation @ Stripe',
      job: { title: 'Customer Experience & Automation Specialist', company: 'Stripe', location: 'Bengaluru, India', date_posted: today,
             summary: 'Build automation workflows using Workato and Zendesk. Manage enterprise CX operations. Okta SSO administration. AI product validation and beta testing. Incident lifecycle management.' }},
    { profile: 'mehdi', label: 'GOOD: Technical Account Manager @ MongoDB',
      job: { title: 'Technical Account Manager', company: 'MongoDB', location: 'Bengaluru, India', date_posted: today,
             summary: 'Own Fortune 500 client relationships via Slack Connect. SSO and IAM troubleshooting. SLA ownership, RCA, post-mortems. Zendesk. Automation experience preferred.' }},
    { profile: 'mehdi', label: 'PARTIAL: Product Manager @ Startup',
      job: { title: 'Product Manager', company: 'Slintel', location: 'Bengaluru, India', date_posted: today,
             summary: 'Drive product roadmap for B2B SaaS. Work with engineering on AI features. LLM integration experience a plus. Cross-functional stakeholder management.' }},
    { profile: 'mehdi', label: 'WRONG: Civil Engineer @ L&T',
      job: { title: 'Civil Site Engineer', company: 'L&T', location: 'Bengaluru, India', date_posted: today,
             summary: 'Structural analysis, site supervision, quantity surveying. STAAD Pro, AutoCAD. Construction project management.' }},

    // === JAYANTH (Game Designer) ===
    { profile: 'jayanth', label: 'GOOD: Game Designer @ Nazara',
      job: { title: 'Game Designer', company: 'Nazara Games', location: 'Bengaluru, India', date_posted: today,
             summary: 'Design F2P mobile game systems and economy design. Live ops feature design. Unity. Design documents and tuning sheets. Player engagement and monetization. Narrative design.' }},
    { profile: 'jayanth', label: 'GOOD: System Designer @ Zynga',
      job: { title: 'System Designer', company: 'Zynga', location: 'Bengaluru, India', date_posted: today,
             summary: 'Design game systems and economies for mobile F2P titles. Live ops feature design. Spec documentation and tuning sheets. Unreal Engine. Collaborate with product managers on feature design.' }},
    { profile: 'jayanth', label: 'PARTIAL: UX Designer @ Flipkart',
      job: { title: 'UX Designer', company: 'Flipkart', location: 'Bengaluru, India', date_posted: today,
             summary: 'Product UX design for mobile apps. User research, wireframes, Figma. Game UI and UX design experience a bonus. System thinking required.' }},
    { profile: 'jayanth', label: 'WRONG: Software Engineer @ Google',
      job: { title: 'Software Engineer', company: 'Google', location: 'Bengaluru, India', date_posted: today,
             summary: 'Backend distributed systems engineering, Python, Go, Java, Kubernetes. ML pipeline infrastructure. Data engineering.' }},

    // === GILLES (Sr Project Coordinator) ===
    { profile: 'gilles', label: 'GOOD: Project Coordinator @ Netflix Localization',
      job: { title: 'Project Coordinator', company: 'Netflix Localization', location: 'Bengaluru, India', date_posted: today,
             summary: 'Coordinate localization and subtitle editing workflows. Quality control, asset delivery and management, client communication. Microsoft Excel reporting. Vendor management.' }},
    { profile: 'gilles', label: 'GOOD: Media Ops Manager @ Deluxe',
      job: { title: 'Media Operations Manager', company: 'Deluxe Entertainment', location: 'Bengaluru, India', date_posted: today,
             summary: 'Manage post-production operations, workflow coordination, quality assurance. Asset management, subtitle editing and QC. Client specifications compliance. Vendor communication.' }},
    { profile: 'gilles', label: 'PARTIAL: Operations Manager @ Generic',
      job: { title: 'Operations Manager', company: 'TA Digital', location: 'Bengaluru, India', date_posted: today,
             summary: 'Manage operations team, workflow coordination, quality control. Microsoft Excel and Google Sheets reporting. Client communication and vendor management.' }},
    { profile: 'gilles', label: 'WRONG: Software Engineer @ Google',
      job: { title: 'Software Engineer', company: 'Google', location: 'Bengaluru, India', date_posted: today,
             summary: 'Java backend engineering, distributed systems, AWS Lambda, microservices, CI/CD pipelines. Python scripting.' }},

    // === TANISH (Production Manager) ===
    { profile: 'tanish', label: 'GOOD: Production Manager @ Prime Video',
      job: { title: 'Production Manager', company: 'Prime Video Studios', location: 'Bengaluru, India', date_posted: today,
             summary: 'Manage video production team, scheduling, shoot coordination. Client communication and feedback handling. Quality control oversight. OBS live streaming operator. Content production for brand clients.' }},
    { profile: 'tanish', label: 'GOOD: Content Producer @ Amazon Live',
      job: { title: 'Content Producer', company: 'Amazon Live', location: 'Bengaluru, India', date_posted: today,
             summary: 'Produce and manage video content production. Schedule shoots, coordinate production teams. Live streaming production using OBS. Brand client management. Content scheduling.' }},
    { profile: 'tanish', label: 'PARTIAL: Junior PM @ London studio (wrong location)',
      job: { title: 'Junior Production Manager', company: 'Met Film', location: 'London, UK', date_posted: today,
             summary: 'Assist production management for film and TV projects. Scheduling, team coordination, quality control. London-based studio. Production management experience required.' }},
    { profile: 'tanish', label: 'WRONG: Data Analyst @ Accenture',
      job: { title: 'Data Analyst', company: 'Accenture', location: 'Bengaluru, India', date_posted: today,
             summary: 'SQL, Python, Excel, Power BI. Business analytics, dashboard creation, KPI reporting. Financial modelling.' }},
];

// ── RUN ───────────────────────────────────────────────────────────────────────
const results = await Promise.all(tests.map(t =>
    calculatePandaScore(t.job, profiles[t.profile], prefs_blr)
));

// ── PRINT ─────────────────────────────────────────────────────────────────────
let currentProfile = '';
tests.forEach((t, i) => {
    const r = results[i];
    if (t.profile !== currentProfile) {
        currentProfile = t.profile;
        console.log(`\n${'='.repeat(70)}`);
        console.log(`PROFILE: ${t.profile.toUpperCase()}`);
        console.log('='.repeat(70));
    }
    const skills = (r.matches || []).map(m => m.skill).join(', ') || 'none';
    const warn = r.score > 60 && t.label.startsWith('WRONG') ? ' ⚠️ SHOULD BE LOWER' :
                 r.score < 50 && t.label.startsWith('GOOD') ? ' ⚠️ SHOULD BE HIGHER' : '';
    console.log(`[${String(r.score).padStart(3)}] ${t.label}${warn}`);
    console.log(`      skills:[${skills}] | sen:${r.multipliers.seniority} loc:${r.multipliers.location} role:${r.multipliers.roleFamily} dom:${r.multipliers.domain}(${r.multipliers.domainDetail})`);
});
