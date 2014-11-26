'use strict';

var _ = require('lodash');
var wreck = require('wreck');

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
  if (tx.double_spend || tx.preference !== 'high') return 'rejected';
  if (tx.confidence > 0.95) return 'authorized';
  return 'published';
}

function findTransaction(txs, amount) {
  var tx = _.max(txs, function(tx) {
    return STATUS_VALUES[determineStatus(tx, amount)];
  });

  return {status: determineStatus(tx), tx: tx};
}

exports.checkAddress = function checkAddress(address, amount, cb) {
  var url = 'https://api.blockcypher.com/v1/btc/main/addrs/' + address;
  wreck.get(url, {json: true}, function (err, res, payload) {
    if (err) return cb(err);
    if (payload.error) return cb(new Error(payload.error));

    if (payload.final_n_tx === 0) return cb(null, 'notSeen', 0, null);

    var txRec = findTransaction(payload.txrefs, amount);
    cb(null, txRec.status, txRec.tx.value, txRec.tx.tx_hash);
  });
};

/*
var address = '1PuwQ6uWXNeGcEnLCAXmRJozdLZ9M4NWQ7';
exports.checkAddress(address, 100000, function() {
  console.dir(arguments);
});
*/
