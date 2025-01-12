require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const dns = require("dns");
const { URL } = require("url");

// connect to mongoDb Atlas
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI);

// define schema
const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
  },
  short_url: {
    type: String,
    required: true,
  },
});
const Url = mongoose.model("Url", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

// add middleware to parse request body
app.use("/api/shorturl", bodyParser.urlencoded({ extended: false }));

// handle post request
app.post("/api/shorturl", async (req, res) => {
  // get the count of records in database
  let docLastNumber;
  try {
    docLastNumber = await Url.countDocuments();
  } catch (err) {
    console.error(err);
    res.json({
      error: "cannot get count of documents",
    });
    return;
  }

  // get the original_url
  const originalUrl = req.body.url;
  let hostname;
  try {
    const parsedURL = new URL(originalUrl);
    hostname = parsedURL.hostname;
  } catch (err) {
    console.error(err);
    res.json({
      error: "invalid url",
    });
    return;
  }

  // check original_url dns
  dns.lookup(hostname, async (err) => {
    if (err) {
      console.error(err);
      res.json({
        error: "invalid url",
      });
      return;
    }

    // query the url in database
    try {
      const urlFindOneRes = await Url.findOne({
        original_url: originalUrl,
      });

      // in case exist, respond the result
      res.json({
        original_url: urlFindOneRes.original_url,
        short_url: urlFindOneRes.short_url,
      });
    } catch (err) {
      // in case not exist, add a record
      const url = new Url({
        original_url: originalUrl,
        short_url: docLastNumber + 1,
      });

      try {
        const urlSaveRes = await url.save();

        res.json({
          original_url: urlSaveRes.original_url,
          short_url: urlSaveRes.short_url,
        });
      } catch (err) {
        res.send(err);
        return console.error(err);
      }
    }
  });
});

// handle get request
app.get("/api/shorturl/:shortUrl", async (req, res) => {
  const shortUrl = req.params.shortUrl;

  // query for short_url
  try {
    const urlFindOneRes = await Url.findOne({
      short_url: shortUrl,
    });

    // in case short_url exists, redirect to original_url
    res.redirect(urlFindOneRes.original_url);
  } catch (err) {
    // in case short_url does not exist, return response
    res.json({
      error: "No short URL found for the given input",
    });
    return console.error(err);
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
