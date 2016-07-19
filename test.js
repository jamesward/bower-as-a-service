var app = require('./app');
var request = require('supertest');

describe('app', function () {
  it('/', function() {
    request(app)
      .get('/')
      .expect(404);
  });
  it('/search', function() {
    request(app)
      .get('/search')
      .expect(200);
  });
  it('/info/:package', function() {
    request(app)
      .get('/info/jquery')
      .expect(200);
  });
  it('/info/:package/:version', function() {
    request(app)
      .get('/info/jquery/1.9.0')
      .expect(200);
  });
  it('/download/:package/:version', function() {
    request(app)
      .get('/download/jquery/1.9.0')
      .expect(200);
  });
});
