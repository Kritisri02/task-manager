import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  const load = () => api.get('/api/projects').then(r => setProjects(r.data));
  useEffect(() => { load(); }, []);

  const create = async e => {
    e.preventDefault();
    await api.post('/api/projects', { name, description: desc });
    setName(''); setDesc(''); setShowForm(false);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Projects</h2>
        <button onClick={() => setShowForm(!showForm)}>+ New Project</button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={create}>
          <input placeholder="Project name" value={name} onChange={e => setName(e.target.value)} required />
          <input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
          <button type="submit">Create</button>
          <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}

      <div className="project-grid">
        {projects.map(p => (
          <Link key={p._id} to={`/projects/${p._id}`} className="project-card">
            <div className="project-card-header">
              <h3>{p.name}</h3>
              {p.admin._id === user.id && <span className="badge admin">Admin</span>}
              {p.admin._id !== user.id && <span className="badge member">Member</span>}
            </div>
            {p.description && <p className="muted">{p.description}</p>}
            <p className="muted small">{p.members.length + 1} member{p.members.length !== 0 ? 's' : ''}</p>
          </Link>
        ))}
        {projects.length === 0 && <p className="muted">No projects yet. Create one!</p>}
      </div>
    </div>
  );
}
