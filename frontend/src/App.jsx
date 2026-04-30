import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import './index.css';

function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const handle = () => { logout(); nav('/login'); };
  return (
    <nav className="navbar">
      <span className="nav-brand">TaskFlow</span>
      <div className="nav-links">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/projects">Projects</NavLink>
      </div>
      <div className="nav-user">
        <span className="muted">{user?.name}</span>
        <button className="btn-ghost" onClick={handle}>Logout</button>
      </div>
    </nav>
  );
}

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function Layout({ children }) {
  return (
    <>
      <Nav />
      <main className="main-content">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
          <Route path="/projects" element={<Protected><Layout><Projects /></Layout></Protected>} />
          <Route path="/projects/:id" element={<Protected><Layout><ProjectDetail /></Layout></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
