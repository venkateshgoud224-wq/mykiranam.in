// utils/razorpay.js
const crypto = require('crypto');

/**
 * Verify Razorpay webhook signature.
 * @param {Buffer|string} payload - Raw request body as Buffer or string.
 * @param {string} signature - The value of the `x-razorpay-signature` header.
 * @param {string} secret - Your Razorpay webhook secret.
 * @returns {boolean} true if signature matches.
 */
function verifySignature(payload, signature, secret) {
  if (!payload || !signature || !secret) return false;
  const generated = crypto
    .createHmac('sha256', secret)
    .update(typeof payload === 'string' ? payload : payload.toString('utf8'))
    .digest('hex');
  return generated === signature;
}

module.exports = { verifySignature };
