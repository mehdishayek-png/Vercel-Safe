const prompt = `A user is proposing the following 3 fixes to the Job Matching Engine to address the false positives matching entry-level Customer Experience Agents to Technical Account Managers or Managers.

Proposed Plan:
1. Fix 1 — Move 'technical account manager' and 'tam ' from 'cx_support' to 'solutions_architecture' in ROLE_FAMILIES.
2. Fix 2 — Add the inverse depth check: shallow candidate + deep job -> apply shallowPenalty.
3. Fix 3 — Raise seniorityCapThreshold from 0.1 to 0.3 so a 7yr-gap "reaching up" (multiplier ~0.25) triggers the hard cap at 30 instead of sailing through.

Proposed Code Diff for Fix 1:
-    cx_support: ['customer experience', 'customer success', 'customer support', 'cx ', 'csm', 'technical account manager', 'tam ', 'support specialist', 'customer care', 'client success', 'customer operations', 'product support'],
+    cx_support: ['customer experience', 'customer success', 'customer support', 'cx ', 'csm', 'support specialist', 'customer care', 'client success', 'customer operations', 'product support'],
(Assuming 'technical account manager' and 'tam ' are added to solutions_architecture).

Please review this plan. Does it look okay? Are there any potential unintended side effects, edge cases, or better alternatives? Should any changes be made before pushing this code?`;

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
