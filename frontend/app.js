const CATEGORIES = {
  income:  ['Salary', 'Freelance', 'Investment', 'Gift', 'Other Income'],
  expense: ['Food', 'Rent', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Other'],
};

const API = '/api/transactions';

// --- DOM refs ---
const form           = document.getElementById('transaction-form');
const typeSelect     = document.getElementById('type');
const categorySelect = document.getElementById('category');
const amountInput    = document.getElementById('amount');
const dateInput      = document.getElementById('date');
const noteInput      = document.getElementById('note');
const list           = document.getElementById('transaction-list');
const balanceEl      = document.getElementById('balance');
const incomeEl       = document.getElementById('total-income');
const expenseEl      = document.getElementById('total-expense');

// --- Init ---
dateInput.value = new Date().toISOString().split('T')[0];
updateCategories();
loadTransactions();

// --- Event listeners ---
typeSelect.addEventListener('change', updateCategories);

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const tx = {
    type:     typeSelect.value,
    amount:   parseFloat(amountInput.value),
    category: categorySelect.value,
    date:     dateInput.value,
    note:     noteInput.value.trim(),
  };

  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  });

  amountInput.value = '';
  noteInput.value   = '';
  amountInput.focus();
  loadTransactions();
});

// --- Functions ---
function updateCategories() {
  const type = typeSelect.value;
  categorySelect.innerHTML = CATEGORIES[type]
    .map(c => `<option value="${c}">${c}</option>`)
    .join('');
}

async function loadTransactions() {
  const res = await fetch(API);
  const transactions = await res.json();
  render(transactions);
}

async function deleteTransaction(id) {
  await fetch(`${API}/${id}`, { method: 'DELETE' });
  loadTransactions();
}

function fmt(amount) {
  return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function render(transactions) {
  // Summary
  let income = 0, expense = 0;
  for (const tx of transactions) {
    if (tx.type === 'income') income  += tx.amount;
    else                      expense += tx.amount;
  }
  const balance = income - expense;

  balanceEl.textContent = fmt(Math.abs(balance));
  balanceEl.style.color = balance < 0 ? '#e74c3c' : '#2c3e50';
  incomeEl.textContent  = fmt(income);
  expenseEl.textContent = fmt(expense);

  // List
  if (transactions.length === 0) {
    list.innerHTML = '<li class="empty-state">No transactions yet. Add one above!</li>';
    return;
  }

  list.innerHTML = transactions.map(tx => `
    <li class="transaction-item ${tx.type}" data-id="${tx._id}">
      <span class="dot"></span>
      <div class="info">
        <div class="category">${tx.category}</div>
        <div class="meta">${formatDate(tx.date)}${tx.note ? ' · ' + tx.note : ''}</div>
      </div>
      <span class="tx-amount">${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}</span>
      <button class="delete-btn" title="Delete" onclick="deleteTransaction('${tx._id}')">&#215;</button>
    </li>
  `).join('');
}
