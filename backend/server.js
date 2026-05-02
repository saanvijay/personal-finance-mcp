require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./docs/swagger.json');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

const transactionSchema = new mongoose.Schema({
  type:     { type: String, enum: ['income', 'expense'], required: true },
  amount:   { type: Number, required: true },
  category: { type: String, required: true },
  date:     { type: String, required: true },
  note:     { type: String, default: '' },
}, { timestamps: true });

const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

app.get('/api/transactions', async (req, res, next) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) { next(err); }
});

app.post('/api/transactions', async (req, res, next) => {
  try {
    const { type, amount, category, date, note } = req.body;
    const tx = await Transaction.create({ type, amount, category, date, note });
    res.status(201).json(tx);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    next(err);
  }
});

app.delete('/api/transactions/:id', async (req, res, next) => {
  try {
    await Transaction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
    next(err);
  }
});

if (require.main === module) {
  const PORT = process.env.PORT;
  const MONGO_URI = process.env.MONGO_URI;
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    })
    .catch(err => {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    });
}

module.exports = { app, Transaction };
