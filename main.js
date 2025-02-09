if ("Notification" in window) {
    Notification.requestPermission();
}

const storage = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || null,
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

if (!storage.get('portfolio')) {
    storage.set('portfolio', []);
}

const API_KEY = 'success - redundant origins.';
const BASE_URL = 'https://www.alphavantage.co/query';

let portfolioChart = null;

function initializeChart() {
    const ctx = document.getElementById('portfolioChart').getContext('2d');

    portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Portfolio Value',
                data: [],
                borderColor: '#2563eb',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(37, 99, 235, 0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

async function fetchStockData(symbol) {
    try {
        const response = await fetch(
            `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
        );
        const data = await response.json();
        return data['Global Quote'];
    } catch (error) {
        return null;
    }
}

async function addStock(symbol, quantity) {
    const stockData = await fetchStockData(symbol);

    if (!stockData) {
        showNotification('Error', 'Failed to fetch stock data. Please try again.');
        return;
    }

    const portfolio = storage.get('portfolio');
    const newStock = {
        symbol: symbol.toUpperCase(),
        quantity: parseInt(quantity),
        price: parseFloat(stockData['05. price']),
        change: parseFloat(stockData['09. change']),
        changePercent: parseFloat(stockData['10. change percent'])
    };

    portfolio.push(newStock);
    storage.set('portfolio', portfolio);

    updatePortfolioUI();
    showNotification('Stock Added', `Added ${quantity} shares of ${symbol.toUpperCase()} to your portfolio`);
}

function removeStock(index) {
    const portfolio = storage.get('portfolio');
    const removedStock = portfolio.splice(index, 1)[0];
    storage.set('portfolio', portfolio);

    updatePortfolioUI();
    showNotification('Stock Removed', `Removed ${removedStock.symbol} from your portfolio`);
}

function updatePortfolioUI() {
    const portfolio = storage.get('portfolio');
    const portfolioList = document.getElementById('portfolioList');
    let totalValue = 0;
    let totalChange = 0;

    portfolioList.innerHTML = '';

    portfolio.forEach((stock, index) => {
        const stockValue = stock.price * stock.quantity;
        totalValue += stockValue;
        totalChange += stock.change * stock.quantity;

        const stockElement = document.createElement('div');
        stockElement.className = 'stock-item';
        stockElement.innerHTML = `
            <div class="stock-info">
                <span class="stock-symbol">${stock.symbol}</span>
                <span class="stock-price">$${stock.price.toFixed(2)} × ${stock.quantity}</span>
            </div>
            <div class="stock-value">
                <span class="stock-total">$${stockValue.toFixed(2)}</span>
                <span class="stock-change ${stock.change >= 0 ? 'positive' : 'negative'}">
                    ${stock.change >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%
                </span>
            </div>
            <button class="remove-stock" onclick="removeStock(${index})">×</button>
        `;
        portfolioList.appendChild(stockElement);
    });

    document.getElementById('totalValue').textContent = totalValue.toFixed(2);
    const dailyChange = document.getElementById('dailyChange');
    dailyChange.textContent = `${totalChange >= 0 ? '+' : ''}${((totalChange / totalValue) * 100).toFixed(2)}%`;
    dailyChange.className = totalChange >= 0 ? 'positive' : 'negative';

    updateChart(portfolio);
}

function updateChart(portfolio) {
    const timestamps = [];
    const values = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        timestamps.push(date.toLocaleDateString());

        const variation = Math.random() * 0.02 - 0.01;
        const totalValue = portfolio.reduce((sum, stock) => {
            return sum + (stock.price * (1 + variation) * stock.quantity);
        }, 0);

        values.push(totalValue);
    }

    portfolioChart.data.labels = timestamps;
    portfolioChart.data.datasets[0].data = values;
    portfolioChart.update();
}

function showNotification(title, message) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: message });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    updatePortfolioUI();

    document.getElementById('addStockBtn').addEventListener('click', () => {
        const symbol = document.getElementById('stockSymbol').value.trim();
        const quantity = document.getElementById('stockQuantity').value;

        if (symbol && quantity > 0) {
            addStock(symbol, quantity);
            document.getElementById('stockSymbol').value = '';
            document.getElementById('stockQuantity').value = '';
        }
    });

    setInterval(() => {
        const portfolio = storage.get('portfolio');
        portfolio.forEach(async (stock, index) => {
            const updatedData = await fetchStockData(stock.symbol);
            if (updatedData) {
                portfolio[index].price = parseFloat(updatedData['05. price']);
                portfolio[index].change = parseFloat(updatedData['09. change']);
                portfolio[index].changePercent = parseFloat(updatedData['10. change percent']);
            }
        });
        storage.set('portfolio', portfolio);
        updatePortfolioUI();
    }, 60000);
});