const fs = require('fs');
const content = fs.readFileSync('lib/panda-matcher.js', 'utf8');
const prompt = `Please summarize and explain what the following code does overall:\n\n${content}`;

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
