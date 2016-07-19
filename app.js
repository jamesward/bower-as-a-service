var express = require("express");
var NodeCache = require( "node-cache" );
var cache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });
var Q = require("q");
var Logger = require('bower-logger');
var logger = new Logger();

var app = express();

app.set("port", (process.env.PORT || 5000));

app.get("/search", function(req, res) {
  var bower = require("bower");
  bower.commands.search().on("end", function(data) {
    res.json(data).end();
  });
});


function fetchBasicBowerInfo(packageName) {
  var info = require("bower/lib/commands/info");
  return info(logger, packageName);
}

function fetchDetailedBowerInfo(packageName, version) {
  var endpoint = packageName + "#" + version;

  var endpointParser = require("bower-endpoint-parser");
  var PackageRepository = require("bower/lib/core/PackageRepository");
  var defaultConfig = require("bower/lib/config");

  var decEndpoint = endpointParser.decompose(endpoint);
  var config = defaultConfig();
  var repository = new PackageRepository(config, logger);

  return repository.fetch(decEndpoint).spread(function (canonicalDir, pkgMeta) {
    return pkgMeta;
  });
}

function fetchBowerInfo(packageName, version) {
  return (version == undefined) ? fetchBasicBowerInfo(packageName) : fetchDetailedBowerInfo(packageName, version);
}

function getBowerInfo(packageName, version) {
  var endpoint = packageName + "#" + version;
  var cacheKey = "info:" + endpoint;
  var maybeInfoPromise = cache.get(cacheKey);
  if (maybeInfoPromise != undefined) {
    return maybeInfoPromise;
  }
  else {
    var bowerInfoPromise = fetchBowerInfo(packageName, version);
    bowerInfoPromise.catch(function() {
      cache.del(cacheKey);
    });
    cache.set(cacheKey, bowerInfoPromise);
    return bowerInfoPromise;
  }
}

app.get("/info/:package/:version?", function(req, res) {
  getBowerInfo(req.params.package, req.params.version)
    .then(function(data) {
      res.json(data).end();
    })
    .catch(function(error) {
      res.status(500).send(error).end();
    });
});


function fetchBowerDownload(packageName, version) {
  var tmp = require("tmp");

  return Q.nfcall(tmp.dir, {"unsafeCleanup": true}).spread(function(tmpDir) {
    var endpoint = packageName + "#" + version;
    var install = require("bower/lib/commands/install");
    return install(logger, [endpoint], {forceLatest: true, production: true}, {cwd: tmpDir});
  });
}

function getBowerDownload(packageName, version) {
  var endpoint = packageName + "#" + version;
  var cacheKey = "download:" + endpoint;
  var maybeDownloadPromise = cache.get(cacheKey);
  if (maybeDownloadPromise != undefined) {
    return maybeDownloadPromise;
  }
  else {
    var downloadPromise = fetchBowerDownload(packageName, version);
    downloadPromise.catch(function() {
      cache.del(cacheKey);
    });
    cache.set(cacheKey, downloadPromise);
    return downloadPromise;
  }
}

app.get("/download/:package/:version", function(req, res) {
  var packageName = req.params.package;
  var version = req.params.version;

  getBowerInfo(packageName, version).then(function(packageInfo) {
    return getBowerDownload(packageName, version)
      .then(function (installInfo) {
        // the installInfo uses the metadata name
        var dir = installInfo[packageInfo.name].canonicalDir;
        var archiver = require("archiver");
        var archive = archiver("zip");
        archive.directory(dir, false);

        archive.on("error", function (err) {
          res.status(500).send({error: err.message}).end();
        });

        res.attachment(packageName + ".zip");

        archive.pipe(res);
        archive.finalize();
      })
    })
    .catch(function (error) {
      res.status(500).send(error).end();
    });
});

app.listen(app.get("port"), function() {
  console.log("Node app is running at localhost:" + app.get("port"));
});

module.exports = app;
