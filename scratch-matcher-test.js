import { calculatePandaScore } from './lib/panda-matcher.js';

async function runTest() {
  const profile = {
    title: 'Senior Frontend Engineer',
    skills: ['React', 'Next.js', 'TypeScript', 'Node.js', 'TailwindCSS'],
    experience_years: 5,
    location: 'Bangalore'
  };

  const preferences = {
    city: 'Bangalore',
    country: 'India',
    location: 'Bangalore, India',
    remoteOnly: false
  };

  const jobs = [
    {
      id: 1,
      title: 'Frontend Engineer',
      summary: 'We need someone with deep React and TypeScript experience. Node.js is a plus.', // Changed to summary
      location: 'Bangalore',
      experienceRequired: 3
    },
    {
      id: 2,
      title: 'Backend Developer',
      summary: 'Java Spring Boot and PostgreSQL required. React is nice to have.',
      location: 'Remote',
      experienceRequired: 5
    },
    {
      id: 3,
      title: 'Senior Software Engineer (Fullstack)',
      summary: 'Lead our Next.js and Node transition. Must know Tailwind and PostgreSQL.',
      location: 'Bangalore, India',
      experienceRequired: 5
    },
    {
      id: 4,
      title: 'Marketing Manager',
      summary: 'Looking for an SEO specialist to run our LinkedIn campaigns.',
      location: 'Bangalore',
      experienceRequired: 2
    }
  ];

  console.log('--- RUNNING PANDA MATCHER TESTS ---\n');
  for (const job of jobs) {
    console.log(`Evaluating Job: ${job.title}...`);
    try {
        const result = await calculatePandaScore(job, profile, preferences);
        console.log(`\tScore: ${result.score}`);
        console.log(`\tRaw Base: ${result.raw}`);
        console.log(`\tMatches: ${result.matches.map(m => m.skill).join(', ')}`);
        console.log(`\tMultipliers: JSON ${JSON.stringify(result.multipliers)}`);
    } catch (e) {
        console.log(`\tError: ${e.message}`);
    }
    console.log('------------------------------------');
  }
}

runTest();
