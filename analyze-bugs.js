const fs = require('fs');
const content = fs.readFileSync('lib/panda-matcher.js', 'utf8');
const prompt = `Read the following code for a job matching engine and identify potential bugs or logic errors that could result in bad matches. 
Specifically, address this issue: "When searching for an entry-level Customer Experience Agent, I sometimes get matches for Customer Experience Manager or Technical Account Manager." 
How does the code handle (or fail to handle) these distinctions in seniority and role depth within the same role family? Which parts of the code are causing this false positive overlap?

Code:
${content}
`;

fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'gemma4:26b',
        prompt: prompt,
        stream: false
    })
})
.then(res => res.json())
.then(data => console.log(data.response))
.catch(err => console.error(err));
