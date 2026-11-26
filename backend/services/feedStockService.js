/** Convert a feed purchase record into kilograms using its configured unit. */
const weightInKg = (feed) => {
  const quantity = Number(feed.quantity) || 0;
  if (feed.unit === 'BAGS') return quantity * (Number(feed.bagWeightKg) || 0);
  if (feed.unit === 'GRAMS') return (Number(feed.weight) || 0) / 1000;
  // KG records may omit `weight` and rely on `quantity` instead.
  return Number(feed.weight) || quantity;
};

module.exports = { weightInKg };
