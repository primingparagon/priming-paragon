import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes.js";

dotenv.config();
const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/", routes);

// Health Endpoint (Render requires this!)
app.get('/health', (req, res) => res.json({status: 'ok', service: 'api-gateway'}));
app.get('/', (req, res) => res.send('api-gateway running'));

app.listen(port, () => console.log(`api-gateway listening on ${port}`));
