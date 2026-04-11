export const PREMIUM_STARTUPS = [
    { name: 'Anthropic', url: 'anthropic.com' },
    { name: 'OpenAI', url: 'openai.com' },
    { name: 'Mistral', url: 'mistral.ai' },
    { name: 'Cohere', url: 'cohere.com' },
    { name: 'Pinecone', url: 'pinecone.io' },
    { name: 'LangChain', url: 'langchain.com' },
    { name: 'ElevenLabs', url: 'elevenlabs.io' },
    { name: 'PolyAI', url: 'polyai.com' },
    { name: 'Hume AI', url: 'hume.ai' },
    { name: 'Deepgram', url: 'deepgram.com' },
    { name: 'Vapi', url: 'vapi.ai' },
    { name: 'Retool', url: 'retool.com' },
    { name: 'Airtable', url: 'airtable.com' },
    { name: 'Vercel', url: 'vercel.com' },
    { name: 'Temporal', url: 'temporal.io' },
    { name: 'Glean', url: 'glean.com' },
    { name: 'Arize AI', url: 'arize.com' },
    { name: 'Langfuse', url: 'langfuse.com' },
    { name: 'Weights & Biases', url: 'wandb.ai' },
    { name: 'Cognigy', url: 'cognigy.com' },
    { name: 'Linear', url: 'linear.app' },
    { name: 'Scale AI', url: 'scale.com' },
    { name: 'Hugging Face', url: 'huggingface.co' },
    { name: 'Perplexity', url: 'perplexity.ai' },
    { name: 'Midjourney', url: 'midjourney.com' },
    { name: 'Replicate', url: 'replicate.com' }
];

export const getPremiumStartupSearchQueries = (baseQuery) => {
    // Return an array of combined search queries, chunked to not exceed search limits
    // e.g. "Software Engineer (Anthropic OR OpenAI OR Mistral OR ...)"
    const chunks = [];
    const chunkSize = 5;
    
    for (let i = 0; i < PREMIUM_STARTUPS.length; i += chunkSize) {
        const chunk = PREMIUM_STARTUPS.slice(i, i + chunkSize);
        const companyStr = chunk.map(c => `"${c.name}"`).join(' OR ');
        chunks.push(`${baseQuery} AND (${companyStr})`);
    }
    
    return chunks;
};
