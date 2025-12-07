const express = require('express');
require('dotenv').config();
const app = express();

app.get('/health', (req, res) => res.json({status: 'ok', service: 'audit-log-service'}));
app.get('/', (req, res) => res.send('audit-log-service running'));

const port = process.env.PORT || 7005;
app.listen(port, () => console.log(`audit-log-service listening on ${port}`));
