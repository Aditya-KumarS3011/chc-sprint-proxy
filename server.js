const express = require('express');
const path = require('path');

const app = express();

// Serve frontend from /public — no CORS needed, same origin
app.use(express.static(path.join(__dirname, 'public')));

// Use environment variable for Cloud ID, or fallback to hardcoded
const CLOUD_ID = process.env.JIRA_CLOUD_ID || '806e70f1-2657-44d4-8a09-fdf3874aad06';
const JIRA_DOMAIN = process.env.JIRA_DOMAIN; // e.g., 'yourcompany.atlassian.net'

// Function to get the correct Jira base URL
function getJiraBase() {
  if (JIRA_DOMAIN) {
    return `https://${JIRA_DOMAIN}`;
  }
  return `https://api.atlassian.com/ex/jira/${CLOUD_ID}`;
}

const AUTH = 'Basic ' + Buffer.from(
  `${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`
).toString('base64');

app.get('/api/sprint', async (req, res) => {
  try {
    const project = req.query.project || 'CHC';
    const jql = `project = ${project} AND sprint in openSprints() ORDER BY issuetype ASC, created ASC`;
    const fields = 'summary,issuetype,status,assignee,parent,priority';
    const JIRA_BASE = getJiraBase();
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
        url: JIRA_BASE
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