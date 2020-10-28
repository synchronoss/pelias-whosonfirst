'use strict';

// Overriding the default configValidation.js found within PeliasDbClient/src/configValidation.js
// to handle timeout exception thrown by the es client, as this file is in another project all together
// fix would need to be made on PeliasDbClient project and then new version of it needs to be pulled within
// this project, as this might take some time to do, im adding an override within this project and
// once PeliasDbClient is fixed, we can pull in those changes and handle the exception, until then
// there is no easy way to handle this exception due to the nature of callbacks.

const Joi = require('@hapi/joi');
const elasticsearch = require('elasticsearch');

// Schema Configuration
// dbclient.statFrequency: populated by defaults if not overridden
// esclient: object, validation performed by elasticsearch module
const schema = Joi.object().keys({
  dbclient: Joi.object().required().keys({
    statFrequency: Joi.number().integer().min(0).required()
  }),
  esclient: Joi.object().required().keys({
    requestTimeout: Joi.number().integer().min(0)
  }).unknown(true),
  schema: Joi.object().keys({
    indexName: Joi.string().required(),
    typeName: Joi.string().required()
  })
}).unknown(true);

module.exports = {
  validate: function validate(config, onResultCallback = null) {
    const validate = schema.validate(config);
    let error;

    if (validate.error) {
      error = new Error(validate.error.details[0].message);
      if(onResultCallback !== null) {
        onResultCallback(error);
      } else {
        throw error;
      }
    }

    // now verify that the index exists
    const esclient = new elasticsearch.Client(config.esclient);

    // callback that throws an error if the index doesn't exist
    const existsCallback = (error, exists) => {
      if (!exists) {
        console.error(`ERROR: Elasticsearch index ${config.schema.indexName} does not exist`);
        console.error('You must use the pelias-schema tool (https://github.com/pelias/schema/) to create the index first');
        console.error('For full instructions on setting up Pelias, see http://pelias.io/install.html');

        error = new Error(`elasticsearch index ${config.schema.indexName} does not exist`);

        if(onResultCallback !== null) {
          onResultCallback(error);
          return;
        } else {
          throw error;
        }
      }

      if(onResultCallback !== null) {
        onResultCallback(null, true);
      }
    };

    // can also be done with promises but it's hard to test mixing the paradigms
    esclient.indices.exists({ index: config.schema.indexName }, existsCallback);
  }
};
