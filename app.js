var express = require("express");
var bower = require("bower");
var tmp = require("tmp");
var archiver = require("archiver");

var app = express();

app.set("port", (process.env.PORT || 5000));

app.get("/search", function(req, res) {
  bower.commands.search().on("end", function(data) {
    res.json(data);
  });
});

app.get("/info/:package", function(req, res) {
  bower.commands.info(req.params.package).on("end", function(data) {
    res.json(data);
  });
});

app.get("/download/:package/:version?", function(req, res) {
  tmp.dir({"unsafeCleanup": true}, function(err, tmpDir) {
    if (err) throw err;

    var packageName = req.params.package;

    var endpoint = packageName;
    if (req.params.version !== undefined) {
      endpoint += "#" + req.params.version;
    }

    bower.commands.install([endpoint], {}, {cwd: tmpDir}).on("end", function(data) {
      var dir = data[packageName].canonicalDir;

      var archive = archiver("zip");

      archive.on("error", function(err) {
        res.status(500).send({error: err.message});
      });

      res.on("close", function() {
        console.log("Archive wrote %d bytes", archive.pointer());
        return res.status(200).send("OK").end();
      });

      res.attachment(packageName + ".zip");

      archive.pipe(res);

      archive.directory(dir, false);

      archive.finalize();
    });
  });
});

app.listen(app.get("port"), function() {
  console.log("Node app is running at localhost:" + app.get("port"));
});