const app = require('./app');
const request = require('supertest');
const assert = require('assert');

describe('app', function() {
  this.timeout(60000);

  it('/', function(done) {
    request(app)
      .get('/')
      .expect(404)
      .end(done);
  });
  it('/info/:package', function(done) {
    request(app)
      .get('/info/jquery')
      .expect(200)
      .end(done);
  });
  it('/info/:package/:version', function(done) {
    request(app)
      .get('/info/swagger-ui/3.13.0')
      .expect(200)
      .expect(function(res) {
        assert(res.body.license, "Apache-2.0")
      })
      .end(done);
  });
  it('/info', function(done) {
    request(app)
      .get('/info?package=PolymerElements/iron-behaviors&version=2.0.0')
      .expect(200)
      .end(done);
  });
  it('/info with url', function(done) {
    request(app)
      .get('/info?package=https://github.com/PolymerElements/iron-behaviors&version=2.0.0')
      .expect(200)
      .end(done);
  });
  it('/info with url ending in .git', function(done) {
    request(app)
      .get('/info?package=https://github.com/PolymerElements/iron-behaviors.git&version=2.0.0')
      .expect(200)
      .end(done);
  });
  it('/info with range', function(done) {
    request(app)
      .get('/info?package=polymerelements/iron-a11y-keys-behavior&version=^1.0.0')
      .expect(200)
      .end(done);
  });
  it('/info/sjcl/1.0.2', function(done) {
    request(app)
      .get('/info/sjcl/1.0.2')
      .expect(200)
      .end(done);
  });
  it('/info?package=https://github.com/jquery/jquery-dist.git&version=3.2.1', function(done) {
    request(app)
      .get('/info?package=https://github.com/jquery/jquery-dist.git&version=3.2.1')
      .expect(200)
      .end(done);
  });
  it('/info?package=jquery/jquery&version=1.0.1', function(done) {
    request(app)
        .get('/info?package=jquery/jquery&version=1.0.1')
        .expect(200)
        .end(done);
  });
  it('/info?package=', function(done) {
    request(app)
        .get('/info?package=')
        .expect(400)
        .end(done);
  });
  it('/info?package=https://cdn.jsdelivr.net/npm/hls.js@1.1.5/dist/hls.min.js', function(done) {
    request(app)
        .get('/info?package=https://cdn.jsdelivr.net/npm/hls.js@1.1.5/dist/hls.min.js')
        .expect(200)
        .end(done);
  });
  it('/info', function(done) {
    request(app)
        .get('/info')
        .expect(400)
        .end(done);
  });
  it('/download/:package/:version', function(done) {
    request(app)
      .get('/download/jquery/1.9.0')
      .expect(200)
      .expect('Content-Type', 'application/zip')
      .end(done);
  });
  it('/download/:package/:version again', function(done) {
    request(app)
      .get('/download/jquery/1.9.0')
      .expect(200)
      .expect('Content-Type', 'application/zip')
      .end(done);
  });
  it('/download', function(done) {
    request(app)
      .get('/download?package=jquery&version=1.9.0')
      .expect(200)
      .expect('Content-Type', 'application/zip')
      .end(done);
  });
  it('/download with a url', function(done) {
    request(app)
      .get('/download?package=https://github.com/PolymerElements/iron-behaviors.git&version=2.0.0')
      .expect(200)
      .expect('Content-Type', 'application/zip')
      .end(done);
  });
  it('/download with with dep version conflicts', function(done) {
    request(app)
      .get('/download?package=https://github.com/vaadin/vaadin-grid.git&version=5.0.5')
      .expect(200)
      .expect('Content-Type', 'application/zip')
      .end(done);
  });
  it('/lookup/:name', function(done) {
    request(app)
      .get('/lookup/jquery')
      .expect(200)
      .expect({name: 'jquery', url: 'https://github.com/jquery/jquery-dist.git' })
      .end(done);
  });

  it('/lookup/KaTeX', function(done) {
    request(app)
      .get('/lookup/KaTeX')
      .expect(404)
      .end(done);
  });
});
