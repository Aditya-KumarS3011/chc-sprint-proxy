const express = require('express');
const path = require('path');

const app = express();

// Serve frontend from /public — no CORS needed, same origin
app.use(express.static(path.join(__dirname, 'public')));

const CLOUD_ID = '806e70f1-2657-44d4-8a09-fdf3874aad06';
const JIRA_BASE = `https://api.atlassian.com/ex/jira/${CLOUD_ID}`;
const AUTH = 'Basic ' + Buffer.from(
  `${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`
).toString('base64');

app.get('/api/sprint', async (req, res) => {
  try {
    const project = req.query.project || 'CHC';
    const jql = `project = ${project} AND sprint in openSprints() ORDER BY issuetype ASC, created ASC`;
    const fields = 'summary,issuetype,status,assignee,parent,priority';
    const url = `${JIRA_BASE}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=100`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': AUTH, 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Jira API error', status: response.status });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CHC Sprint Proxy running on port ${PORT}`));