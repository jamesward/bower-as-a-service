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
