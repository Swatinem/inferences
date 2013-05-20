module.exports = process.env.INFERENCES_COV
  ? require('./lib-cov')
  : require('./lib');
