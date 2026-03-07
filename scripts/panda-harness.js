/**
 * PANDA HARNESS: Stress Test & Balancing Script
 * Evaluates the panda-matcher against 100 job listings for multiple profiles.
 */

import fs from 'fs';
import { calculatePandaScore } from '../lib/panda-matcher.js';

const MOCK_PROFILES = [
    {
        name: 'The Mid-Level Game Designer',
        headline: 'Senior Game Designer | Systems & Economy',
        experience_years: 5,
        skills: ['Unity', 'Unreal Engine', 'C#', 'Game Design', 'Level Design', 'Systems Design', 'Economy Design', 'LiveOps']
    },
    {
        name: 'The Intern/Fresher',
        headline: 'Junior Web Developer',
        experience_years: 0.5,
        skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Git']
    },
    {
        name: 'The Keyword Spammer',
        headline: 'Lead Software Engineer',
        experience_years: 8,
        skills: ['Java', 'Python', 'C++', 'Ruby', 'Go', 'Rust', 'JavaScript', 'TypeScript', 'PHP', 'Swift', 'Kotlin', 'SQL', 'NoSQL', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD']
    },
    {
        name: 'The Relocation Hopeful',
        headline: 'Mid-Level Game Designer',
        experience_years: 3,
        skills: ['Unity', 'C#', 'Level Design']
    },
    {
        name: 'The Unrelated Expert',
        headline: 'Senior Data Scientist',
        experience_years: 7,
        skills: ['Python', 'Machine Learning', 'AI', 'TensorFlow', 'Data Mining']
    }
];

// Sample job data for testing
const SAMPLE_JOBS = [
    {
        title: 'Senior Game Designer (Economy)',
        company: 'Zomato',
        summary: 'Looking for a Senior Game Designer to build economy systems for our new project. Expertise in Unity and C# required.',
        location: 'Bengaluru, India',
        date_posted: new Date().toISOString()
    },
    {
        title: 'Game Design Intern',
        company: 'Black March Studios',
        summary: 'Join our team as an intern. Learn Unity and C# while building mobile games.',
        location: 'Remote',
        date_posted: new Date().toISOString()
    },
    {
        title: 'Full Stack Engineer',
        company: 'Meta',
        summary: 'Build high-performance web apps with React and Node.js. Experience with AWS is a plus.',
        location: 'California, US',
        date_posted: new Date(Date.now() - 20 * 86400000).toISOString() // 20 days old
    },
    {
        title: 'Senior 소프트웨어 엔지니어 (System Architect)', // Mixed scripts simulation
        company: 'TechCorp Korea',
        summary: '안녕하세요. We are hiring a Senior Engineer for our global platform.',
        location: 'Seoul, South Korea',
        date_posted: new Date().toISOString()
    },
    {
        title: 'Entry Level Data Analyst',
        company: 'Obscure Startup',
        summary: 'We need someone who knows Python, SQL, and Machine Learning algorithms.',
        location: 'Remote',
        date_posted: new Date(Date.now() - 2 * 86400000).toISOString() // 2 days old
    },
    {
        title: 'Senior Game Designer',
        company: 'Ubisoft', // Not in F500 array, testing baseline
        summary: 'Lead game design. Requires Unity.',
        location: 'Montreal, Canada',
        date_posted: new Date().toISOString()
    }
];

async function runHarness() {
    console.log('🐼 Starting Project Panda Stress Test Harness...');
    const results = [];

    for (const profile of MOCK_PROFILES) {
        console.log(`\nTesting Profile: ${profile.name}`);
        for (const job of SAMPLE_JOBS) {
            const analysis = await calculatePandaScore(job, profile, { city: 'Bengaluru', country: 'India' });

            results.push({
                profile: profile.name,
                job: job.title,
                score: analysis.score,
                multipliers: JSON.stringify(analysis.multipliers)
            });

            console.log(`- Job: ${job.title.padEnd(30)} | Score: ${analysis.score.toString().padStart(3)} | Multipliers: ${JSON.stringify(analysis.multipliers)}`);
        }
    }

    // Save to CSV
    const csvHeader = 'Profile,Job,Score,Multipliers\n';
    const csvRows = results.map(r => `"${r.profile}","${r.job}",${r.score},"${r.multipliers.replace(/"/g, '""')}"`).join('\n');
    fs.writeFileSync('./panda_analysis.csv', csvHeader + csvRows);
    console.log('\n📊 Results saved to panda_analysis.csv');
}

runHarness().catch(console.error);
