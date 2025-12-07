const express = require('express');
require('dotenv').config();
const app = express();

app.get('/health', (req, res) => res.json({status: 'ok', service: 'crm-service'}));
app.get('/', (req, res) => res.send('crm-service running'));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`crm-service listening on ${port}`));
