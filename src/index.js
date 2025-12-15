const express = require('express');
const mongoose = require("mongoose");

const routerReceiveData = require('./receiveNewDetail/module');
const routerQueryData = require('./getQuery/module');

const app = express();

mongoose
  .connect(process.env.MONGODBURL)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.use(routerReceiveData);
app.use(routerQueryData);

app.listen(3000, () => console.log("Listening on port 3000"));