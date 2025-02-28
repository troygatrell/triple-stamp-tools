let rate = 400; // Initial rate value (per hour)
let counter = 0; // Counter starts at 0
let intervalId = null; // To store the interval ID
let total = 400; // Initial total value

// Function to update the rate display
function updateRateDisplay() {
    document.getElementById('rate').textContent = rate;
}

// Function to update the counter display
function updateCounterDisplay() {
    document.getElementById('counter').textContent = Math.floor(counter); // Display whole number
    
    // Update progress bar
    const progressPercentage = (counter / total) * 100;
    document.getElementById('progress-bar').style.width = `${progressPercentage}%`;
    document.getElementById('progress-text').textContent = `${Math.floor(progressPercentage)}%`;
}

// Function to update the total display
function updateTotalDisplay() {
    document.getElementById('total').textContent = total;
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

// Initial display update
updateRateDisplay();
updateCounterDisplay();
updateTotalDisplay();
updatePiecesRemaining();
updateTimeCalculations();
