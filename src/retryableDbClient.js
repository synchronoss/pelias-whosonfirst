const sink = require('pelias-dbclient/src/sink');
const configValidation = require('./configValidation');

var maxRetry = 3;
var currentRetry = 0;

const verifyConnection = () => {
    if (process.env.NODE_ENV !== 'test') {
        configValidation.validate(require('pelias-config').generate(), onResponseHandler);
    }
};

const onResponseHandler = (error, result) => {
    if(result) {
        console.info(`Connection Re-established with ElasticSearch`);
        currentRetry = 0;
        return;
    }

    if(currentRetry >= maxRetry) {
        //throw error
        currentRetry = 0;
        throw error;
    }

    currentRetry++;
    console.info(`Attempting to re-establish connection to ElasticSearch`);
    console.info(`Retry Count ${currentRetry}/${maxRetry}`);
    verifyConnection();
};

verifyConnection();

module.exports = sink;