// Service Worker Registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

// Request Notification Permission
if ("Notification" in window && Notification.permission === "default") {
  setTimeout(() => {
    Notification.requestPermission();
  }, 1000);
}

// App State
let state = {
  hourlyRate: 0,
  activeTimers: [],
  history: [],
  stats: {
    savedHours: 0,
    canceledItems: 0,
    purchasedItems: 0
  },
  currentNotificationItem: null
};

// Load saved state
function loadState() {
  const saved = localStorage.getItem('workTimeAppState');
  if (saved) {
    state = { ...state, ...JSON.parse(saved) };
  }
  updateUI();
}

// Save state
function saveState() {
  localStorage.setItem('workTimeAppState', JSON.stringify(state));
}

// Calculate hourly rate
function calculateHourlyRate() {
  const salary = parseFloat(document.getElementById('salary').value);
  const hours = parseFloat(document.getElementById('workHours').value);
  
  if (salary > 0 && hours > 0) {
    state.hourlyRate = salary / hours;
    saveState();
    updateUI();
  } else {
    alert('Por favor, preencha valores válidos.');
  }
}

// Calculate cost in work time
function calculateItemCost() {
  if (state.hourlyRate === 0) {
    alert('Configure primeiro seu valor por hora.');
    return;
  }
  
  const itemName = document.getElementById('itemName').value.trim();
  const itemPrice = parseFloat(document.getElementById('itemPrice').value);
  
  if (!itemName || itemPrice <= 0) {
    alert('Preencha nome e preço do item.');
    return;
  }
  
  const hours = itemPrice / state.hourlyRate;
  const days = hours / 8; // Assuming 8-hour work days
  
  document.getElementById('resultTitle').textContent = itemName;
  document.getElementById('resultHours').textContent = `${hours.toFixed(1)} horas`;
  document.getElementById('resultDays').textContent = `${days.toFixed(1)} dias de trabalho`;
  document.getElementById('resultDisplay').classList.remove('hidden');
  
  // Save item for timer creation
  window.currentItem = { name: itemName, price: itemPrice, hours: hours, days: days };
}

// Create timer
function createTimer() {
  if (!window.currentItem) {
    alert('Calcule primeiro o custo de um item.');
    return;
  }
  
  const hours = parseInt(document.getElementById('timerHours').value) || 24;
  const endTime = Date.now() + (hours * 60 * 60 * 1000);
  
  const timer = {
    id: Date.now().toString(),
    item: window.currentItem,
    endTime: endTime,
    hours: hours,
    createdAt: Date.now(),
    status: 'pending'
  };
  
  state.activeTimers.push(timer);
  saveState();
  updateUI();
  
  // Schedule notification
  scheduleNotification(timer);
  
  alert(`Timer criado! Você será notificado em ${hours} horas.`);
}

// Schedule notification
function scheduleNotification(timer) {
  const timeUntilEnd = timer.endTime - Date.now();
  
  if (timeUntilEnd <= 0) {
    showNotification(timer);
    return;
  }
  
  setTimeout(() => {
    showNotification(timer);
  }, timeUntilEnd);
}

// Show notification
function showNotification(timer) {
  state.currentNotificationItem = timer;
  
  // Browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("⏰ Timer Finalizado!", {
      body: `Já se passou ${timer.hours}h. Você ainda precisa do "${timer.item.name}" que custa ${timer.item.hours.toFixed(1)}h do seu trabalho?`,
      icon: "./icons/icon-192.png"
    });
  }
  
  // In-app notification
  document.getElementById('notificationTitle').textContent = `Timer Finalizado!`;
  document.getElementById('notificationText').textContent = 
    `Já se passou ${timer.hours}h. Você ainda precisa do "${timer.item.name}" que custa ${timer.item.hours.toFixed(1)}h do seu trabalho?`;
  document.getElementById('notificationModal').classList.remove('hidden');
}

// Handle notification actions
function handleBuyItem() {
  if (state.currentNotificationItem) {
    addToHistory(state.currentNotificationItem, 'purchased');
    removeTimer(state.currentNotificationItem.id);
    state.stats.purchasedItems++;
    saveState();
    updateUI();
  }
  hideNotification();
}

function handleDelayItem() {
  if (state.currentNotificationItem) {
    // Add 24 hours
    state.currentNotificationItem.endTime = Date.now() + (24 * 60 * 60 * 1000);
    state.currentNotificationItem.hours += 24;
    scheduleNotification(state.currentNotificationItem);
    saveState();
    updateUI();
  }
  hideNotification();
}

function handleCancelItem() {
  if (state.currentNotificationItem) {
    addToHistory(state.currentNotificationItem, 'canceled');
    state.stats.canceledItems++;
    state.stats.savedHours += state.currentNotificationItem.item.hours;
    removeTimer(state.currentNotificationItem.id);
    saveState();
    updateUI();
  }
  hideNotification();
}

function hideNotification() {
  document.getElementById('notificationModal').classList.add('hidden');
  state.currentNotificationItem = null;
}

// Remove timer
function removeTimer(id) {
  state.activeTimers = state.activeTimers.filter(timer => timer.id !== id);
}

// Add to history
function addToHistory(timer, status) {
  const historyItem = {
    ...timer.item,
    id: timer.id,
    createdAt: timer.createdAt,
    status: status,
    decidedAt: Date.now()
  };
  state.history.unshift(historyItem);
  
  // Keep only last 50 items
  if (state.history.length > 50) {
    state.history = state.history.slice(0, 50);
  }
}

// Format time
function formatTime(ms) {
  if (ms <= 0) return "00:00:00";
  
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update UI
function updateUI() {
  // Update hourly rate display
  if (state.hourlyRate > 0) {
    document.getElementById('hourlyRate').textContent = `R$ ${state.hourlyRate.toFixed(2)}`;
    document.getElementById('hourlyRateDisplay').classList.remove('hidden');
  }
  
  // Update active timers
  const timersList = document.getElementById('activeTimersList');
  if (state.activeTimers.length === 0) {
    timersList.innerHTML = '<p class="result-detail">Nenhum timer ativo no momento.</p>';
  } else {
    timersList.innerHTML = state.activeTimers.map(timer => {
      const remaining = timer.endTime - Date.now();
      const expired = remaining <= 0;
      
      return `
        <div class="timer-item">
          <div class="timer-info">
            <h4>${timer.item.name}</h4>
            <p>Custa ${timer.item.hours.toFixed(1)}h (${timer.item.days.toFixed(1)} dias) do seu trabalho</p>
          </div>
          <div class="timer-status">
            <div class="timer-time ${expired ? 'timer-expired' : ''}">
              ${expired ? 'EXPIRADO' : formatTime(remaining)}
            </div>
            <button class="button secondary" onclick="removeTimer('${timer.id}'); saveState(); updateUI();" style="margin-top: 5px; padding: 4px 8px; font-size: 12px;">
              Cancelar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Update history
  const historyList = document.getElementById('historyList');
  if (state.history.length === 0) {
    historyList.innerHTML = '<p class="result-detail">Nenhum item no histórico.</p>';
  } else {
    historyList.innerHTML = state.history.slice(0, 20).map(item => {
      const date = new Date(item.createdAt).toLocaleDateString('pt-BR');
      const statusClass = `status-${item.status}`;
      const statusText = item.status === 'purchased' ? 'Comprado' : 
                        item.status === 'canceled' ? 'Cancelado' : 'Pendente';
      
      return `
        <div class="history-item">
          <strong>${item.name}</strong> - R$ ${item.price.toFixed(2)}<br>
          <span class="history-status ${statusClass}">${statusText}</span>
          <span style="color: var(--text-muted); font-size: 12px; float: right;">${date}</span>
        </div>
      `;
    }).join('');
  }
  
  // Update stats
  document.getElementById('statsSavedHours').textContent = state.stats.savedHours.toFixed(1);
  document.getElementById('statsCanceled').textContent = state.stats.canceledItems;
  document.getElementById('statsPurchased').textContent = state.stats.purchasedItems;
  
  // Update timer countdowns
  updateTimers();
}

// Update timers countdown
function updateTimers() {
  state.activeTimers.forEach(timer => {
    if (timer.endTime <= Date.now() && timer.status === 'pending') {
      timer.status = 'expired';
      showNotification(timer);
    }
  });
}

// Tab switching
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Show active content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
          content.classList.add('active');
        }
      });
    });
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load state
  loadState();
  
  // Setup event listeners
  document.getElementById('saveConfig').addEventListener('click', calculateHourlyRate);
  document.getElementById('calculateCost').addEventListener('click', calculateItemCost);
  document.getElementById('createTimer').addEventListener('click', createTimer);
  
  // Notification buttons
  document.getElementById('buyItem').addEventListener('click', handleBuyItem);
  document.getElementById('delayItem').addEventListener('click', handleDelayItem);
  document.getElementById('cancelItem').addEventListener('click', handleCancelItem);
  
  // Setup tabs
  setupTabs();
  
  // Update timers every second
  setInterval(() => {
    updateTimers();
    updateUI();
  }, 1000);
  
  // Restore scheduled notifications on page load
  state.activeTimers.forEach(timer => {
    if (timer.endTime > Date.now() && timer.status === 'pending') {
      scheduleNotification(timer);
    }
  });
});

// Make functions available globally
window.removeTimer = removeTimer;
window.saveState = saveState;
window.updateUI = updateUI;