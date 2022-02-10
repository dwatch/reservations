require('dotenv').config()
const express = require('express');
const api = require('./api_router.js')

//Setting up Server
const port = process.env.PORT
const app = express();
app.use(express.json());
app.listen(port, () => {
  console.log(`Listening on port ${port}.`);
});

//Setting up Endpoints
app.use("/", api)