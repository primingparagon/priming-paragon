const express = require('express');
const httpProxy = require('http-proxy');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
const proxy = httpProxy.createProxyServer({});
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).end();
  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).end();
  }
}

app.get('/health', (req,res) => res.json({status:'ok', service:'api-gateway'}));

app.use('/auth', (req,res) => {
  proxy.web(req, res, { target: 'http://auth-service:4000' });
});

app.use('/tutor', authMiddleware, (req,res) => {
  proxy.web(req, res, { target: 'http://tutoring-engine:8000' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API Gateway listening on ${port}`));
