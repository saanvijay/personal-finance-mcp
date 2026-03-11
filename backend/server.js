require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./docs/swagger.json');

const app = express();
const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Transaction schema
const transactionSchema = new mongoose.Schema({
  type:     { type: String, enum: ['income', 'expense'], required: true },
  amount:   { type: Number, required: true },
  category: { type: String, required: true },
  date:     { type: String, required: true },
  note:     { type: String, default: '' },
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

// Routes
app.get('/api/transactions', async (req, res) => {
  const transactions = await Transaction.find().sort({ createdAt: -1 });
  res.json(transactions);
});

app.post('/api/transactions', async (req, res) => {
  const { type, amount, category, date, note } = req.body;
  const tx = await Transaction.create({ type, amount, category, date, note });
  res.status(201).json(tx);
});

app.delete('/api/transactions/:id', async (req, res) => {
  await Transaction.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// Connect and start
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
