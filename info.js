'use strict';

var _ = require('lodash');
var wreck = require('wreck');

var pluginConfig = null;

exports.NAME = 'Blockcypher';
exports.SUPPORTED_MODULES = ['info'];

exports.config = function config() {
};

var STATUS_VALUES = {
  insufficientFunds: 0,
  rejected: 1,
  published: 2,
  authorized: 3,
  confirmed: 4
};

function determineStatus(tx, amount) {
  if (tx.value < amount) return 'insufficientFunds';
  if (tx.confirmations > 0) return 'confirmed';
  if (tx.double_spend ) return 'rejected';
  if (tx.confidence > 0.95) return 'authorized';
  return 'published';
}

function findTransaction(payload, amount) {
  var txs = _.reject(_.union(payload.txrefs, payload.unconfirmed_txrefs),
    _.isUndefined);

    var bestTx = _.max(txs, function(tx) {
    return STATUS_VALUES[determineStatus(tx, amount)];
  });

  return {status: determineStatus(bestTx), tx: bestTx};
}

exports.config = function config(_config) {
  pluginConfig = _config;
};

exports.checkAddress = function checkAddress(address, amount, cb) {
  var url = 'https://api.blockcypher.com/v1/btc/main/addrs/' + address;
  wreck.get(url, {json: true}, function (err, res, payload) {
    if (err) return cb(err);
    if (payload.error) return cb(new Error(payload.error));

    console.log(require('util').inspect(payload, {depth:null})); // DEBUG

    if (payload.final_n_tx === 0) return cb(null, 'notSeen', 0, null);

    var txRec = findTransaction(payload, amount);
    cb(null, txRec.status, txRec.tx.value, txRec.tx.tx_hash);
  });
};

exports.testAddress = function testAddress(cb) {
  var url = 'https://api.blockcypher.com/v1/bcy/test/addrs?token=' +
    pluginConfig.token;
  wreck.post(url, {json: true}, function(err, res, payload) {
    if (err) return cb(err);
    if (payload.error) return cb(new Error(payload.error));
    cb(null, payload.address);
  });
};

/*

var address = 'CFMmZMGdEbeDJ8fxDa7BUz21Byrp2QfdkF';
exports.checkAddress(address, 100000, function() {
  console.dir(arguments);
});
*/
