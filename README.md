# Kiranam.in — Hyperlocal Queue-Managed Kirana Ordering Platform

Kiranam.in is a hyperlocal queue-managed kirana workflow platform designed to reduce physical crowding and wait times at local neighborhood grocery stores. 

Customers snap and upload photos of handwritten grocery list chittis. Shop owners review chittis in realtime, accept orders, rewrite prices/bills manually offline, and upload the final invoice chitti. Customers verify the split-screen comparison, select pickup schedules, confirm payment (manual UPI QR or Cash on Pickup), and track packaging timelines in real time.

---

## Technical Stack
* **Frontend**: React.js, Tailwind CSS, Lucide icons, Vite
* **Backend**: Node.js, Express.js, Socket.IO
* **Database**: PostgreSQL (native support, with dynamic runtime in-memory database mock fallback for local developer setups)
* **Storage**: Multer local static storage `/uploads` (with Cloudinary plug-and-play integrations)

---

## Directory Structure
```
kiranam/
  ├── backend/               # Express.js & Socket.IO server
  │     ├── config/          # DB connection manager (db.js)
  │     ├── controllers/     # Authentication, Shops, Orders
  │     ├── middleware/      # JWT verify, Multer upload filters
  │     ├── models/          # SQL schema migrations (schema.sql)
  │     ├── routes/          # Express API route endpoints
  │     ├── services/        # Realtime WebSocket emitters & static disk storage
  │     └── server.js        # Entry bootstrap
  └── frontend/              # React + Tailwind client web app
        ├── src/
        │     ├── components/ # Common navbar, bottomNav, and alerts dropdown
        │     ├── context/    # Global AuthContext and SocketContext
        │     ├── hooks/      # useGeolocation coordinates hook
        │     ├── pages/      # Home, RoleSelection, Customer, and Seller pages
        │     └── App.jsx     # Navigation frames and protected tabs
```

---

## Getting Started

### 1. Database Setup
The backend is configured to automatically connect to PostgreSQL using a `DATABASE_URL` parameter in `backend/.env`. On start, it reads `backend/models/schema.sql` to initialize all tables and insert mock shop data.

* **Development Fallback Mode**: If no `DATABASE_URL` is specified or connection fails, the server will output a warning and run in **In-Memory fallback mode**. Data will be persisted in active memory for your session, making the app instantly demoable without database dependencies!

### 2. Environment Configurations

#### Backend (`backend/.env`)
Create a `.env` file in the `backend/` folder:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/kiranam
JWT_SECRET=your_jwt_secret_key

# Optional: Cloudinary Cloud Storage Config (falls back to local /uploads folder otherwise)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

#### Frontend Environment variables
Vite uses `VITE_API_URL` and `VITE_SOCKET_URL`. By default, the code points to `http://localhost:5000` for ease of running locally, but you can override this in production.

---

## Installation & Running Locally

Ensure Node.js is installed on your system. Open two terminals:

### Terminal 1: Run Backend
```bash
cd backend
npm install
npm run dev
```

### Terminal 2: Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## How to Test the MVP Workflows

1. **Onboarding**: Go to `http://localhost:5173`. Create a Customer and a Seller account, or use **Google Sign-in** (uses simulated identity popup for rapid offline local verification).
2. **Role Choice**: Pick a role. If you register as a Seller, a default store coordinate centered around Bangalore will be created.
3. **Hyperlocal Discovery**: Log in as a Customer. The Nearby Shops tab will display stores sorted by distance, queue sizes, and availability states.
4. **Simulate Location**: Click the location chip in the navbar to change coordinates manually to different market zones in Bangalore. You will see distance metrics and shop rankings adjust instantly.
5. **Place Order**: Select a shop, select a photo (you can upload any sample image to represent a handwritten list chitti), add preferred pickup time, and click Submit.
6. **Seller Acceptance**: Open a separate browser tab/window, log in as the Seller. You will hear an **instant synthesizer alert chime** and see a notification badge.
7. **Rewritten Bill Upload**: Open the order, click Accept. Take a photo (simulating a handwritten offline invoice), input a total price, and click Send Invoice.
8. **Split-Screen Verification**: Back on the Customer window, click "Verify Bill". You will see the original chitti on the left, and the seller's bill on the right.
9. **Realtime Packing Timeline**: Click "Confirm Order", choose UPI payment (shows UPI ID and custom store QR code, upload dummy screenshot proof), and submit. The Seller dashboard will update instantly. Move the order through Packing Started -> Packing Completed -> Ready for Pickup. Real-time updates push without page refresh!
10. **Load balancing**: Increase active orders at Ramesh Kirana Store to exceed its capacity (e.g. 5 orders). The shop automatically tags itself as "Busy" and other customer dashboards show warning banners recommending nearby alternate shops.
