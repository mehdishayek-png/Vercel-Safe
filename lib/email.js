import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = 'Midas Match <notifications@midasmatch.com>';
const SUPPORT_EMAIL = 'midasmatchsupport@gmail.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://midasmatch.com';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function warn(msg) {
  console.warn(`[email] ${msg}`);
}

function noKey() {
  warn('RESEND_API_KEY is not set — skipping email send');
  return { success: false, error: 'RESEND_API_KEY not configured' };
}

async function send({ to, subject, html, text }) {
  if (!resend) return noKey();
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      warn(`Resend API error: ${error.message}`);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  } catch (err) {
    warn(`Failed to send email: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Shared layout
// ---------------------------------------------------------------------------

function layout(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <tr>
        <td style="background-color:#4f46e5;padding:24px 32px;">
          <span style="font-size:22px;font-weight:bold;color:#ffffff;text-decoration:none;">Midas Match</span>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:32px;">
          ${bodyContent}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="padding:24px 32px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;line-height:1.6;">
          You're receiving this because you signed up for Midas Match.<br>
          <a href="${APP_URL}/unsubscribe" style="color:#71717a;text-decoration:underline;">Unsubscribe</a><br><br>
          Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#4f46e5;">${SUPPORT_EMAIL}</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function ctaButton(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#4f46e5;border-radius:6px;padding:12px 28px;">
      <a href="${href}" style="color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;display:inline-block;">${label}</a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// 1. Welcome Email
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(to, firstName) {
  const name = firstName || 'there';
  const subject = 'Welcome to Midas Match!';

  const html = layout(`
<h1 style="margin:0 0 16px;font-size:24px;color:#18181b;">Welcome, ${name}!</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
  We're excited to have you on board. Midas Match helps you find jobs that truly fit your skills and experience — no more endless scrolling.
</p>
<p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#18181b;">Get started in 3 easy steps:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
  <tr>
    <td style="padding:8px 12px 8px 0;vertical-align:top;">
      <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:bold;">1</span>
    </td>
    <td style="padding:8px 0;font-size:15px;color:#3f3f46;line-height:1.5;">
      <strong>Upload your resume</strong> — we'll extract your skills and experience automatically.
    </td>
  </tr>
  <tr>
    <td style="padding:8px 12px 8px 0;vertical-align:top;">
      <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:bold;">2</span>
    </td>
    <td style="padding:8px 0;font-size:15px;color:#3f3f46;line-height:1.5;">
      <strong>Run a scan</strong> — we search hundreds of company career pages for openings.
    </td>
  </tr>
  <tr>
    <td style="padding:8px 12px 8px 0;vertical-align:top;">
      <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:bold;">3</span>
    </td>
    <td style="padding:8px 0;font-size:15px;color:#3f3f46;line-height:1.5;">
      <strong>Review your matches</strong> — each job is scored on how well it fits you.
    </td>
  </tr>
</table>
${ctaButton('Go to your dashboard', `${APP_URL}/search`)}
<p style="margin:0;font-size:14px;color:#71717a;">Happy job hunting!</p>
`);

  const text = `Welcome, ${name}!

We're excited to have you on board. Midas Match helps you find jobs that truly fit your skills and experience.

Get started in 3 easy steps:
1. Upload your resume — we'll extract your skills and experience automatically.
2. Run a scan — we search hundreds of company career pages for openings.
3. Review your matches — each job is scored on how well it fits you.

Go to your dashboard: ${APP_URL}/search

Happy job hunting!
`;

  return send({ to, subject, html, text });
}

// ---------------------------------------------------------------------------
// 2. Application Confirmation
// ---------------------------------------------------------------------------

export async function sendApplicationConfirmation(to, firstName, job) {
  const name = firstName || 'there';
  const title = job?.title || 'a position';
  const company = job?.company || 'a company';
  const source = job?.source || '';
  const link = job?.url || job?.link || '';
  const subject = `Applied: ${title} at ${company}`;

  const sourceRow = source
    ? `<tr><td style="padding:4px 0;font-size:14px;color:#71717a;">Source</td><td style="padding:4px 0 4px 12px;font-size:14px;color:#3f3f46;">${source}</td></tr>`
    : '';
  const linkRow = link
    ? `<tr><td style="padding:4px 0;font-size:14px;color:#71717a;">Listing</td><td style="padding:4px 0 4px 12px;font-size:14px;"><a href="${link}" style="color:#4f46e5;text-decoration:underline;">View job posting</a></td></tr>`
    : '';

  const html = layout(`
<h1 style="margin:0 0 16px;font-size:24px;color:#18181b;">Nice work, ${name}!</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
  You marked <strong>${title}</strong> at <strong>${company}</strong> as applied. We've logged it in your applications tracker.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;border:1px solid #e4e4e7;border-radius:6px;padding:16px;">
  <tr><td style="padding:4px 0;font-size:14px;color:#71717a;">Position</td><td style="padding:4px 0 4px 12px;font-size:14px;color:#3f3f46;font-weight:bold;">${title}</td></tr>
  <tr><td style="padding:4px 0;font-size:14px;color:#71717a;">Company</td><td style="padding:4px 0 4px 12px;font-size:14px;color:#3f3f46;">${company}</td></tr>
  ${sourceRow}
  ${linkRow}
</table>
<p style="margin:0 0 4px;font-size:14px;color:#3f3f46;line-height:1.6;">
  <strong>Good luck!</strong> Fingers crossed for this one.
</p>
<p style="margin:0 0 20px;font-size:13px;color:#71717a;line-height:1.5;padding:12px;background-color:#f4f4f5;border-radius:6px;">
  💡 <strong>Tip:</strong> Follow up in 1–2 weeks if you haven't heard back. A short, polite check-in can make a real difference.
</p>
${ctaButton('View your applications', `${APP_URL}/applied`)}
`);

  const text = `Nice work, ${name}!

You marked "${title}" at ${company} as applied. We've logged it in your applications tracker.

Position: ${title}
Company: ${company}${source ? `\nSource: ${source}` : ''}${link ? `\nListing: ${link}` : ''}

Good luck! Fingers crossed for this one.

Tip: Follow up in 1-2 weeks if you haven't heard back. A short, polite check-in can make a real difference.

View your applications: ${APP_URL}/applied
`;

  return send({ to, subject, html, text });
}

// ---------------------------------------------------------------------------
// 3. Weekly Digest
// ---------------------------------------------------------------------------

export async function sendWeeklyDigest(to, firstName, stats) {
  const name = firstName || 'there';
  const { newMatches = 0, savedCount = 0, appliedCount = 0, topJobs = [] } = stats || {};
  const subject = 'Your weekly Midas Match report';
  const hasActivity = newMatches > 0 || savedCount > 0 || appliedCount > 0;

  let jobRows = '';
  if (topJobs.length > 0) {
    jobRows = topJobs
      .slice(0, 3)
      .map(
        (j) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
          <span style="font-size:15px;font-weight:bold;color:#18181b;">${j.title || 'Untitled'}</span><br>
          <span style="font-size:13px;color:#71717a;">${j.company || ''}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;text-align:right;vertical-align:top;">
          <span style="display:inline-block;background-color:${(j.score || 0) >= 80 ? '#22c55e' : (j.score || 0) >= 60 ? '#eab308' : '#ef4444'};color:#ffffff;font-size:13px;font-weight:bold;padding:4px 10px;border-radius:12px;">${j.score || 0}%</span>
        </td>
      </tr>`
      )
      .join('');
  }

  const noActivityBlock = `
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
  No new matches this week. Try updating your profile or running a new scan to discover fresh opportunities.
</p>`;

  const activityBlock = `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;">
  <tr>
    <td style="text-align:center;padding:16px;background-color:#f0f0ff;border-radius:6px;">
      <span style="font-size:28px;font-weight:bold;color:#4f46e5;">${newMatches}</span><br>
      <span style="font-size:12px;color:#71717a;">New Matches</span>
    </td>
    <td style="width:12px;"></td>
    <td style="text-align:center;padding:16px;background-color:#f0f0ff;border-radius:6px;">
      <span style="font-size:28px;font-weight:bold;color:#4f46e5;">${savedCount}</span><br>
      <span style="font-size:12px;color:#71717a;">Saved</span>
    </td>
    <td style="width:12px;"></td>
    <td style="text-align:center;padding:16px;background-color:#f0f0ff;border-radius:6px;">
      <span style="font-size:28px;font-weight:bold;color:#4f46e5;">${appliedCount}</span><br>
      <span style="font-size:12px;color:#71717a;">Applied</span>
    </td>
  </tr>
</table>
${topJobs.length > 0 ? `
<p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#18181b;">Top matches for you:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;">
  ${jobRows}
</table>` : ''}`;

  const html = layout(`
<h1 style="margin:0 0 16px;font-size:24px;color:#18181b;">Your weekly report</h1>
<p style="margin:0 0 20px;font-size:15px;color:#3f3f46;line-height:1.6;">
  Hi ${name}, here's your job search summary for the past week.
</p>
${hasActivity ? activityBlock : noActivityBlock}
${ctaButton('Go to dashboard', `${APP_URL}/search`)}
`);

  const topJobsText = topJobs
    .slice(0, 3)
    .map((j) => `  - ${j.title || 'Untitled'} at ${j.company || '?'} (${j.score || 0}% match)`)
    .join('\n');

  const text = `Your weekly report

Hi ${name}, here's your job search summary for the past week.

${hasActivity ? `New Matches: ${newMatches}
Saved: ${savedCount}
Applied: ${appliedCount}${topJobsText ? `\n\nTop matches:\n${topJobsText}` : ''}` : 'No new matches this week. Try updating your profile or running a new scan to discover fresh opportunities.'}

Go to dashboard: ${APP_URL}/search
`;

  return send({ to, subject, html, text });
}

// ---------------------------------------------------------------------------
// 4. Scan Complete
// ---------------------------------------------------------------------------

export async function sendScanComplete(to, firstName, stats) {
  const name = firstName || 'there';
  const { totalMatches = 0, topScore = 0, topJob = {} } = stats || {};
  const subject = `Scan complete: ${totalMatches} matches found`;
  const topTitle = topJob?.title || 'Untitled';
  const topCompany = topJob?.company || '';

  const html = layout(`
<h1 style="margin:0 0 16px;font-size:24px;color:#18181b;">Your scan is done, ${name}!</h1>
<p style="margin:0 0 20px;font-size:15px;color:#3f3f46;line-height:1.6;">
  We searched hundreds of career pages and found <strong>${totalMatches} job${totalMatches !== 1 ? 's' : ''}</strong> that match your profile.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;border:1px solid #e4e4e7;border-radius:6px;overflow:hidden;">
  <tr>
    <td style="padding:20px;background-color:#f0f0ff;">
      <span style="font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Top Match</span><br>
      <span style="font-size:18px;font-weight:bold;color:#18181b;">${topTitle}</span><br>
      ${topCompany ? `<span style="font-size:14px;color:#71717a;">${topCompany}</span><br>` : ''}
      <span style="display:inline-block;margin-top:8px;background-color:#4f46e5;color:#ffffff;font-size:13px;font-weight:bold;padding:4px 12px;border-radius:12px;">${topScore}% match</span>
    </td>
  </tr>
</table>
<p style="margin:0 0 4px;font-size:14px;color:#3f3f46;line-height:1.6;">
  Head over to your dashboard to review all matches, save the ones you like, and start applying.
</p>
${ctaButton('View your matches', `${APP_URL}/search`)}
`);

  const text = `Your scan is done, ${name}!

We searched hundreds of career pages and found ${totalMatches} job${totalMatches !== 1 ? 's' : ''} that match your profile.

Top Match: ${topTitle}${topCompany ? ` at ${topCompany}` : ''} (${topScore}% match)

Head over to your dashboard to review all matches, save the ones you like, and start applying.

View your matches: ${APP_URL}/search
`;

  return send({ to, subject, html, text });
}
