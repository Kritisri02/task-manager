import { useEffect, useState } from 'react';
import api from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/api/dashboard').then(r => setStats(r.data));
  }, []);

  if (!stats) return <p className="loading">Loading...</p>;

  return (
    <div className="page">
      <h2>Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-num">{stats.projects}</span>
          <span className="stat-label">Projects</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{stats.total}</span>
          <span className="stat-label">Total Tasks</span>
        </div>
        <div className="stat-card overdue">
          <span className="stat-num">{stats.overdue}</span>
          <span className="stat-label">Overdue</span>
        </div>
        <div className="stat-card done">
          <span className="stat-num">{stats.byStatus['Done']}</span>
          <span className="stat-label">Done</span>
        </div>
      </div>

      <div className="dash-row">
        <div className="dash-section">
          <h3>Tasks by Status</h3>
          {Object.entries(stats.byStatus).map(([s, n]) => (
            <div key={s} className="bar-row">
              <span className="bar-label">{s}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: stats.total ? `${(n / stats.total) * 100}%` : '0%' }} />
              </div>
              <span className="bar-count">{n}</span>
            </div>
          ))}
        </div>

        <div className="dash-section">
          <h3>Tasks per User</h3>
          {Object.keys(stats.byUser).length === 0
            ? <p className="muted">No assigned tasks</p>
            : Object.entries(stats.byUser).map(([u, n]) => (
              <div key={u} className="bar-row">
                <span className="bar-label">{u}</span>
                <div className="bar-track">
                  <div className="bar-fill alt" style={{ width: stats.total ? `${(n / stats.total) * 100}%` : '0%' }} />
                </div>
                <span className="bar-count">{n}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
