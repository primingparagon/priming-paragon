const express = require('express');
require('dotenv').config();
const app = express();

app.get('/health', (req, res) => res.json({status: 'ok', service: 'assessment-service'}));
app.get('/', (req, res) => res.send('assessment-service running'));

const port = process.env.PORT || 7006;
app.listen(port, () => console.log(`assessment-service listening on ${port}`));
