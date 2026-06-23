const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const CLOUD_ID = '806e70f1-2657-44d4-8a09-fdf3874aad06';
const JIRA_BASE = `https://api.atlassian.com/ex/jira/${CLOUD_ID}`;
const AUTH = 'Basic ' + Buffer.from(
  `${process.env.JIRA_EMAIL}:${process.env.JIRA_TOKEN}`
).toString('base64');

const PODS = ['CHC', 'SUP', 'DSCVR', 'CPOST', 'APP', 'DATA', 'SRE', 'SDET', 'OV', 'BI'];

async function fetchSprintIssues(project) {
  const jql = `project = ${project} AND sprint in openSprints() ORDER BY issuetype ASC, created ASC`;
  const fields = 'summary,issuetype,status,assignee,parent,priority';
  const url = `${JIRA_BASE}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=200`;
  const response = await fetch(url, {
    headers: { 'Authorization': AUTH, 'Accept': 'application/json' }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

app.get('/api/sprint', async (req, res) => {
  try {
    const project = req.query.project || 'CHC';
    const data = await fetchSprintIssues(project);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/all-sprints', async (req, res) => {
  const results = await Promise.allSettled(
    PODS.map(project =>
      fetchSprintIssues(project)
        .then(data => ({ project, issues: data.issues || [] }))
        .catch(e => ({ project, issues: [], error: e.message }))
    )
  );
  res.json(results.map(r => r.value || { project: '?', issues: [], error: 'Unknown error' }));
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FNP Sprint Hub running on port ${PORT}`));