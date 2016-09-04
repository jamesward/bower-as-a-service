var app = require('./app');
var request = require('supertest');

describe('app', function () {
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
      .get('/info/jquery/1.9.0')
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
});