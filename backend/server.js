require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/taskmanager');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// ─── Models ───────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });
const Project = mongoose.model('Project', ProjectSchema);

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['To Do', 'In Progress', 'Done'], default: 'To Do' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
const Task = mongoose.model('Task', TaskSchema);

// ─── Middleware ────────────────────────────────────────────────────────────────

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = async (req, res, next) => {
  const project = await Project.findById(req.params.projectId || req.body.project);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.admin.toString() !== req.user.id) return res.status(403).json({ error: 'Admin only' });
  req.project = project;
  next();
};

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already in use' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// ─── Project Routes ───────────────────────────────────────────────────────────

app.get('/api/projects', auth, async (req, res) => {
  const projects = await Project.find({
    $or: [{ admin: req.user.id }, { members: req.user.id }]
  }).populate('admin', 'name email').populate('members', 'name email');
  res.json(projects);
});

app.post('/api/projects', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const project = await Project.create({ name, description, admin: req.user.id, members: [] });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/projects/:projectId', auth, async (req, res) => {
  const project = await Project.findById(req.params.projectId)
    .populate('admin', 'name email').populate('members', 'name email');
  if (!project) return res.status(404).json({ error: 'Not found' });
  const isMember = project.admin._id.toString() === req.user.id ||
    project.members.some(m => m._id.toString() === req.user.id);
  if (!isMember) return res.status(403).json({ error: 'Access denied' });
  res.json(project);
});

app.put('/api/projects/:projectId', auth, isAdmin, async (req, res) => {
  const { name, description } = req.body;
  const project = await Project.findByIdAndUpdate(req.params.projectId, { name, description }, { new: true });
  res.json(project);
});

app.delete('/api/projects/:projectId', auth, isAdmin, async (req, res) => {
  await Task.deleteMany({ project: req.params.projectId });
  await Project.findByIdAndDelete(req.params.projectId);
  res.json({ message: 'Deleted' });
});

app.post('/api/projects/:projectId/members', auth, isAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const project = req.project;
    if (project.admin.toString() === user._id.toString())
      return res.status(400).json({ error: 'User is already admin' });
    if (project.members.includes(user._id))
      return res.status(400).json({ error: 'Already a member' });
    project.members.push(user._id);
    await project.save();
    await project.populate('members', 'name email');
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/projects/:projectId/members/:userId', auth, isAdmin, async (req, res) => {
  const project = req.project;
  project.members = project.members.filter(m => m.toString() !== req.params.userId);
  await project.save();
  res.json({ message: 'Removed' });
});

// ─── Task Routes ──────────────────────────────────────────────────────────────

const canAccessProject = async (req, res, next) => {
  const projectId = req.params.projectId || req.body.project || req.query.project;
  const project = await Project.findById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const isMember = project.admin.toString() === req.user.id ||
    project.members.map(m => m.toString()).includes(req.user.id);
  if (!isMember) return res.status(403).json({ error: 'Access denied' });
  req.project = project;
  req.isAdmin = project.admin.toString() === req.user.id;
  next();
};

app.get('/api/projects/:projectId/tasks', auth, canAccessProject, async (req, res) => {
  const tasks = await Task.find({ project: req.params.projectId })
    .populate('assignedTo', 'name email').populate('createdBy', 'name email');
  res.json(tasks);
});

app.post('/api/projects/:projectId/tasks', auth, canAccessProject, async (req, res) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ error: 'Admin only' });
    const { title, description, dueDate, priority, assignedTo } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const task = await Task.create({
      title, description, dueDate, priority, assignedTo,
      project: req.params.projectId, createdBy: req.user.id
    });
    await task.populate('assignedTo', 'name email');
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/tasks/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = await Project.findById(task.project);
    const isAdmin = project.admin.toString() === req.user.id;
    const isAssigned = task.assignedTo?.toString() === req.user.id;
    if (!isAdmin && !isAssigned) return res.status(403).json({ error: 'Access denied' });

    if (isAdmin) {
      const { title, description, dueDate, priority, status, assignedTo } = req.body;
      Object.assign(task, { title, description, dueDate, priority, status, assignedTo });
    } else {
      // Members can only update status
      if (req.body.status) task.status = req.body.status;
    }
    await task.save();
    await task.populate('assignedTo', 'name email');
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/tasks/:taskId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const project = await Project.findById(task.project);
    if (project.admin.toString() !== req.user.id) return res.status(403).json({ error: 'Admin only' });
    await task.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Dashboard Route ──────────────────────────────────────────────────────────

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ admin: req.user.id }, { members: req.user.id }]
    });
    const projectIds = projects.map(p => p._id);
    const tasks = await Task.find({ project: { $in: projectIds } }).populate('assignedTo', 'name');

    const now = new Date();
    const byStatus = { 'To Do': 0, 'In Progress': 0, 'Done': 0 };
    const byUser = {};
    let overdue = 0;

    tasks.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.assignedTo) {
        const key = t.assignedTo.name;
        byUser[key] = (byUser[key] || 0) + 1;
      }
      if (t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done') overdue++;
    });

    res.json({ total: tasks.length, byStatus, byUser, overdue, projects: projects.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Users list (for assigning tasks) ────────────────────────────────────────

app.get('/api/projects/:projectId/users', auth, canAccessProject, async (req, res) => {
  const project = await Project.findById(req.params.projectId)
    .populate('admin', 'name email').populate('members', 'name email');
  res.json([project.admin, ...project.members]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
