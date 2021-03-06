/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./cache/sampleStorePersist.js
 *
 * Functions for saving the redis sample store to the db.
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const Sample = require('../db').Sample;
const redisClient = require('./redisCache').client.sampleStore;
const samsto = require('./sampleStore');
const constants = samsto.constants;

/**
 * Truncate the sample table in the db and persist all the samples from redis
 * into the empty table.
 *
 * @returns {Promise} which resolves to true upon complete if redis sample
 * store feature is enabled, or false on error or if feature is disabled.
 */
function persist() {
  if (!featureToggles.isFeatureEnabled(constants.featureName)) {
    return Promise.resolve(false);
  }

  return Sample.destroy({ truncate: true, force: true })
  .then(() => redisClient.smembersAsync(constants.indexKey.sample))
  .then((keys) => keys.map((key) => ['hgetall', key]))
  .then((cmds) => redisClient.batch(cmds).execAsync())
  .then((res) => {
    const samplesToCreate = res.map((sample) => {
      sample.relatedLinks = JSON.parse(sample.relatedLinks);
      return sample;
    });
    return Sample.bulkCreate(samplesToCreate);
  })
  .then(() => console.log('persisted redis sample store to db'))
  .then(() => true)
  .catch((err) => {
    // NO-OP
    console.error(err); // eslint-disable-line no-console
    Promise.resolve(false);
  });
} // persist

module.exports = {
  persist,
};
