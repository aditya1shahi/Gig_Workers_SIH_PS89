# GigWorker Connect

A platform where associations register, workers are linked to associations, and customers can find and assign gig workers (electricians, plumbers, etc.) by location.

## Features

- Association registration
- Worker registration with location
- Interactive map showing workers
- Search by service and city
- Job assignment and tracking
- Pre-seeded Delhi worker dataset

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Leaflet maps
- Backend: Node.js, Express
- Database: MongoDB Atlas

## Setup

1. Install Node.js.
2. Clone this repo.
3. In `backend`:
   ```bash
   npm install
   cp .env.example .env
   ```
   Edit `.env` and add your MongoDB connection string.
4. Seed Delhi workers:
   ```bash
   npm run seed:delhi
   ```
5. Start backend:
   ```bash
   npm start
   ```
6. Open `frontend/index.html` in a browser (or serve via a local server).

See `SETUP_GUIDE.md` for detailed instructions.