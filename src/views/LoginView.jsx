import React, { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Stethoscope,
  UserRound,
} from 'lucide-react';

const inputClass = 'h-14 w-full rounded-lg border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100';
const iconInputClass = `${inputClass} pl-12`;

const AuthField = ({ icon: Icon, className = '', children, ...props }) => (
  <label className="group relative block">
    {Icon && (
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-cyan-600">
        <Icon size={19} />
      </span>
    )}
    <input className={`${Icon ? iconInputClass : inputClass} ${className}`} {...props} />
    {children}
  </label>
);

const SubmitButton = ({ children, loading, ...props }) => (
  <button
    type="submit"
    className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-base font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 ease-out hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    disabled={loading}
    {...props}
  >
    {loading ? <Loader2 size={20} className="animate-spin" /> : children}
  </button>
);

const ConfigNotice = ({ hasSupabaseConfig, supabaseConfigStatus }) => {
  if (hasSupabaseConfig) {
    return (
      <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
        <BadgeCheck size={14} />
        <span>Live backend connected</span>
      </div>
    );
  }

  const missing = supabaseConfigStatus?.missing?.join(', ') || 'Supabase environment variables';
  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
      Missing live backend config: {missing}.
    </div>
  );
};

export default function LoginView({
  onLogin,
  showToast,
  supabase,
  hasSupabaseConfig,
  supabaseConfigStatus,
  loadUserProfile,
  saveUserProfile,
  normalizeEmail,
  friendlyNetworkError,
  specialtyOptions = [],
  appIcon,
}) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('patient');
  const [specialty, setSpecialty] = useState(specialtyOptions[0] || 'General Physician');
  const [price, setPrice] = useState('');
  const [doctorUpi, setDoctorUpi] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!supabase) {
        throw new Error('Live Supabase auth is not configured. Add VITE_SUPABASE_URL and a publishable or anon key in Vercel.');
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) throw loginError;

      const profile = await loadUserProfile(data.user);
      onLogin(profile);
    } catch (err) {
      setError(friendlyNetworkError(err, 'Unable to sign in. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email, and password.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (role === 'doctor') {
      const consultationFee = Number(price);
      if (!Number.isFinite(consultationFee) || consultationFee <= 0) {
        setError('Doctors must set a valid consultation fee.');
        return;
      }
      if (!doctorUpi.trim()) {
        setError('Doctors must provide a UPI ID for payouts.');
        return;
      }
    }

    if (!supabase) {
      setError('Live Supabase auth is not configured. Add VITE_SUPABASE_URL and a publishable or anon key in Vercel.');
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const registration = {
      name: name.trim(),
      phone: phone.trim(),
      role,
      specialty,
      price,
      doctorUpi,
      email: normalizedEmail,
      password,
    };

    setLoading(true);
    setError('');
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: registration.name,
            phone: registration.phone,
            role,
            district: 'Dimapur',
            specialty: role === 'doctor' ? specialty : undefined,
            consultationFee: role === 'doctor' ? Number(price) : undefined,
            doctorUpi: role === 'doctor' ? doctorUpi.trim() : undefined,
          },
          emailRedirectTo: window.location.origin,
        },
      });
      if (signUpError) throw signUpError;
      if (!data?.user) throw new Error('Live auth did not return a new user.');

      if (!data.session) {
        showToast?.('Account created. Verify your email, then sign in.', 'success');
        setMode('login');
        return;
      }

      const currentUser = await saveUserProfile(data.user, {
        name: registration.name,
        phone: registration.phone,
        role,
        district: 'Dimapur',
      });
      showToast?.(`Welcome to Rapha'l, ${currentUser.name}!`, 'success');
      onLogin(currentUser);
    } catch (err) {
      setError(friendlyNetworkError(err, 'Unable to create account on the live server.'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail) {
      setError('Enter your email address first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (!supabase) {
        throw new Error('Live Supabase auth is not configured. Password reset requires the live backend.');
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      showToast?.('Password reset email sent.', 'info');
      setMode('login');
    } catch (err) {
      setError(friendlyNetworkError(err, 'Unable to send reset email.'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setError('');
    setMode(nextMode);
    if (nextMode === 'forgot' && email && !resetEmail) setResetEmail(email);
  };

  return (
    <div className="auth-screen min-h-screen w-full overflow-y-auto px-5 py-8 font-sans">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-8 text-center view-panel">
          {appIcon && (
            <img
              src={appIcon}
              alt="Rapha'l"
              className="mx-auto mb-4 h-16 w-16 rounded-lg object-cover shadow-lg shadow-cyan-900/10"
            />
          )}
          <h1 className="text-4xl font-black text-slate-950">Rapha'l</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">Doctor appointments, payments, and updates.</p>
        </div>

        <section className="auth-form-surface view-panel">
          <ConfigNotice hasSupabaseConfig={hasSupabaseConfig} supabaseConfigStatus={supabaseConfigStatus} />

          {mode === 'login' && (
            <form key="login" onSubmit={handleLoginSubmit} className="auth-mode-panel space-y-4">
              <div className="mb-5 text-center">
                <h2 className="text-2xl font-black text-slate-950">Log in</h2>
              </div>

              <AuthField
                icon={Mail}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <AuthField
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-12"
                required
              >
                <button
                  type="button"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-cyan-700"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </AuthField>

              {error && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-bold leading-relaxed text-red-700">{error}</div>}

              <SubmitButton loading={loading}>Continue</SubmitButton>

              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="h-11 w-full rounded-lg text-sm font-black text-cyan-700 transition-colors hover:bg-cyan-50 hover:text-cyan-900"
              >
                Forgot password?
              </button>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm transition-all hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
                >
                  Create new account <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot' && (
            <form key="forgot" onSubmit={handlePasswordReset} className="auth-mode-panel space-y-4">
              <div className="mb-5 text-center">
                <h2 className="text-2xl font-black text-slate-950">Reset password</h2>
              </div>

              <AuthField
                icon={Mail}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email address"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                required
              />

              {error && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-bold leading-relaxed text-red-700">{error}</div>}

              <SubmitButton loading={loading}>Send reset link</SubmitButton>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="h-11 w-full rounded-lg text-sm font-black text-slate-500 transition-colors hover:bg-slate-50 hover:text-cyan-700"
              >
                Back to login
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form key="register" onSubmit={handleRegisterSubmit} className="auth-mode-panel space-y-4">
              <div className="mb-5 text-center">
                <h2 className="text-2xl font-black text-slate-950">Create account</h2>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {[
                  { id: 'patient', label: 'Patient', icon: UserRound },
                  { id: 'doctor', label: 'Doctor', icon: Stethoscope },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    className={`flex h-11 items-center justify-center gap-2 rounded-md text-sm font-black transition-all ${role === id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-cyan-700'}`}
                  >
                    {React.createElement(Icon, { size: 16 })}
                    {label}
                  </button>
                ))}
              </div>

              <AuthField
                icon={UserRound}
                type="text"
                autoComplete="name"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />

              <AuthField
                icon={Phone}
                type="tel"
                autoComplete="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />

              {role === 'doctor' && (
                <div className="space-y-3 rounded-lg border border-cyan-100 bg-cyan-50 p-3">
                  <select
                    value={specialty}
                    onChange={(event) => setSpecialty(event.target.value)}
                    className={`${inputClass} appearance-none bg-white`}
                  >
                    {specialtyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Consultation fee"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="UPI ID"
                    value={doctorUpi}
                    onChange={(event) => setDoctorUpi(event.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <AuthField
                icon={Mail}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <AuthField
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-12"
                required
              >
                <button
                  type="button"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-cyan-700"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </AuthField>

              {error && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-center text-xs font-bold leading-relaxed text-red-700">{error}</div>}

              <SubmitButton loading={loading}>Create account</SubmitButton>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="h-11 w-full rounded-lg text-sm font-black text-slate-500 transition-colors hover:bg-slate-50 hover:text-cyan-700"
              >
                Back to login
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
