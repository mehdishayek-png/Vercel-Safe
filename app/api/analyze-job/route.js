import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { job, profile, apiKeys } = await request.json();

        // Check for OpenRouter Key First
        const openRouterKey = apiKeys?.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
        const openAiKey = apiKeys?.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

        let apiUrl = 'https://api.openai.com/v1/chat/completions';
        let apiKey = openAiKey;
        let model = 'gpt-4o-mini';
        let headers = {
            'Content-Type': 'application/json',
        };

        if (openRouterKey) {
            apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
            apiKey = openRouterKey;
            model = 'openai/gpt-4o-mini'; // Explicit OpenRouter model ID
            headers['HTTP-Referer'] = 'https://jobbot.vercel.app'; // Required by OpenRouter
            headers['X-Title'] = 'JobBot';
        }

        if (!apiKey) {
            console.error('Analysis failed: Missing API Key (OpenAI or OpenRouter)');
            return NextResponse.json({ error: 'API key missing. Please check your settings.' }, { status: 400 });
        }

        headers['Authorization'] = `Bearer ${apiKey}`;

        console.log(`[Analysis] Starting analysis using ${openRouterKey ? 'OpenRouter' : 'OpenAI'} for job: ${job.title}`);

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

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model,
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
