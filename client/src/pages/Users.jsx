import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/client';
import { getMaskedEmail, getPrivateCandidateLabel } from '../utils/privacy';
import './Users.css';

export default function Users() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isRecruiter = user?.role === 'recruiter';
  const [users, setUsers] = useState([]);
  const [recoveryRequests, setRecoveryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [recruiterForm, setRecruiterForm] = useState({ name: '', email: '', password: '' });
  const [adminMessage, setAdminMessage] = useState('');
  const [recruiterMessage, setRecruiterMessage] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [creatingRecruiter, setCreatingRecruiter] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [recoveryForm, setRecoveryForm] = useState({ candidateId: '', email: '', password: '' });
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replySendingId, setReplySendingId] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setError('');
      const [list, requests] = await Promise.all([
        usersApi.list(),
        usersApi.listRecoveryRequests(),
      ]);
      setUsers(list);
      setRecoveryRequests(requests);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleRemove(targetUser) {
    const ok = window.confirm(`Remove user ${targetUser.email}? This will also remove related data.`);
    if (!ok) return;

    setBusyId(targetUser.id);
    setError('');
    try {
      await usersApi.remove(targetUser.id);
      await loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setCreatingAdmin(true);
    setError('');
    setAdminMessage('');

    try {
      const response = await usersApi.createAdmin(adminForm);
      setAdminForm({ name: '', email: '', password: '' });
      setAdminMessage(`Admin created successfully for ${response.user.email}.`);
      await loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function handleCreateRecruiter(e) {
    e.preventDefault();
    setCreatingRecruiter(true);
    setError('');
    setRecruiterMessage('');

    try {
      const response = await usersApi.createRecruiter(recruiterForm);
      setRecruiterForm({ name: '', email: '', password: '' });
      setRecruiterMessage(`Recruiter created successfully for ${response.user.email}.`);
      await loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreatingRecruiter(false);
    }
  }

  async function handleRecoverySubmit(e) {
    e.preventDefault();
    if (!recoveryForm.candidateId) return;

    setRecovering(true);
    setError('');
    setRecoveryMessage('');

    try {
      const payload = {};
      if (recoveryForm.email.trim()) payload.email = recoveryForm.email.trim();
      if (recoveryForm.password) payload.password = recoveryForm.password;

      const response = await usersApi.updateRecovery(recoveryForm.candidateId, payload);
      setRecoveryForm({ candidateId: '', email: '', password: '' });
      setRecoveryMessage(`Candidate account updated for ${response.user.email}.`);
      await loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setRecovering(false);
    }
  }

  async function handleResolveRequest(requestId) {
    setUpdatingRequestId(requestId);
    setError('');
    try {
      await usersApi.updateRecoveryRequest(requestId, { status: 'resolved' });
      await loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingRequestId(null);
    }
  }

  async function handleSendReply(requestId) {
    const message = String(replyDrafts[requestId] || '').trim();
    if (!message) {
      setError('Enter a reply message before sending.');
      return;
    }

    setReplySendingId(requestId);
    setError('');
    try {
      await usersApi.sendRecoveryMessage(requestId, { message });
      setReplyDrafts((current) => ({ ...current, [requestId]: '' }));
      await loadUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setReplySendingId(null);
    }
  }

  function handlePrepareRecovery(request) {
    const matchedCandidateId = request.Candidate?.id ? String(request.Candidate.id) : '';
    setRecoveryForm({
      candidateId: matchedCandidateId,
      email: request.requestedEmail || '',
      password: request.requestedPassword || '',
    });

    const recoverySection = document.getElementById('candidate-recovery-form');
    if (recoverySection) {
      recoverySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const candidateUsers = users.filter((entry) => entry.role === 'candidate');
  const pendingRequests = recoveryRequests.filter((entry) => entry.status === 'pending');

  return (
    <Layout>
      <h1 className="page-title">{isRecruiter ? 'Candidate Recovery' : 'Users'}</h1>

      {isAdmin && (
        <>
          <div className="card users-actions-card">
            <h3>Create Admin</h3>
            <form className="users-admin-form" onSubmit={handleCreateAdmin}>
              <input type="text" placeholder="Admin name" value={adminForm.name} onChange={(e) => setAdminForm((current) => ({ ...current, name: e.target.value }))} required />
              <input type="email" placeholder="Enter mail" value={adminForm.email} onChange={(e) => setAdminForm((current) => ({ ...current, email: e.target.value }))} autoComplete="off" required />
              <input type="password" placeholder="Temporary password" value={adminForm.password} onChange={(e) => setAdminForm((current) => ({ ...current, password: e.target.value }))} required minLength={6} />
              <button type="submit" className="btn btn-primary" disabled={creatingAdmin}>
                {creatingAdmin ? 'Creating...' : 'Create admin'}
              </button>
            </form>
            {adminMessage && <div className="users-success">{adminMessage}</div>}
          </div>

          <div className="card users-actions-card">
            <h3>Create Recruiter</h3>
            <form className="users-admin-form" onSubmit={handleCreateRecruiter}>
              <input type="text" placeholder="Recruiter name" value={recruiterForm.name} onChange={(e) => setRecruiterForm((current) => ({ ...current, name: e.target.value }))} required />
              <input type="email" placeholder="Enter mail" value={recruiterForm.email} onChange={(e) => setRecruiterForm((current) => ({ ...current, email: e.target.value }))} autoComplete="off" required />
              <input type="password" placeholder="Temporary password" value={recruiterForm.password} onChange={(e) => setRecruiterForm((current) => ({ ...current, password: e.target.value }))} required minLength={6} />
              <button type="submit" className="btn btn-primary" disabled={creatingRecruiter}>
                {creatingRecruiter ? 'Creating...' : 'Create recruiter'}
              </button>
            </form>
            {recruiterMessage && <div className="users-success">{recruiterMessage}</div>}
          </div>
        </>
      )}

      <div className="card users-actions-card">
        <div className="users-inbox-header">
          <h3>Student Messages</h3>
          {pendingRequests.length > 0 && <span className="users-inbox-badge">{pendingRequests.length}</span>}
        </div>
        <p className="users-help-text">
          Candidates can submit recruiter-help requests from the forgot password page. Review them here before updating the account.
        </p>
        {pendingRequests.length === 0 ? (
          <p className="users-empty-note">No pending candidate requests right now.</p>
        ) : (
          <div className="users-request-list">
            {pendingRequests.map((request) => (
              <div key={request.id} className="users-request-card">
                <div className="users-request-head">
                  <div className="users-request-title-wrap">
                    <span className="users-request-sender">
                      {request.candidateName}
                      {request.Candidate?.id ? ` (${getPrivateCandidateLabel(request.Candidate)})` : ''}
                    </span>
                    <strong>{request.requestedPassword ? 'URGENT: Password Reset Request' : 'Candidate Access Request'}</strong>
                  </div>
                  <span className="users-request-time">
                    {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Pending'}
                  </span>
                </div>
                <p className="users-request-body">
                  {request.note || 'The candidate is requesting help with email or password recovery.'}
                </p>
                <div className="users-request-meta">
                  <span>Current email: {request.currentEmail ? getMaskedEmail(request.currentEmail) : 'Not provided'}</span>
                  <span>Contact email: {request.contactEmail ? getMaskedEmail(request.contactEmail) : 'Not provided'}</span>
                  <span>Mobile number: {request.mobileNumber || 'Not provided'}</span>
                  <span>Requested email: {request.requestedEmail ? getMaskedEmail(request.requestedEmail) : 'No email change requested'}</span>
                  <span>Requested password: {request.requestedPassword || 'No password requested'}</span>
                  <span>Matched candidate: {request.Candidate?.id ? getPrivateCandidateLabel(request.Candidate) : 'No candidate matched yet'}</span>
                </div>
                <div className="users-request-thread">
                  {request.Messages?.length ? (
                    [...request.Messages]
                      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                      .map((message) => (
                        <div key={message.id} className="users-request-message">
                          <div className="users-request-message-meta">
                            <strong>{message.Sender?.name || message.Sender?.email || 'Team'}</strong>
                            <span>{message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}</span>
                          </div>
                          <p>{message.message}</p>
                        </div>
                      ))
                  ) : (
                    <p className="users-request-empty-thread">No replies sent yet.</p>
                  )}
                </div>
                <div className="users-request-reply">
                  <input
                    type="text"
                    value={replyDrafts[request.id] || ''}
                    onChange={(e) => setReplyDrafts((current) => ({ ...current, [request.id]: e.target.value }))}
                    placeholder="Write your reply..."
                    aria-label="Reply message"
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSendReply(request.id)}
                    disabled={replySendingId === request.id}
                  >
                    {replySendingId === request.id ? 'Sending...' : 'Reply'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handlePrepareRecovery(request)}
                  >
                    Update access
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleResolveRequest(request.id)}
                    disabled={updatingRequestId === request.id}
                  >
                    {updatingRequestId === request.id ? 'Updating...' : 'Mark resolved'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card users-actions-card" id="candidate-recovery-form">
        <h3>{isRecruiter ? 'Recover Candidate Account' : 'Candidate Recovery'}</h3>
        <p className="users-help-text">
          Recruiters can update a candidate email, reset a temporary password, or both when the candidate loses access.
        </p>
        <form className="users-recovery-form" onSubmit={handleRecoverySubmit}>
          <select value={recoveryForm.candidateId} onChange={(e) => setRecoveryForm((current) => ({ ...current, candidateId: e.target.value }))} required>
            <option value="">Select candidate</option>
            {candidateUsers.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} ({candidate.email})
              </option>
            ))}
          </select>
          <input type="email" placeholder="New email address" value={recoveryForm.email} onChange={(e) => setRecoveryForm((current) => ({ ...current, email: e.target.value }))} />
          <input type="password" placeholder="Temporary password" value={recoveryForm.password} onChange={(e) => setRecoveryForm((current) => ({ ...current, password: e.target.value }))} minLength={6} />
          <button type="submit" className="btn btn-primary" disabled={recovering}>
            {recovering ? 'Updating...' : 'Update candidate access'}
          </button>
        </form>
        {recoveryMessage && <div className="users-success">{recoveryMessage}</div>}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <p className="empty-state">Loading...</p>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{entry.email}</td>
                  <td><span className="badge scheduled">{entry.role}</span></td>
                  <td>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '-'}</td>
                  {isAdmin && (
                    <td>
                      <button type="button" className="btn btn-danger users-remove-btn" onClick={() => handleRemove(entry)} disabled={busyId === entry.id}>
                        {busyId === entry.id ? 'Removing...' : 'Remove User'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
