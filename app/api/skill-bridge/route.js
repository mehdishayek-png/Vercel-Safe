import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

/**
 * POST /api/skill-bridge
 *
 * Analyzes skill gaps between user profile and a target job.
 * Returns skill breakdown with gap percentages and bridge actions.
 */
export async function POST(request) {
    try {
        const { userId } = await auth();

        // Rate limit: 10 requests per minute
        const rateLimitId = userId || request.headers.get('x-forwarded-for') || 'anonymous';
        const rl = await rateLimit(rateLimitId + ':skill-bridge', 10, 60);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: `Too many requests. Try again in ${rl.retryAfter} seconds.` },
                { status: 429 }
            );
        }

        const { profile, targetJob } = await request.json();

        if (!profile || !profile.skills || profile.skills.length === 0) {
            return NextResponse.json({ error: 'Profile with skills required' }, { status: 400 });
        }

        // Extract required skills from job description/title
        const jobSkills = extractJobSkills(targetJob);
        const userSkills = new Set(profile.skills.map(s => s.toLowerCase()));

        // Calculate skill gaps
        const analysis = jobSkills.map(skill => {
            const normalizedSkill = skill.toLowerCase();
            const hasSkill = userSkills.has(normalizedSkill) ||
                [...userSkills].some(us => normalizedSkill.includes(us) || us.includes(normalizedSkill));

            // Estimate proficiency based on profile context
            let level;
            if (hasSkill) {
                // Scale by years of experience
                const years = profile.experience_years || 0;
                level = Math.min(100, 60 + Math.floor(years * 4) + Math.floor(Math.random() * 15));
            } else {
                // Adjacent skill detection — partial overlap
                const adjacentScore = [...userSkills].reduce((best, us) => {
                    const overlap = computeOverlap(us, normalizedSkill);
                    return Math.max(best, overlap);
                }, 0);
                level = Math.floor(adjacentScore * 50); // 0-50 for related skills
            }

            const target = 100;
            const gap = level - target;
            return {
                name: skill,
                level: Math.max(0, Math.min(100, level)),
                target,
                gap: Math.min(0, gap),
                status: level >= 85 ? 'met' : 'gap',
            };
        });

        // Sort: gaps first, then met
        analysis.sort((a, b) => {
            if (a.status !== b.status) return a.status === 'gap' ? -1 : 1;
            return a.gap - b.gap;
        });

        // Calculate core match percentage
        const coreMatch = analysis.length > 0
            ? Math.round(analysis.reduce((sum, s) => sum + s.level, 0) / analysis.length)
            : 0;

        // Generate bridge actions
        const gapSkills = analysis.filter(s => s.status === 'gap');
        const bridgeActions = generateBridgeActions(gapSkills, targetJob);

        // Estimate timeline
        const totalGap = gapSkills.reduce((sum, s) => sum + Math.abs(s.gap), 0);
        const estimatedWeeks = Math.max(1, Math.round(totalGap / 30 * 1.5));

        return NextResponse.json({
            skills: analysis.slice(0, 8),
            coreMatch,
            bridgeActions,
            estimatedWeeks,
            targetTitle: targetJob?.title || 'Target Role',
            targetCompany: targetJob?.company || 'Target Company',
        });
    } catch (err) {
        console.error('Skill bridge error:', err);
        return NextResponse.json({ error: 'Failed to analyze skills' }, { status: 500 });
    }
}

function extractJobSkills(job) {
    if (!job) {
        return ['System Design', 'Cloud Architecture', 'Team Leadership', 'Data Analysis', 'Communication'];
    }

    const text = [job.title, job.description, job.summary].filter(Boolean).join(' ').toLowerCase();

    // Common skill patterns to extract
    const skillPatterns = [
        'react', 'typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++',
        'node.js', 'next.js', 'vue', 'angular', 'svelte',
        'aws', 'gcp', 'azure', 'docker', 'kubernetes',
        'postgresql', 'mongodb', 'redis', 'elasticsearch',
        'machine learning', 'deep learning', 'nlp', 'computer vision',
        'system design', 'distributed systems', 'microservices',
        'ci/cd', 'devops', 'terraform', 'infrastructure',
        'agile', 'scrum', 'product management',
        'data analysis', 'sql', 'data engineering', 'etl',
        'leadership', 'communication', 'collaboration',
        'figma', 'design systems', 'ui/ux', 'accessibility',
        'security', 'authentication', 'encryption',
        'api design', 'graphql', 'rest', 'grpc',
        'testing', 'tdd', 'ci', 'automation',
    ];

    const found = skillPatterns.filter(skill => text.includes(skill));

    // Also extract from title keywords
    const titleWords = (job.title || '').split(/[\s,/]+/).filter(w => w.length > 2);
    const titleSkills = titleWords
        .filter(w => !['and', 'the', 'for', 'with', 'senior', 'junior', 'lead', 'staff', 'principal', 'head', 'director', 'manager'].includes(w.toLowerCase()))
        .slice(0, 3)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1));

    const combined = [...new Set([...found.map(s => s.charAt(0).toUpperCase() + s.slice(1)), ...titleSkills])];
    return combined.length > 0 ? combined.slice(0, 8) : ['System Design', 'Cloud Architecture', 'Team Leadership', 'Data Analysis', 'Communication'];
}

function computeOverlap(a, b) {
    // Simple Jaccard-like overlap for skill similarity
    const setA = new Set(a.split(/[\s\-_/]+/));
    const setB = new Set(b.split(/[\s\-_/]+/));
    const intersection = [...setA].filter(x => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
}

function generateBridgeActions(gapSkills, job) {
    const actions = [];
    const topGaps = gapSkills.slice(0, 3);

    topGaps.forEach((skill, i) => {
        if (i === 0) {
            actions.push({
                type: 'course',
                icon: 'TrendingUp',
                title: `Advanced ${skill.name} Training`,
                description: `Bridge the ${skill.gap}% gap in ${skill.name} with a focused deep-dive program.`,
                tag: 'SUGGESTED COURSE',
                action: 'View Syllabus',
            });
        } else if (i === 1) {
            actions.push({
                type: 'project',
                icon: 'Code2',
                title: `Build: ${skill.name} Portfolio Project`,
                description: `Implementation project to demonstrate mastery of ${skill.name} concepts.`,
                tag: 'PROJECT TO BUILD',
                action: 'Download Specs',
            });
        } else {
            actions.push({
                type: 'mentorship',
                icon: 'Users',
                title: `Peer Review: ${skill.name}`,
                description: `Connect with professionals who specialize in ${skill.name} for an architectural review.`,
                tag: null,
                action: 'Request Introduction',
            });
        }
    });

    return actions;
}
