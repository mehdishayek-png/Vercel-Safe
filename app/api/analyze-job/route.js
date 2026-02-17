import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { job, profile, apiKeys } = await request.json();
        const apiKey = apiKeys?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'OpenAI API key required' }, { status: 400 });
        }

        const prompt = `
        Role: Expert Career Coach & Recruiter.
        Task: Analyze the fit between a candidate and a job description.
        
        Candidate Profile:
        Headline: ${profile.headline}
        Skills: ${profile.skills.join(', ')}
        
        Job Description:
        Title: ${job.title}
        Company: ${job.company}
        Location: ${job.location}
        Summary: ${job.summary || job.description}
        
        Output JSON ONLY:
        {
            "strong_signals": ["Signal 1", "Signal 2"], // Specific skills/exp that match well
            "gaps": ["Gap 1"], // Missing skills or requirements (be gentle but honest)
            "salary_estimate": "Estimated Ranges (e.g. $120k - $150k)", // Estimate based on role/location/company tiers
            "verdict": "One sentence summary of why they should apply."
        }
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Faster/Cheaper model for UI interactions
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const analysis = JSON.parse(data.choices[0].message.content);

        return NextResponse.json({ analysis });

    } catch (error) {
        console.error('Analysis error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
