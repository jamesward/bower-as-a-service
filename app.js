var path = require('path');
var fs = require('fs');
var express = require('express');
var NodeCache = require('node-cache');
var cache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });
var Q = require('q');
var Logger = require('bower-logger');
var logger = new Logger();

var app = express();

app.set('port', (process.env.PORT || 5000));

var tmpDir = require('tmp').dirSync().name;


function fetchBasicBowerInfo(packageName) {
  var info = require('bower/lib/commands/info');
  return info(logger, packageName);
}

function fetchDetailedBowerInfo(packageName, version) {
  var endpoint = packageName + '#' + version;

  var endpointParser = require('bower-endpoint-parser');
  var PackageRepository = require('bower/lib/core/PackageRepository');
  var defaultConfig = require('bower/lib/config');

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
  var endpoint = packageName + '#' + version;
  var cacheKey = 'info:' + endpoint;
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

app.get('/info/:package/:version?', function(req, res) {
  getBowerInfo(req.params.package, req.params.version)
    .then(function(data) {
      res.json(data).end();
    })
    .catch(function(error) {
      res.status(500).send(error).end();
    });
});

app.get('/lookup/:name', function(req, res) {
  var lookup = require('bower/lib/commands/lookup');
  lookup(logger, req.params.name)
    .then(function(data) {
      if (data == null) {
        res.status(404).end();
      }
      else {
        res.json(data).end();
      }
    })
    .catch(function(error) {
      res.status(500).send(error).end();
    });
});

function packageDir(packageName, version) {
  return path.join(tmpDir, packageName, version);
}

function fetchBowerDownload(packageInfoName, packageName, version) {
  var packageDownloaded = false;
  var actualPackageDir = path.join(packageDir(packageName, version), 'bower_components', packageInfoName);
  try {
    packageDownloaded = fs.statSync(actualPackageDir).isDirectory();
  }
  catch (error) {
    // ignored
  }

  if (packageDownloaded) {
    return Q.resolve(actualPackageDir);
  }
  else {
    var endpoint = packageName + '#' + version;
    var install = require('bower/lib/commands/install');
    return install(logger, [endpoint], {forceLatest: true, production: true}, {cwd: packageDir(packageName, version)}).then(function(installInfo) {
      return installInfo[packageInfoName].canonicalDir;
    });
  }
}

app.get('/download/:package/:version', function(req, res) {
  var packageName = req.params.package;
  var version = req.params.version;

  getBowerInfo(packageName, version).then(function(packageInfo) {
    return fetchBowerDownload(packageInfo.name, packageName, version)
      .then(function (dir) {
        var archiver = require('archiver');
        var archive = archiver('zip');
        archive.directory(dir, false);

        archive.on('error', function (err) {
          res.status(500).send({error: err.message}).end();
        });

        res.attachment(packageName + '.zip');

        archive.pipe(res);
        archive.finalize();
      })
  })
  .catch(function (error) {
    console.error(error);
    res.status(500).send(error.message).end();
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running at localhost:' + app.get('port'));
});

module.exports = app;
