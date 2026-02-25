# Triple Stamp Tools

Triple Stamp Tools is a specialized internal suite of utilities designed for a screen printing and apparel production environment. It provides tools for inventory management, production tracking, and quality control.

## Project Overview

The project consists of a **Node.js/Express** backend and a **Vanilla JS/jQuery** frontend.

- **Frontend:** A single-page application (SPA) providing multiple tools.
- **Backend:** A RESTful API for managing a sample inventory stored in **MongoDB**.

## Project Structure

- `backend/`: Node.js Express server.
  - `server.js`: Main entry point and API definitions.
  - `package.json`: Backend dependencies and scripts.
- `frontend/`: Static assets and client-side logic.
  - `index.html`: Main dashboard UI.
  - `styles.css`: Global styling.
  - `*.js`: Individual tool logic (e.g., `inventory-search.js`, `production-time-calculator.js`).
- `test.html`: Likely for testing components or layouts.

## Key Tools & Features

1.  **Sample Inventory Search:**
    - Interfaces with the backend to search, create, edit, and delete inventory items.
    - Features a "Hold/Return" system for tracking pulled samples.
2.  **Production Time Calculator:**
    - Real-time estimation of job completion based on production rate (pieces/hour).
    - Includes a progress bar and "Time Left" countdown.
3.  **Apparel Production Checklist:**
    - Multi-stage checklist (Pre-Production, Testing, Production).
    - Supports **Solo** and **Team** (Worker A/Worker B) modes with dynamic layout shifts.
4.  **Check-In Assistant (Inventory Receiver):**
    - Tool for verifying received garment quantities against expected counts.
    - Generates a text summary for easy copying into other systems.
5.  **Ink Formula Formatter:**
    - Formats ink mixing formulas into a standardized print-ready preview.

## Building and Running

### Backend

1.  Navigate to the `backend` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set the required environment variable:
    - `MONGO_URI`: Your MongoDB connection string.
4.  Start the server:
    ```bash
    npm start
    ```
    The server typically runs on port 3000.

### Frontend

The frontend is composed of static files. It can be served using any static web server (e.g., VS Code Live Server, `npx serve`, or Python's `http.server`).

Ensure the backend is running if using the **Inventory Search** tool, as it fetches data from `http://localhost:3000/api/inventory` (or the configured Render URL).

## Development Conventions

### Backend
- **Framework:** Express.js.
- **Database:** Raw MongoDB driver (no ORM/ODM).
- **API Patterns:** Standard RESTful routes.
- **CORS:** Configured to allow requests from specific local and production origins.

### Frontend
- **State Management:** Primarily uses global variables or DOM-based state for simplicity.
- **DOM Manipulation:** Uses a mix of Vanilla JS and jQuery/jQuery UI (for sorting and effects).
- **Communication:** Uses the `fetch` API for backend interactions.
- **Event Handling:** Uses event delegation (e.g., `closest('.result-item')`) for dynamic lists.

### Formatting & Style
- Consistent use of 2-space indentation.
- CamelCase for JavaScript variables and functions.
- Kebab-case for CSS classes and file names.
