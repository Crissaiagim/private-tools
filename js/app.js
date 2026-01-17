// Service Worker Registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}

// Request Notification Permission
if ("Notification" in window && Notification.permission === "default") {
  setTimeout(() => {
    Notification.requestPermission();
  }, 2000);
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

// Initialize particles
function initParticles() {
  const particlesContainer = document.getElementById('particles');
  const particleCount = 20;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random properties
    const size = Math.random() * 4 + 1;
    const left = Math.random() * 100;
    const animationDuration = Math.random() * 20 + 15;
    const delay = Math.random() * 5;
    const opacity = Math.random() * 0.3 + 0.1;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${left}%`;
    particle.style.animationDuration = `${animationDuration}s`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.opacity = opacity;
    particle.style.background = `linear-gradient(135deg, var(--primary), var(--secondary))`;
    
    particlesContainer.appendChild(particle);
  }
}

// Celebration animation
function showCelebration(message) {
  const confetti = document.getElementById('confetti');
  
  // Create confetti elements
  for (let i = 0; i < 50; i++) {
    const confettiPiece = document.createElement('div');
    confettiPiece.className = 'confetti-piece';
    confettiPiece.innerHTML = ['🎉', '🎊', '✨', '🥳', '💸', '💰'][Math.floor(Math.random() * 6)];
    
    const left = Math.random() * 100;
    const animationDuration = Math.random() * 2 + 1;
    const size = Math.random() * 20 + 10;
    
    confettiPiece.style.left = `${left}%`;
    confettiPiece.style.fontSize = `${size}px`;
    confettiPiece.style.animation = `confettiFall ${animationDuration}s linear forwards`;
    
    confetti.appendChild(confettiPiece);
    
    // Remove after animation
    setTimeout(() => {
      confettiPiece.remove();
    }, animationDuration * 1000);
  }
  
  // Show temporary message
  const messageEl = document.createElement('div');
  messageEl.className = 'celebration-message';
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--gradient-primary);
    color: white;
    padding: 20px 40px;
    border-radius: 50px;
    font-weight: bold;
    z-index: 1001;
    animation: popMessage 2s ease forwards;
  `;
  
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.remove();
  }, 2000);
}

// Add CSS for celebration
const celebrationStyles = document.createElement('style');
celebrationStyles.textContent = `
  @keyframes confettiFall {
    0% {
      transform: translateY(-100px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
  
  @keyframes popMessage {
    0% {
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.1);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0;
    }
  }
  
  .confetti-piece {
    position: fixed;
    top: -50px;
    z-index: 1000;
    pointer-events: none;
  }
`;
document.head.appendChild(celebrationStyles);

// Load saved state
function loadState() {
  const saved = localStorage.getItem('workTimeAppState');
  if (saved) {
    state = { ...state, ...JSON.parse(saved) };
  }
  updateUI();
  
  // Initialize particles after UI is loaded
  setTimeout(initParticles, 500);
}

// Save state
function saveState() {
  localStorage.setItem('workTimeAppState', JSON.stringify(state));
}

// Calculate hourly rate with animation
function calculateHourlyRate() {
  const salary = parseFloat(document.getElementById('salary').value);
  const hours = parseFloat(document.getElementById('workHours').value);
  
  if (salary > 0 && hours > 0) {
    // Animate the calculation
    const hourlyRate = salary / hours;
    const rateDisplay = document.getElementById('hourlyRate');
    const displayContainer = document.getElementById('hourlyRateDisplay');
    
    // Show loading animation
    rateDisplay.textContent = 'Calculando...';
    displayContainer.classList.remove('hidden');
    
    // Animate the number
    animateValue(rateDisplay, 0, hourlyRate, 1000, () => {
      state.hourlyRate = hourlyRate;
      saveState();
      showCelebration('Valor por hora calculado!');
    });
  } else {
    showError('Por favor, preencha valores válidos.');
  }
}

// Animate number value
function animateValue(element, start, end, duration, callback) {
  const startTime = performance.now();
  const formatCurrency = (value) => `R$ ${value.toFixed(2)}`;
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function
    const ease = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    const current = start + (end - start) * ease;
    element.textContent = formatCurrency(current);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else if (callback) {
      callback();
    }
  }
  
  requestAnimationFrame(update);
}

// Calculate cost in work time with animation
function calculateItemCost() {
  if (state.hourlyRate === 0) {
    showError('Configure primeiro seu valor por hora.');
    return;
  }
  
  const itemName = document.getElementById('itemName').value.trim();
  const itemPrice = parseFloat(document.getElementById('itemPrice').value);
  
  if (!itemName || itemPrice <= 0) {
    showError('Preencha nome e preço do item.');
    return;
  }
  
  const hours = itemPrice / state.hourlyRate;
  const days = hours / 8;
  
  document.getElementById('resultTitle').textContent = itemName;
  const resultHours = document.getElementById('resultHours');
  const resultDays = document.getElementById('resultDays');
  const resultDisplay = document.getElementById('resultDisplay');
  
  // Reset animation
  resultDisplay.classList.remove('hidden');
  resultDisplay.style.animation = 'none';
  resultDisplay.offsetHeight; // Trigger reflow
  resultDisplay.style.animation = 'fadeIn 0.6s ease-out';
  
  // Animate numbers
  animateValue(resultHours, 0, hours, 1000, null, (value) => `${value.toFixed(1)} horas`);
  animateValue(resultDays, 0, days, 1000, null, (value) => `${value.toFixed(1)} dias de trabalho`);
  
  // Save item for timer creation
  window.currentItem = { 
    name: itemName, 
    price: itemPrice, 
    hours: hours, 
    days: days 
  };
}

// Enhanced animateValue for different formats
function animateValue(element, start, end, duration, callback, formatter = (value) => value) {
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const ease = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    const current = start + (end - start) * ease;
    element.textContent = formatter(current);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else if (callback) {
      callback();
    }
  }
  
  requestAnimationFrame(update);
}

// Create timer with animation
function createTimer() {
  if (!window.currentItem) {
    showError('Calcule primeiro o custo de um item.');
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
  
  // Show success animation
  showCelebration(`Timer criado para ${hours}h!`);
  
  // Animate button
  const button = document.getElementById('createTimer');
  button.classList.add('pulse');
  setTimeout(() => button.classList.remove('pulse'), 600);
}

// Pulse animation CSS
const pulseStyles = document.createElement('style');
pulseStyles.textContent = `
  .pulse {
    animation: pulse 0.6s ease-in-out;
  }
  
  .animated-bell {
    animation: ring 0.5s ease 3;
  }
  
  @keyframes ring {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-15deg); }
    75% { transform: rotate(15deg); }
  }
`;
document.head.appendChild(pulseStyles);

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

// Show notification with animation
function showNotification(timer) {
  state.currentNotificationItem = timer;
  
  // Browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("⏰ Timer Finalizado!", {
      body: `Já se passou ${timer.hours}h. Você ainda precisa do "${timer.item.name}" que custa ${timer.item.hours.toFixed(1)}h do seu trabalho?`,
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-192.png"
    });
  }
  
  // In-app notification
  const notificationModal = document.getElementById('notificationModal');
  document.getElementById('notificationTitle').innerHTML = `<i class="fas fa-bell animated-bell"></i> Timer Finalizado!`;
  document.getElementById('notificationText').textContent = 
    `Já se passou ${timer.hours}h. Você ainda precisa do "${timer.item.name}" que custa ${timer.item.hours.toFixed(1)}h do seu trabalho?`;
  
  // Animate notification
  notificationModal.classList.remove('hidden');
  notificationModal.style.animation = 'none';
  notificationModal.offsetHeight;
  notificationModal.style.animation = 'slideInUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  // Add vibration if supported
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}

// Handle notification actions with animations
function handleBuyItem() {
  if (state.currentNotificationItem) {
    addToHistory(state.currentNotificationItem, 'purchased');
    removeTimer(state.currentNotificationItem.id);
    state.stats.purchasedItems++;
    saveState();
    updateUI();
    showCelebration('Item comprado! 🛒');
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
    showCelebration('Item adiado +24h! ⏳');
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
    showCelebration(`Você economizou ${state.currentNotificationItem.item.hours.toFixed(1)}h! 💰`);
  }
  hideNotification();
}

function hideNotification() {
  const notificationModal = document.getElementById('notificationModal');
  notificationModal.style.animation = 'slideOutDown 0.3s ease forwards';
  
  setTimeout(() => {
    notificationModal.classList.add('hidden');
    notificationModal.style.animation = '';
  }, 300);
  
  state.currentNotificationItem = null;
}

// Add slideOutDown animation
const slideOutStyles = document.createElement('style');
slideOutStyles.textContent = `
  @keyframes slideOutDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(slideOutStyles);

// Remove timer with animation
function removeTimer(id) {
  const timerElement = document.querySelector(`[data-timer-id="${id}"]`);
  if (timerElement) {
    timerElement.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      state.activeTimers = state.activeTimers.filter(timer => timer.id !== id);
      saveState();
      updateUI();
    }, 300);
  } else {
    state.activeTimers = state.activeTimers.filter(timer => timer.id !== id);
    saveState();
    updateUI();
  }
}

// Add fadeOut animation
const fadeOutStyles = document.createElement('style');
fadeOutStyles.textContent = `
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(-20px);
    }
  }
`;
document.head.appendChild(fadeOutStyles);

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

// Calculate progress percentage
function calculateProgress(endTime, totalHours) {
  const totalMs = totalHours * 60 * 60 * 1000;
  const elapsed = totalMs - (endTime - Date.now());
  const progress = Math.min(Math.max((elapsed / totalMs) * 100, 0), 100);
  return progress;
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
    timersList.innerHTML = '<p class="result-detail" style="text-align: center; padding: 30px;">⏳ Nenhum timer ativo no momento.<br><small>Crie um timer para começar!</small></p>';
  } else {
    timersList.innerHTML = state.activeTimers.map(timer => {
      const remaining = timer.endTime - Date.now();
      const expired = remaining <= 0;
      const progress = calculateProgress(timer.endTime, timer.hours);
      
      return `
        <div class="timer-item" data-timer-id="${timer.id}">
          <div class="timer-info">
            <h4><i class="fas fa-${expired ? 'exclamation-triangle' : 'hourglass-half'}"></i> ${timer.item.name}</h4>
            <p>Custa ${timer.item.hours.toFixed(1)}h (${timer.item.days.toFixed(1)} dias) do seu trabalho</p>
            <div class="timer-progress">
              <div class="timer-progress-bar" style="width: ${progress}%"></div>
            </div>
          </div>
          <div class="timer-status">
            <div class="timer-time ${expired ? 'timer-expired' : ''}">
              ${expired ? '⏰ EXPIRADO' : formatTime(remaining)}
            </div>
            <button class="button secondary" onclick="removeTimer('${timer.id}')" style="margin-top: 10px; padding: 8px 16px; font-size: 0.9rem;">
              <i class="fas fa-trash"></i> Cancelar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Update history
  const historyList = document.getElementById('historyList');
  if (state.history.length === 0) {
    historyList.innerHTML = '<p class="result-detail" style="text-align: center; padding: 30px;">📝 Nenhum item no histórico.<br><small>Seus itens aparecerão aqui!</small></p>';
  } else {
    historyList.innerHTML = state.history.slice(0, 20).map(item => {
      const date = new Date(item.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const statusClass = `status-${item.status}`;
      const statusText = item.status === 'purchased' ? 'Comprado' : 
                        item.status === 'canceled' ? 'Cancelado' : 'Pendente';
      const statusIcon = item.status === 'purchased' ? 'fa-check-circle' : 
                        item.status === 'canceled' ? 'fa-times-circle' : 'fa-clock';
      
      return `
        <div class="history-item">
          <strong><i class="fas fa-tag"></i> ${item.name}</strong><br>
          <span style="color: var(--text-muted);">R$ ${item.price.toFixed(2)} • ${item.hours.toFixed(1)}h trabalho</span><br>
          <span class="history-status ${statusClass}">
            <i class="fas ${statusIcon}"></i> ${statusText}
          </span>
          <span style="color: var(--text-muted); font-size: 12px; float: right;">
            <i class="fas fa-calendar"></i> ${date}
          </span>
        </div>
      `;
    }).join('');
  }
  
  // Update stats
  document.getElementById('statsSavedHours').textContent = state.stats.savedHours.toFixed(1);
  document.getElementById('statsCanceled').textContent = state.stats.canceledItems;
  document.getElementById('statsPurchased').textContent = state.stats.purchasedItems;
  
  // Animate stats if changed
  animateStats();
  
  // Update timer countdowns
  updateTimers();
}

// Animate stats changes
function animateStats() {
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach(card => {
    card.classList.add('stat-updated');
    setTimeout(() => card.classList.remove('stat-updated'), 1000);
  });
}

// Add stat-updated animation
const statAnimationStyles = document.createElement('style');
statAnimationStyles.textContent = `
  .stat-updated {
    animation: statPulse 1s ease;
  }
  
  @keyframes statPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(statAnimationStyles);

// Update timers countdown
function updateTimers() {
  state.activeTimers.forEach(timer => {
    if (timer.endTime <= Date.now() && timer.status === 'pending') {
      timer.status = 'expired';
      showNotification(timer);
    }
  });
}

// Show error with animation
function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
  errorEl.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: white;
    padding: 15px 30px;
    border-radius: 10px;
    font-weight: 600;
    z-index: 1001;
    animation: slideDown 0.3s ease, slideUp 0.3s ease 2.7s forwards;
    box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
  `;
  
  document.body.appendChild(errorEl);
  
  setTimeout(() => {
    errorEl.remove();
  }, 3000);
}

// Tab switching with animation
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      
      // Update active tab with animation
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.animation = 'none';
      });
      tab.classList.add('active');
      tab.style.animation = 'tabSwitch 0.3s ease';
      
      // Show active content with animation
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
          content.classList.add('active');
          content.style.animation = 'fadeIn 0.5s ease';
        }
      });
    });
  });
}

// Add tab switch animation
const tabAnimationStyles = document.createElement('style');
tabAnimationStyles.textContent = `
  @keyframes tabSwitch {
    0% { transform: scale(0.95); opacity: 0.8; }
    100% { transform: scale(1); opacity: 1; }
  }
`;
document.head.appendChild(tabAnimationStyles);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load state
  loadState();
  
  // Setup event listeners
  document.getElementById('saveConfig').addEventListener('click', calculateHourlyRate);
  document.getElementById('calculateCost').addEventListener('click', calculateItemCost);
  document.getElementById('createTimer').addEventListener('click', createTimer);
  
  // Add enter key support
  document.getElementById('itemPrice').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') calculateItemCost();
  });
  
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
  
  // Add hover effects to buttons
  const buttons = document.querySelectorAll('.button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    });
  });
});

// Make functions available globally
window.removeTimer = removeTimer;
window.saveState = saveState;
window.updateUI = updateUI;
window.hideNotification = hideNotification;