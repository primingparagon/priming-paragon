const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

app.post("/crm/new-contact", (req,res) => {
  const { email, name } = req.body;
  // In prod: push to HubSpot/CRM or write into CRM DB
  console.log("New CRM contact:", email, name);
  res.json({status:"ok"});
});

app.get("/health", (req,res) => res.json({status:"ok", service:"crm-service"}));

const port = process.env.PORT || 4500;
app.listen(port, () => console.log(`CRM service listening on ${port}`));
