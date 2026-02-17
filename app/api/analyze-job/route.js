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
            model = 'anthropic/claude-3.5-sonnet'; // Claude 3.5 Sonnet - Best reasoning for career-critical decisions
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
        Experience Years: ${profile.experience_years || 'Not specified'}
        Skills: ${profile.skills.join(', ')}
        
        Job Description:
        Title: ${job.title}
        Company: ${job.company}
        Location: ${job.location}
        Summary: ${job.summary || job.description}
        
        CRITICAL INSTRUCTIONS - READ CAREFULLY:
        
        1. **BRUTAL EXPERIENCE GAP RULE**: 
           - If job requires MORE than 5 years beyond candidate's experience, set "fit_score" = 20.
           - Example: Job needs "15+ years", candidate has 4 years → fit_score = 20.
           - Example: Job needs "10+ years", candidate has 5 years → fit_score = 30.
           - Example: Job needs "8+ years", candidate has 5 years → fit_score = 50.
        
        2. **SENIORITY CHECK**: 
           - If job title contains "Senior", "Sr.", "Lead", "Director", "VP", "Principal" AND candidate has <8 years → fit_score MUST be <40.
        
        3. **FIT SCORE SCALE**: 
           - 80-100: Perfect match (Skills + Experience aligned).
           - 60-79: Good match (Minor gaps, 1-2 year experience difference OK).
           - 40-59: Weak match (Noticeable gaps).
           - 0-39: REJECT (Experience gap >5 years, wrong seniority, or irrelevant).

        Output JSON ONLY:
        {
            "fit_score": 85, // Integer 0-100.
            "strong_signals": ["Signal 1", "Signal 2"], // Specific skills/exp that match well
            "gaps": ["Gap 1"], // Missing skills or requirements (be gentle but honest)
            "salary_estimate": "Estimated Ranges (e.g. $120k - $150k)", // Estimate based on role/location/company tiers
            "verdict": "One sentence summary of why they should apply (or why NOT)."
        }
        `;


        // Build request body
        const requestBody = {
            model: model,
            messages: [{ role: 'user', content: prompt }]
        };

        // Only add response_format for OpenAI models (Gemini doesn't support it)
        if (!openRouterKey || model.includes('gpt')) {
            requestBody.response_format = { type: "json_object" };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
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
