const priceEngine = require('../services/priceEngine');

const generateQuotes = async (req, res) => {
  const { itemsList } = req.body;
  const customerId = req.user ? req.user.id : null;

  if (!itemsList || !Array.isArray(itemsList) || itemsList.length === 0) {
    return res.status(400).json({ error: 'Valid items list is required.' });
  }

  try {
    const quotes = await priceEngine.generateQuotes(itemsList, customerId);
    return res.status(200).json(quotes);
  } catch (err) {
    console.error('Error generating quotes:', err);
    return res.status(500).json({ error: 'Failed to generate quotes.' });
  }
};

module.exports = {
  generateQuotes
};
