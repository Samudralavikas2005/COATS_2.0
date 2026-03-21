# COATS 2.0 — Case & Offence Administration Tracking System

A secure, full-stack case management system built for law enforcement agencies to manage the complete lifecycle of criminal cases — from registration to court closure — with blockchain-anchored audit trails for tamper-proof evidence integrity.

---

## 🚀 Features

- 🔐 JWT Authentication with role-based access control
- 👮 Two roles — Supervisor and Case Holding Officer
- 🗂 Case registration, tracking and lifecycle management
- ⚖️ Court stage workflow (UI → PT → HC → SC → CC)
- 🔗 Chain of Custody — immutable append-only timeline for every case
- 📋 Field-level audit logs for every case update
- 📊 Investigation progress entries with reminder dates and completion tracking
- 👮 Case handover — Supervisors can reassign cases with full history
- 📄 Report download — full case report as PDF or CSV
- 📊 Supervisor dashboard with live analytics (KPI, severity, timeline)
- ⛓️ Blockchain anchoring — every log hashed to Sepolia testnet
- 🔒 Mandatory reason enforcement for all case updates
- 🌐 IP address tracking on all actions
- 📅 Auto-refresh on cases page every 10 seconds
- 🌗 Dark / Light theme toggle (persisted)
- 🐳 Docker support for containerized deployment

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 6.0.2, Django REST Framework |
| Frontend | React 19, Vite, React Router v7 |
| Database | PostgreSQL |
| Authentication | JWT (SimpleJWT) |
| Blockchain | Ethereum Sepolia Testnet via Alchemy |
| Smart Contract | Solidity 0.8.0 |
| Web3 | web3.py 7.x |
| PDF Reports | ReportLab |
| Containerization | Docker, Docker Compose |

---

## 🗂 Project Structure
```
coats/
├── accounts/          # Custom user model, login audit log
├── cases/             # Case, CaseLog, ChainOfCustody, CaseProgress, CaseHandover models
├── blockchain/        # Smart contract, deploy script, service
│   ├── contract.sol
│   ├── deploy.py
│   ├── service.py
│   └── abi.json
├── coats/             # Django settings, urls, wsgi
├── frontend/          # React frontend (Vite)
├── Dockerfile
├── docker-compose.yml
├── manage.py
├── requirements.txt
└── .env
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/Samudralavikas2005/COATS_2.0.git
cd COATS_2.0
```

### 2. Create and activate virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Create PostgreSQL database
```bash
sudo -i -u postgres
psql
CREATE DATABASE coats_db;
CREATE USER coats_user WITH PASSWORD 'strongpassword';
GRANT ALL PRIVILEGES ON DATABASE coats_db TO coats_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO coats_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO coats_user;
\q
exit
```

### 5. Create `.env` file in project root
```
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
DB_NAME=coats_db
DB_USER=coats_user
DB_PASSWORD=strongpassword
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key-here
WALLET_PRIVATE_KEY=0xyour-private-key-here
WALLET_ADDRESS=0xyour-wallet-address-here
CONTRACT_ADDRESS=0xyour-contract-address-here
```

### 6. Run migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Grant DB permissions (if adding new models later)
```bash
sudo -i -u postgres psql -d coats_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO coats_user; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO coats_user;"
```

### 8. Create superuser
```bash
python manage.py createsuperuser
```

### 9. Start backend
```bash
python manage.py runserver
```

### 10. Start frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🐳 Docker Setup (Alternative)

Run the entire stack — PostgreSQL, Django backend, and React frontend — in containers:
```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Backend | http://localhost:8000 |
| Frontend | http://localhost:5173 |

> **Note:** Set `DB_HOST=db` in your `.env` when using Docker.

To stop and clean up:
```bash
docker-compose down -v
```

---

## 🔗 Blockchain Setup

### Deploy smart contract to Sepolia
```bash
python blockchain/deploy.py
```

Copy the printed contract address into your `.env` as `CONTRACT_ADDRESS`.

### How it works
Every case log entry, chain of custody event, progress entry, handover, and login attempt is:
1. Hashed using SHA-256
2. Anchored to the Sepolia Ethereum testnet in a background thread
3. Transaction ID stored in the database
4. Verifiable by anyone on [sepolia.etherscan.io](https://sepolia.etherscan.io)

A threading lock ensures transactions are serialized to prevent nonce collision errors.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/token/` | Login |
| POST | `/api/token/refresh/` | Refresh token |
| GET/POST | `/api/cases/` | List / create cases |
| GET/PATCH | `/api/cases/<id>/` | Get / update case |
| GET | `/api/cases/<id>/custody/` | Chain of custody |
| GET/POST | `/api/cases/<id>/progress/` | Progress entries |
| PATCH | `/api/progress/<id>/complete/` | Mark progress done |
| GET/POST | `/api/cases/<id>/handover/` | Case handover |
| GET | `/api/cases/<id>/report/pdf/` | Download PDF report |
| GET | `/api/cases/<id>/report/csv/` | Download CSV report |
| GET | `/api/case-logs/` | All audit logs |
| GET | `/api/case-logs/<id>/verify/` | Verify log on blockchain |
| GET | `/api/officers/` | List case officers |
| GET | `/api/dashboard/kpi/` | Dashboard KPIs |
| GET | `/api/dashboard/by-severity/` | Cases by severity |
| GET | `/api/dashboard/timeline/` | Monthly timeline |
| GET | `/api/dashboard/recent-cases/` | Recent cases |

---

## 👤 Roles

| Role | Permissions |
|---|---|
| SUPERVISOR | View all cases, dashboard, logs, handover cases, download reports |
| CASE | Create cases, update own cases, add progress entries, download reports |

---

## 🔒 Security Features

- JWT authentication with expiry enforcement
- Role-based route guards on frontend and backend
- Mandatory reason for every case update
- Immutable audit logs — cannot be edited or deleted
- Immutable chain of custody — append only
- IP address recorded on every action
- All sensitive config loaded from environment variables
- Blockchain anchoring for tamper-proof evidence
- Threading lock on blockchain transactions to prevent nonce collisions

---

## 📄 Reports

Each case can be exported as:
- **PDF** — professional formatted report with all sections (case details, custody timeline, progress, handovers, audit log)
- **CSV** — full data export for analysis

Download buttons are available on every case detail page.

---

## 📍 Smart Contract

- **Network:** Ethereum Sepolia Testnet
- **Address:** `0x42Ce59Fd72d5AB0CDA54df857522926B013ed24c`
- **Explorer:** [View on Etherscan](https://sepolia.etherscan.io/address/0x42Ce59Fd72d5AB0CDA54df857522926B013ed24c)
