'use strict';

const tape = require('tape');
const proxyquire = require('proxyquire').noCallThru();
const intercept = require('intercept-stdout');

tape('Test DB Client', function(test) {
  var config = {};
  test.test('configValidation not throwing error should return a function', function(t) {
      const factory = proxyquire('../src/retryableDbClient', {
        './configValidation': {validate: (config, handler) => {
            handler(null, true);
          }
        }
      });
  
      t.equal(typeof factory, 'function', 'stream factory');
      t.end();
  
    });

    test.test('Error should result in a retry', function(t) {
      const env = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      let num = 0;

      var stdout = '';

      // intercept stdout
      var unhook_intercept = intercept(
        function(txt) { stdout += txt; return ''; }
      );
  
      const factory = proxyquire('../src/retryableDbClient', {
        './configValidation': { validate: (config, handler) => {
            if(num === 0) {
              num++;
              handler(new Error('elasticsearch index doesn\'t exist'), false);
            } else {
              handler(null, true);
            }
          }
        }
      });

      t.ok(stdout.match(/Attempting to re-establish connection to ElasticSearch/));
      t.ok(stdout.match(/Retry Count 1\/3/));
      t.ok(stdout.match(/Connection Re-established with ElasticSearch/));

      unhook_intercept();
  
      process.env.NODE_ENV = env;
  
      t.equal(typeof factory, 'function', 'stream factory');
      t.end();
  
    });

    test.test('configValidation throwing error should rethrow error after 3 retries', function(t) {
      const env = process.env.NODE_ENV;
      // validation is skipping by default in test environment
      process.env.NODE_ENV = 'development';

      var stdout = '';

      // intercept stdout
      var unhook_intercept = intercept(
        function(txt) { stdout += txt; return ''; }
      );
  
      t.throws(function() {
        proxyquire('../src/retryableDbClient', {
          './configValidation': { validate: (config, handler) => {
              handler(new Error('elasticsearch index doesn\'t exist'), false);
            }
          }
        });
  
      }, /elasticsearch index doesn\'t exist/);

      t.ok(stdout.match(/Attempting to re-establish connection to ElasticSearch/));
      t.ok(stdout.match(/Retry Count 1\/3/));
      t.ok(stdout.match(/Retry Count 2\/3/));
      t.ok(stdout.match(/Retry Count 3\/3/));

      unhook_intercept();
  
      process.env.NODE_ENV = env;
  
      t.end();
  
    });

  test.end();
});