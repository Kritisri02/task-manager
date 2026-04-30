import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

const STATUSES = ['To Do', 'In Progress', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High'];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '', priority: 'Medium', assignedTo: '', status: 'To Do' });
  const [error, setError] = useState('');

  const isAdmin = project?.admin?._id === user.id;

  const load = async () => {
    const [p, t, u] = await Promise.all([
      api.get(`/api/projects/${id}`),
      api.get(`/api/projects/${id}/tasks`),
      api.get(`/api/projects/${id}/users`),
    ]);
    setProject(p.data); setTasks(t.data); setUsers(u.data);
  };

  useEffect(() => { load(); }, [id]);

  const addMember = async e => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/projects/${id}/members`, { email: memberEmail });
      setMemberEmail('');
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const removeMember = async uid => {
    await api.delete(`/api/projects/${id}/members/${uid}`);
    load();
  };

  const openTaskForm = (task = null) => {
    if (task) {
      setEditTask(task._id);
      setTaskForm({
        title: task.title, description: task.description || '',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        priority: task.priority, assignedTo: task.assignedTo?._id || '', status: task.status,
      });
    } else {
      setEditTask(null);
      setTaskForm({ title: '', description: '', dueDate: '', priority: 'Medium', assignedTo: '', status: 'To Do' });
    }
    setShowTaskForm(true);
  };

  const saveTask = async e => {
    e.preventDefault();
    setError('');
    try {
      if (editTask) {
        await api.put(`/api/tasks/${editTask}`, taskForm);
      } else {
        await api.post(`/api/projects/${id}/tasks`, taskForm);
      }
      setShowTaskForm(false);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const deleteTask = async tid => {
    await api.delete(`/api/tasks/${tid}`);
    load();
  };

  const updateStatus = async (tid, status) => {
    await api.put(`/api/tasks/${tid}`, { status });
    load();
  };

  const deleteProject = async () => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    await api.delete(`/api/projects/${id}`);
    nav('/projects');
  };

  if (!project) return <p className="loading">Loading...</p>;

  const now = new Date();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{project.name}</h2>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <div className="header-actions">
          {isAdmin && <button onClick={() => openTaskForm()}>+ Add Task</button>}
          {isAdmin && <button className="btn-danger" onClick={deleteProject}>Delete Project</button>}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="modal-overlay" onClick={() => setShowTaskForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editTask ? 'Edit Task' : 'New Task'}</h3>
            <form onSubmit={saveTask}>
              <input placeholder="Title" value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
              <textarea placeholder="Description" value={taskForm.description}
                onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
              <input type="date" value={taskForm.dueDate}
                onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
              <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
              <div className="form-actions">
                <button type="submit">{editTask ? 'Save' : 'Create'}</button>
                <button type="button" className="btn-ghost" onClick={() => setShowTaskForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="kanban">
        {STATUSES.map(status => (
          <div key={status} className="kanban-col">
            <h3 className="kanban-title">{status}</h3>
            {tasks.filter(t => t.status === status).map(t => {
              const overdue = t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done';
              const canEdit = isAdmin || t.assignedTo?._id === user.id;
              return (
                <div key={t._id} className={`task-card ${overdue ? 'overdue' : ''}`}>
                  <div className="task-card-header">
                    <span className="task-title">{t.title}</span>
                    <span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
                  </div>
                  {t.description && <p className="muted small">{t.description}</p>}
                  {t.assignedTo && <p className="muted small">👤 {t.assignedTo.name}</p>}
                  {t.dueDate && <p className={`muted small ${overdue ? 'text-red' : ''}`}>📅 {t.dueDate.slice(0, 10)}</p>}
                  {canEdit && (
                    <div className="task-actions">
                      {STATUSES.filter(s => s !== status).map(s => (
                        <button key={s} className="btn-xs" onClick={() => updateStatus(t._id, s)}>→ {s}</button>
                      ))}
                      {isAdmin && <button className="btn-xs" onClick={() => openTaskForm(t)}>Edit</button>}
                      {isAdmin && <button className="btn-xs danger" onClick={() => deleteTask(t._id)}>Del</button>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Members Section */}
      <div className="members-section">
        <h3>Members</h3>
        <div className="member-list">
          <div className="member-item">
            <span>{project.admin.name}</span>
            <span className="badge admin">Admin</span>
          </div>
          {project.members.map(m => (
            <div key={m._id} className="member-item">
              <span>{m.name} <span className="muted small">({m.email})</span></span>
              {isAdmin && (
                <button className="btn-xs danger" onClick={() => removeMember(m._id)}>Remove</button>
              )}
            </div>
          ))}
        </div>
        {isAdmin && (
          <form className="inline-form" onSubmit={addMember}>
            <input placeholder="Member email" type="email" value={memberEmail}
              onChange={e => setMemberEmail(e.target.value)} required />
            <button type="submit">Add Member</button>
          </form>
        )}
      </div>
    </div>
  );
}
