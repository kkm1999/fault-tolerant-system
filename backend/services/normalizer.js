function normalizeEvent(rawEvent) {
    const source = rawEvent.source;
    const payload = rawEvent.payload || {};
  
    // Convert amount to a number
    const amount = Number(payload.amount);
  
    // Convert timestamp to ISO format
    const date = new Date(payload.timestamp);
  
    return {
      client_id: source || null,
      metric: payload.metric || null,
      amount: Number.isNaN(amount) ? null : amount,
      timestamp: isNaN(date.getTime()) ? null : date.toISOString(),
    };
  }
  
  module.exports = normalizeEvent;