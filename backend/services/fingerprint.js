const crypto = require("crypto");

function generateFingerprint(event) {
  const data = [
    event.client_id,
    event.metric,
    event.amount,
    event.timestamp,
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");
}

module.exports = generateFingerprint;