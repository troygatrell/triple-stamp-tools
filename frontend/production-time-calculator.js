let rate = 400; // Initial rate value (per hour)
let counter = 0; // Counter starts at 0
let intervalId = null; // To store the interval ID
let total = 400; // Initial total value

// Function to update the rate display
function updateRateDisplay() {
    const el = document.getElementById('rate');
    if (!el) return;
    if (el.tagName === 'INPUT') {
        if (document.activeElement !== el) el.value = rate;
    } else {
        el.textContent = rate;
    }
}

// Function to update the counter display
function updateCounterDisplay() {
    const el = document.getElementById('counter');
    if (el) {
        if (el.tagName === 'INPUT') {
            if (document.activeElement !== el) el.value = Math.floor(counter);
        } else {
            el.textContent = Math.floor(counter);
        }
    }
    
    // Update progress bar
    const progressPercentage = total > 0 ? Math.min((counter / total) * 100, 100) : 0;
    document.getElementById('progress-bar').style.width = `${progressPercentage}%`;
    document.getElementById('progress-text').textContent = `${Math.floor(progressPercentage)}%`;
}

// Function to update the total display
function updateTotalDisplay() {
    const el = document.getElementById('total');
    if (!el) return;
    if (el.tagName === 'INPUT') {
        if (document.activeElement !== el) el.value = total;
    } else {
        el.textContent = total;
    }
}

// Function to update pieces remaining
function updatePiecesRemaining() {
    const remaining = Math.max(total - Math.floor(counter), 0);
    document.getElementById('piecesRemaining').textContent = remaining;
}

// Function to calculate and update the time left and completion time
function updateTimeCalculations() {
    const remaining = total - Math.floor(counter);
    if (rate > 0 && remaining > 0) {
        const hoursLeft = remaining / rate;
        const secondsLeft = Math.floor(hoursLeft * 3600);
        const now = new Date();
        const completionTime = new Date(now.getTime() + secondsLeft * 1000);

        // Format time left as HH:MM:SS
        const hours = Math.floor(secondsLeft / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((secondsLeft % 3600) / 60).toString().padStart(2, '0');
        const seconds = (secondsLeft % 60).toString().padStart(2, '0');
        document.getElementById('timeLeft').textContent = `${hours}:${minutes}:${seconds}`;

        // Format completion time in 12-hour AM/PM format
        let completionHours = completionTime.getHours();
        const completionMinutes = completionTime.getMinutes().toString().padStart(2, '0');
        const ampm = completionHours >= 12 ? 'PM' : 'AM';
        completionHours = completionHours % 12;
        completionHours = completionHours ? completionHours : 12; // Adjust for 12-hour clock
        document.getElementById('completionTime').textContent = `${completionHours}:${completionMinutes} ${ampm}`;
    } else {
        document.getElementById('timeLeft').textContent = '--:--:--';
        document.getElementById('completionTime').textContent = '--:-- --';
    }
}

// Function to increment the total
function incrementTotal(amount) {
    total += amount;
    updateTotalDisplay();
    updatePiecesRemaining();
    updateTimeCalculations();
}

// Function to decrement the total
function decrementTotal(amount) {
    if (total - amount >= 0) {
        total -= amount;
        updateTotalDisplay();
        updatePiecesRemaining();
        updateTimeCalculations();
    }
}

// Function to increment the rate
function incrementRate(amount) {
    rate += amount; // Increase rate by amount
    updateRateDisplay();
    updateTimeCalculations();
}

// Function to decrement the rate
function decrementRate(amount) {
    if (rate - amount >= 0) {
        rate -= amount; // Decrease rate by amount
        updateRateDisplay();
        updateTimeCalculations();
    }
}

// Function to increment the counter manually
function incrementCounter(amount) {
    counter += amount; // Increase counter by amount
    updateCounterDisplay();
    updatePiecesRemaining();
    updateTimeCalculations();
}

// Function to decrement the counter manually
function decrementCounter(amount) {
    if (counter - amount >= 0) {
        counter -= amount; // Decrease counter by amount
        updateCounterDisplay();
        updatePiecesRemaining();
        updateTimeCalculations();
    }
}

function setButtonState(startActive, pauseActive) {
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');

    // Set start button state
    if (startActive) {
        startButton.classList.add('active');
    } else {
        startButton.classList.remove('active');
    }

    // Set pause button state
    if (pauseActive) {
        pauseButton.classList.add('paused');
    } else {
        pauseButton.classList.remove('paused');
    }
}

function start() {
    if (intervalId === null) { // Prevent multiple intervals
        intervalId = setInterval(() => {
            const increment = rate / 3600; // Correct increment for per second calculation based on per hour rate
            counter += increment;
            if (Math.floor(counter) >= total) {
                counter = total;
                pause(); // Stop when total is reached
            }
            updateCounterDisplay();
            updatePiecesRemaining();
            updateTimeCalculations();
        }, 1000); // Updates every second
    }
    setButtonState(true, false); // Set start as active, pause as inactive
}

function pause() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
    setButtonState(false, true); // Set pause as active, start as inactive
}

function stop() {
    pause(); // Stop the interval
    counter = 0; // Reset counter to 0
    rate = 400; // Reset rate to initial value
    total = 400; // Reset total to initial value
    updateRateDisplay();
    updateCounterDisplay();
    updateTotalDisplay();
    updatePiecesRemaining();
    updateTimeCalculations();
    setButtonState(false, false); // Reset both start and pause buttons
}

function setupCalculatorInputListeners() {
    const totalEl = document.getElementById('total');
    const rateEl = document.getElementById('rate');
    const counterEl = document.getElementById('counter');

    if (totalEl && totalEl.tagName === 'INPUT') {
        totalEl.addEventListener('focus', () => {
            totalEl.select();
        });
        totalEl.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0) {
                total = val;
                updatePiecesRemaining();
                updateTimeCalculations();
                updateCounterDisplay();
            }
        });
        totalEl.addEventListener('blur', () => {
            if (totalEl.value === '' || isNaN(parseInt(totalEl.value, 10))) {
                totalEl.value = total;
            }
            updateTotalDisplay();
        });
    }

    if (rateEl && rateEl.tagName === 'INPUT') {
        rateEl.addEventListener('focus', () => {
            rateEl.select();
        });
        rateEl.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0) {
                rate = val;
                updateTimeCalculations();
            }
        });
        rateEl.addEventListener('blur', () => {
            if (rateEl.value === '' || isNaN(parseInt(rateEl.value, 10))) {
                rateEl.value = rate;
            }
            updateRateDisplay();
        });
    }

    if (counterEl && counterEl.tagName === 'INPUT') {
        counterEl.addEventListener('focus', () => {
            counterEl.select();
        });
        counterEl.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0) {
                counter = val;
                updatePiecesRemaining();
                updateTimeCalculations();
                const progressPercentage = total > 0 ? Math.min((counter / total) * 100, 100) : 0;
                document.getElementById('progress-bar').style.width = `${progressPercentage}%`;
                document.getElementById('progress-text').textContent = `${Math.floor(progressPercentage)}%`;
            }
        });
        counterEl.addEventListener('blur', () => {
            if (counterEl.value === '' || isNaN(parseInt(counterEl.value, 10))) {
                counterEl.value = Math.floor(counter);
            }
            updateCounterDisplay();
        });
    }
}

// Initial display update
setupCalculatorInputListeners();
updateRateDisplay();
updateCounterDisplay();
updateTotalDisplay();
updatePiecesRemaining();
updateTimeCalculations();
