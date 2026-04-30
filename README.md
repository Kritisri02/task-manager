# TaskFlow — Team Task Management App

Run backend and frontend separately.

## Local Development

### Backend
```bash
cd backend
npm install
# copy .env and fill in values
cp .env .env.local
npm start        # runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # runs on http://localhost:5173
```

## Environment Variables

### Backend (`backend/.env`)
| Variable    | Description                        |
|-------------|------------------------------------|
| `MONGO_URI` | MongoDB connection string          |
| `JWT_SECRET`| Secret key for JWT signing         |
| `PORT`      | Server port (default 5000)         |

### Frontend (`frontend/.env`)
| Variable       | Description                     |
|----------------|---------------------------------|
| `VITE_API_URL` | Backend URL (empty = same host) |

## Railway Deployment

1. Push repo to GitHub
2. Create two Railway services from the same repo:
   - **Backend**: root dir `backend/`, add env vars `MONGO_URI` + `JWT_SECRET`
   - **Frontend**: root dir `frontend/`, add env var `VITE_API_URL=https://<backend-url>`
3. Add a MongoDB plugin to the backend service (Railway provides one)
4. Both services auto-deploy on push

## Features
- JWT authentication (signup / login)
- Project creation — creator is Admin
- Admin: add/remove members, create/edit/delete tasks
- Member: view assigned projects, update task status only
- Kanban board (To Do / In Progress / Done)
- Dashboard with task stats, status breakdown, per-user counts, overdue count
- Role-based access enforced on both frontend and backend
