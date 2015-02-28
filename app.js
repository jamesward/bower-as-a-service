var express = require("express");
var bower = require("bower");
var tmp = require("tmp");
var archiver = require("archiver");
var endpointParser = require("bower-endpoint-parser");
var PackageRepository = require("bower/lib/core/PackageRepository");
var defaultConfig = require("bower/lib/config");
var Logger = require('bower-logger');

var app = express();

app.set("port", (process.env.PORT || 5000));

app.get("/search", function(req, res) {
  bower.commands.search().on("end", function(data) {
    res.json(data);
  });
});

app.get("/info/:package/:version", function(req, res) {
  var endpoint = req.params.package + "#" + req.params.version;

  var logger = new Logger();
  var decEndpoint = endpointParser.decompose(endpoint);
  var config = defaultConfig();
  var repository = new PackageRepository(config, logger);

  repository.fetch(decEndpoint).spread(function (canonicalDir, pkgMeta) {
    res.json(pkgMeta).end();
  });
});

app.get("/download/:package/:version", function(req, res) {
  tmp.dir({"unsafeCleanup": true}, function(err, tmpDir) {
    if (err) throw err;

    var packageName = req.params.package;

    var endpoint = packageName + "#" + req.params.version;

    bower.commands.install([endpoint], {}, {cwd: tmpDir})
      .on("end", function (data) {
        var dir = data[packageName].canonicalDir;

        var archive = archiver("zip");

        archive.on("error", function (err) {
          return res.status(500).send({error: err.message}).end();
        });

        res.on("close", function () {
          return res.status(200).send("OK").end();
        });

        res.attachment(packageName + ".zip");

        archive.pipe(res);

        archive.directory(dir, false);

        archive.finalize();
      })
      .on("error", function (data) {
        res.status(500).send(data).end();
      });
  });
});

app.listen(app.get("port"), function() {
  console.log("Node app is running at localhost:" + app.get("port"));
});