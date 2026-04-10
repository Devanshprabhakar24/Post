import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import useMagnet from '../hooks/useMagnet';
import { useAuth } from '../context/AuthContext';
import { isValidEmail, validateTestOtp } from '../lib/authValidation';

function InputField({ id, label, type = 'text', value, onChange, error, children, preserveCase = false }) {
    return (
        <label htmlFor={id} className="block space-y-1">
            <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{label}</span>
            <div className="group rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-3 py-2 transition focus-within:border-volt dark:bg-[rgba(255,255,255,0.03)]">
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    className={`w-full bg-transparent font-ui text-sm tracking-[0.06em] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none ${preserveCase ? '' : 'uppercase'}`}
                />
                {children}
            </div>
            {error && <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-[var(--accent-red)]">{error}</p>}
        </label>
    );
}

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const reduced = useReducedMotion();
    const magnet = useMagnet();
    const { isAuthenticated, login } = useAuth();

    const [form, setForm] = useState({ email: '', password: '', otp: '' });
    const [loading, setLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [otpError, setOtpError] = useState('');

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const onSubmit = async (event) => {
        event.preventDefault();

        if (!isValidEmail(form.email)) {
            setEmailError('Enter a valid email address');
            return;
        }

        if (!showOtp) {
            if (!String(form.password || '').trim()) {
                toast.error('Password is required');
                return;
            }

            setShowOtp(true);
            toast('Enter the test OTP to continue');
            return;
        }

        if (!validateTestOtp(form.otp)) {
            setOtpError('OTP must be 123456');
            return;
        }

        setLoading(true);
        try {
            await login(form);
            toast.success('Welcome back');
            navigate(location.state?.from || '/', { replace: true });
        } catch (error) {
            toast.error(error.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="grid min-h-[85vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-[0_30px_90px_rgba(0,0,0,0.18)] lg:grid-cols-2">
            <div className="relative min-h-[140px] overflow-hidden bg-[#040507] lg:min-h-0">
                <div className="absolute inset-0 animate-[hue-rotate_8s_linear_infinite] bg-[radial-gradient(circle_at_20%_20%,rgba(200,241,53,0.12),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,107,53,0.18),transparent_50%),radial-gradient(circle_at_50%_50%,rgba(245,240,232,0.04),transparent_45%)]" />
                <p className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center font-display text-5xl leading-none tracking-[0.08em] text-white/95 lg:left-6 lg:w-auto lg:translate-x-0 lg:text-8xl lg:text-white/92 [writing-mode:horizontal-tb] lg:[writing-mode:vertical-rl]">
                    POST EXPLORER
                </p>
            </div>

            <motion.form
                initial={reduced ? { opacity: 1 } : { opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={onSubmit}
                className="flex flex-col justify-center gap-4 bg-[var(--bg-card)] px-6 py-10 text-[var(--text-primary)]"
            >
                <h1 className="font-display text-6xl leading-none text-[var(--text-primary)]">LOGIN</h1>
                <p className="font-body text-lg italic text-[var(--text-secondary)]">Welcome to the live editorial feed.</p>

                <InputField
                    id="email"
                    label="Email"
                    type="email"
                    preserveCase
                    value={form.email}
                    onChange={(event) => {
                        const value = event.target.value;
                        setForm((prev) => ({ ...prev, email: value }));
                        setEmailError(isValidEmail(value) ? '' : 'Enter a valid email address');
                    }}
                    error={emailError}
                />

                <label htmlFor="password" className="block space-y-1">
                    <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Password</span>
                    <div className="group relative rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-3 py-2 transition focus-within:border-volt dark:bg-[rgba(255,255,255,0.03)]">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            className="w-full bg-transparent pr-10 font-ui text-sm tracking-[0.06em] text-[var(--text-primary)] focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </label>

                {showOtp && (
                    <InputField
                        id="otp"
                        label="OTP"
                        value={form.otp}
                        onChange={(event) => {
                            setForm((prev) => ({ ...prev, otp: event.target.value }));
                            setOtpError('');
                        }}
                        error={otpError}
                    />
                )}

                <motion.button
                    ref={magnet.ref}
                    style={magnet.style}
                    onMouseMove={magnet.onMouseMove}
                    onMouseLeave={magnet.onMouseLeave}
                    type="submit"
                    disabled={loading}
                    className="magnetic-hit mt-2 overflow-hidden rounded-full border border-volt/80 bg-volt px-5 py-3 ui-font text-xs uppercase tracking-[0.16em] text-[#090b10] disabled:opacity-60"
                >
                    {loading ? 'Signing in...' : showOtp ? 'Verify & Login' : 'Continue'}
                </motion.button>

                <p className="ui-font text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    No account? <Link to="/register" className="text-volt hover:underline">Register</Link>
                </p>
            </motion.form>
        </section>
    );
}
