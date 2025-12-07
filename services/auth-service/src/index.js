const express = require('express');
require('dotenv').config();
const app = express();

app.get('/health', (req, res) => res.json({status: 'ok', service: 'auth-service'}));

// Example root endpoint
app.get('/', (req, res) => res.send('auth-service running'));

const port = process.env.PORT || 4001;
app.listen(port, () => console.log(`auth-service listening on ${port}`));
