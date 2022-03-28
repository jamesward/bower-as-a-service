const path = require('path');
const fs = require('fs');
const express = require('express');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false });
const Logger = require('bower-logger');
const logger = new Logger();
const util = require('util');

const app = express();

app.set('port', (process.env.PORT || 5000));

const tmpDir = require('tmp').dirSync().name;


function fetchBasicBowerInfo(packageName) {
  const info = require('bower/lib/commands/info');
  return info(logger, packageName);
}

function fetchDetailedBowerInfo(packageName, version) {
  const endpoint = packageName + '#' + version;

  const endpointParser = require('bower-endpoint-parser');
  const PackageRepository = require('bower/lib/core/PackageRepository');
  const defaultConfig = require('bower/lib/config');

  const decEndpoint = endpointParser.decompose(endpoint);
  const config = defaultConfig();
  const repository = new PackageRepository(config, logger);

  return repository.fetch(decEndpoint).spread(function (canonicalDir, pkgMeta) {

    const bowerJsonFile = path.join(canonicalDir, 'bower.json');
    const packageJsonFile = path.join(canonicalDir, 'package.json');

    return util.promisify(fs.readFile)(bowerJsonFile).catch(function() {
      // fall back to the package.json
      return util.promisify(fs.readFile)(packageJsonFile).catch(function () {
        // fall back to empty
        return {};
      });
    })
    .then(function (buffer) {
      return JSON.parse(buffer.toString());
    })
    .then(function (json) {
      return Object.assign({}, json, pkgMeta);
    });
  });
}

function fetchBowerInfo(packageName, version) {
  return (version === undefined) ? fetchBasicBowerInfo(packageName) : fetchDetailedBowerInfo(packageName, version);
}

function getBowerInfo(packageName, version) {
  const normalizedPackageName = (packageName.startsWith("https://") &&
      !packageName.endsWith(".git") &&
      packageName.indexOf("@") === -1) ? packageName + ".git" : packageName;

  const endpoint = ((version !== undefined) && (version !== null) && (version.length > 0)) ? normalizedPackageName + '#' + version : normalizedPackageName;
  const cacheKey = 'info:' + endpoint;
  const infoFromCache = cache.get(cacheKey);
  if (infoFromCache !== undefined) {
    return Promise.resolve(infoFromCache);
  }
  else {
    const bowerInfoPromise = fetchBowerInfo(normalizedPackageName, version);
    return bowerInfoPromise.catch(function() {
      cache.del(cacheKey);
    }).then(function (bowerInfo) {
      cache.set(cacheKey, bowerInfo);
      return bowerInfo;
    });
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

app.get('/info', function(req, res) {
  if ((req.query.package !== undefined) && (req.query.package !== null) && (req.query.package.length > 0)) {
    getBowerInfo(req.query.package, req.query.version)
        .then(function (data) {
          res.json(data).end();
        })
        .catch(function (error) {
          console.error(error);
          res.status(500).send(error).end();
        });
  }
  else {
    res.status(400).send("package query param not defined")
  }
});

app.get('/lookup/:name', function(req, res) {
  const lookup = require('bower/lib/commands/lookup');
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
  const actualPackageDir = path.join(packageDir(packageName, version), 'bower_components', packageInfoName);
  return util.promisify(fs.stat)(actualPackageDir).then(function(fileStat) {
    if (fileStat.isDirectory()) {
      return Promise.resolve(actualPackageDir);
    }
    else {
      return Promise.reject(new Error("Package not downloaded"));
    }
  })
  .catch(function() {
    const endpoint = packageName + '#' + version;
    const install = require('bower/lib/commands/install');
    const options = {forceLatest: true, production: true};
    const config = {cwd: packageDir(packageName, version), argv: {cooked: []}};
    return install(logger, [endpoint], options, config).then(function(installInfo) {
      return installInfo[packageInfoName].canonicalDir;
    });
  });
}

function download(f) {
  return function(req, res) {
    const params = f(req);
    getBowerInfo(params.package, params.version).then(function (packageInfo) {
      const version = packageInfo._target === "*" ? packageInfo._release : packageInfo._target;
      return fetchBowerDownload(packageInfo.name, packageInfo._source, version)
        .then(function (dir) {
          const archiver = require('archiver');
          const archive = archiver('zip');
          archive.directory(dir, false);

          archive.on('error', function (err) {
            res.status(500).send({error: err.message}).end();
          });

          res.attachment(params.package + '.zip');

          archive.pipe(res);
          archive.finalize();
        })
    })
    .catch(function (error) {
      console.error(error);
      res.status(500).send(error.message).end();
    });
  }
}

app.get('/download/:package/:version', download(req => req.params));

app.get('/download', download(req => req.query));


app.listen(app.get('port'), function() {
  console.log('Node app is running at localhost:' + app.get('port'));
});

module.exports = app;
