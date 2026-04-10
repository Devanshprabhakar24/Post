import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import useMagnet from '../hooks/useMagnet';
import { useAuth } from '../context/AuthContext';
import {
    PASSWORD_RULES,
    isValidEmail,
    validatePassword,
    validateTestOtp
} from '../lib/authValidation';

export default function Register() {
    const navigate = useNavigate();
    const reduced = useReducedMotion();
    const magnet = useMagnet();
    const { isAuthenticated, register } = useAuth();

    const [form, setForm] = useState({ name: '', email: '', password: '', otp: '' });
    const [loading, setLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [otpError, setOtpError] = useState('');

    const passwordState = useMemo(() => validatePassword(form.password), [form.password]);
    const passwordScore = Object.values(passwordState.checks).filter(Boolean).length;

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const onSubmit = async (event) => {
        event.preventDefault();

        if (!form.name.trim()) {
            toast.error('Name is required');
            return;
        }

        if (!isValidEmail(form.email)) {
            setEmailError('Enter a valid email address');
            return;
        }

        if (!passwordState.valid) {
            toast.error('Password does not meet the required policy');
            return;
        }

        if (!showOtp) {
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
            await register(form);
            toast.success('Account created successfully');
            navigate('/', { replace: true });
        } catch (error) {
            toast.error(error.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="grid min-h-[85vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-[0_30px_90px_rgba(0,0,0,0.18)] lg:grid-cols-2">
            <div className="relative min-h-[140px] overflow-hidden bg-[#040507] lg:min-h-0">
                <div className="absolute inset-0 animate-[hue-rotate_10s_linear_infinite] bg-[radial-gradient(circle_at_20%_20%,rgba(200,241,53,0.12),transparent_44%),radial-gradient(circle_at_70%_70%,rgba(255,107,53,0.18),transparent_48%),radial-gradient(circle_at_50%_45%,rgba(245,240,232,0.04),transparent_55%)]" />
                <p className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center font-display text-5xl leading-none tracking-[0.08em] text-white/95 lg:left-6 lg:w-auto lg:translate-x-0 lg:text-8xl lg:text-white/92 [writing-mode:horizontal-tb] lg:[writing-mode:vertical-rl]">
                    POST EXPLORER
                </p>
            </div>

            <motion.form
                initial={reduced ? { opacity: 1 } : { opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={onSubmit}
                className="flex flex-col justify-center gap-3 bg-[var(--bg-card)] px-6 py-10 text-[var(--text-primary)]"
            >
                <h1 className="font-display text-6xl leading-none text-[var(--text-primary)]">REGISTER</h1>
                <p className="font-body text-lg italic text-[var(--text-secondary)]">Build your profile for the live feed.</p>

                <label className="space-y-1">
                    <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Name</span>
                    <input
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-3 py-2 font-ui text-sm uppercase tracking-[0.06em] text-[var(--text-primary)] focus:border-volt focus:outline-none dark:bg-[rgba(255,255,255,0.03)]"
                    />
                </label>

                <label className="space-y-1">
                    <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Email</span>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(event) => {
                            const value = event.target.value;
                            setForm((prev) => ({ ...prev, email: value }));
                            setEmailError(isValidEmail(value) ? '' : 'Enter a valid email address');
                        }}
                        className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-3 py-2 font-ui text-sm tracking-[0.06em] text-[var(--text-primary)] focus:border-volt focus:outline-none dark:bg-[rgba(255,255,255,0.03)]"
                    />
                    {emailError && <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-[var(--accent-red)]">{emailError}</p>}
                </label>

                <label className="space-y-1">
                    <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">Password</span>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-3 py-2 pr-10 font-ui text-sm tracking-[0.06em] text-[var(--text-primary)] focus:border-volt focus:outline-none dark:bg-[rgba(255,255,255,0.03)]"
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

                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] p-3">
                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[var(--border-soft)]">
                        <span className="block h-full bg-volt" style={{ width: `${(passwordScore / PASSWORD_RULES.length) * 100}%` }} />
                    </div>
                    <div className="grid gap-1">
                        {PASSWORD_RULES.map((rule) => (
                            <p key={rule.key} className={`ui-font text-[10px] uppercase tracking-[0.14em] ${passwordState.checks[rule.key] ? 'text-[var(--accent-green)]' : 'text-[var(--text-tertiary)]'}`}>
                                {passwordState.checks[rule.key] ? '✓' : '•'} {rule.label}
                            </p>
                        ))}
                    </div>
                </div>

                {showOtp && (
                    <label className="space-y-1">
                        <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">OTP</span>
                        <input
                            value={form.otp}
                            onChange={(event) => {
                                setForm((prev) => ({ ...prev, otp: event.target.value }));
                                setOtpError('');
                            }}
                            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card-soft)] px-3 py-2 font-ui text-sm uppercase tracking-[0.06em] text-[var(--text-primary)] focus:border-volt focus:outline-none dark:bg-[rgba(255,255,255,0.03)]"
                        />
                        {otpError && <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-[var(--accent-red)]">{otpError}</p>}
                    </label>
                )}

                <motion.button
                    ref={magnet.ref}
                    style={magnet.style}
                    onMouseMove={magnet.onMouseMove}
                    onMouseLeave={magnet.onMouseLeave}
                    type="submit"
                    disabled={loading}
                    className="magnetic-hit mt-2 rounded-full border border-volt/80 bg-volt px-5 py-3 ui-font text-xs uppercase tracking-[0.16em] text-[#090b10] disabled:opacity-60"
                >
                    {loading ? 'Creating...' : showOtp ? 'Verify & Register' : 'Continue'}
                </motion.button>

                <p className="ui-font text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    Already have an account? <Link to="/login" className="text-volt hover:underline">Login</Link>
                </p>
            </motion.form>
        </section>
    );
}
