import { useState } from 'react';
import { api } from './api';

export function Login({ onLogin }: { onLogin: (token: string, name: string) => void }) {
  const [email, setEmail] = useState('manager@demo.eg');
  const [password, setPassword] = useState('password123');
  const [err, setErr] = useState('');

  async function submit() {
    try {
      const { token, name } = await api.login(email, password);
      onLogin(token, name);
    } catch {
      setErr('Invalid credentials');
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h2><span className="brand-dot" /> Meshwar <span style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 700 }}>مشوار</span></h2>
        <div className="subtle" style={{ marginBottom: 6 }}>Manager &amp; cashier dashboard</div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" onKeyDown={(e) => e.key === 'Enter' && submit()} />
        {err && <div className="err">{err}</div>}
        <button className="pill-btn" onClick={submit}>Sign in</button>
      </div>
    </div>
  );
}
