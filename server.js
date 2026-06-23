const express = require('express');
const path = require('path');

const app = express();

// Serve frontend from /public — no CORS needed, same origin
app.use(express.static(path.join(__dirname, 'public')));

// Jira domain is required - set JIRA_DOMAIN env variable (e.g., 'yourcompany.atlassian.net')
const JIRA_DOMAIN = process.env.JIRA_DOMAIN;

if (!JIRA_DOMAIN) {
  console.error('ERROR: JIRA_DOMAIN environment variable is required');
  console.error('Set it to your Jira domain, e.g., yourcompany.atlassian.net');
}

const JIRA_BASE = JIRA_DOMAIN ? `https://${JIRA_DOMAIN}` : null;
const AUTH = 'Basic ' + Buffer.from(
  `${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`
).toString('base64');

app.get('/api/sprint', async (req, res) => {
  try {
    if (!JIRA_BASE) {
      return res.status(500).json({ 
        error: 'Configuration error',
        message: 'JIRA_DOMAIN environment variable is not set'
      });
    }

    const project = req.query.project || 'CHC';
    const jql = `project = ${project} AND sprint in openSprints() ORDER BY issuetype ASC, created ASC`;
    const fields = 'summary,issuetype,status,assignee,parent,priority';
    const url = `${JIRA_BASE}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=100`;

    console.log(`Fetching from: ${JIRA_BASE}/rest/api/3/search`);
    console.log(`Project: ${project}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': AUTH, 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jira API error ${response.status}:`, errorText);
      return res.status(response.status).json({ 
        error: 'Jira API error', 
        status: response.status,
        message: errorText,
        domain: JIRA_DOMAIN
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CHC Sprint Proxy running on port ${PORT}`));