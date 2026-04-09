import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import useMagnet from '../hooks/useMagnet';
import { useAuth } from '../context/AuthContext';
import {
    PASSWORD_RULES,
    isEmailVerified,
    isValidEmail,
    markEmailVerified,
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

        if (isEmailVerified(form.email)) {
            toast.error('This email can only be used once in the test flow');
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
            markEmailVerified(form.email);
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
        <section className="grid min-h-[85vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-mist/35 lg:grid-cols-2">
            <div className="relative hidden overflow-hidden bg-ink lg:block">
                <div className="absolute inset-0 animate-[hue-rotate_10s_linear_infinite] bg-[radial-gradient(circle_at_20%_20%,rgba(200,241,53,0.22),transparent_44%),radial-gradient(circle_at_70%_70%,rgba(255,107,53,0.24),transparent_48%),radial-gradient(circle_at_50%_45%,rgba(245,240,232,0.08),transparent_55%)]" />
                <p className="absolute left-6 top-1/2 -translate-y-1/2 font-display text-8xl leading-none tracking-[0.08em] text-paper [writing-mode:vertical-rl]">
                    POST EXPLORER
                </p>
            </div>

            <motion.form
                initial={reduced ? { opacity: 1 } : { opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={onSubmit}
                className="flex flex-col justify-center gap-3 bg-paper px-6 py-10"
            >
                <h1 className="font-display text-6xl leading-none text-ink">REGISTER</h1>
                <p className="font-body text-lg italic text-mist">Build your profile for the live feed.</p>

                <label className="space-y-1">
                    <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-mist">Name</span>
                    <input
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        className="w-full rounded-xl border border-mist/35 bg-transparent px-3 py-2 font-ui text-sm uppercase tracking-[0.06em] text-paper focus:border-volt focus:outline-none"
                    />
                </label>

                <label className="space-y-1">
                    <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-mist">Email</span>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(event) => {
                            const value = event.target.value;
                            setForm((prev) => ({ ...prev, email: value }));
                            setEmailError(isValidEmail(value) ? '' : 'Enter a valid email address');
                        }}
                        className="w-full rounded-xl border border-mist/35 bg-transparent px-3 py-2 font-ui text-sm uppercase tracking-[0.06em] text-paper focus:border-volt focus:outline-none"
                    />
                    {emailError && <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-ember">{emailError}</p>}
                </label>

                <label className="space-y-1">
                    <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-mist">Password</span>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            className="w-full rounded-xl border border-mist/35 bg-transparent px-3 py-2 pr-10 font-ui text-sm uppercase tracking-[0.06em] text-paper focus:border-volt focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-mist"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </label>

                <div className="rounded-xl border border-mist/30 p-3">
                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-mist/20">
                        <span className="block h-full bg-volt" style={{ width: `${(passwordScore / PASSWORD_RULES.length) * 100}%` }} />
                    </div>
                    <div className="grid gap-1">
                        {PASSWORD_RULES.map((rule) => (
                            <p key={rule.key} className={`ui-font text-[10px] uppercase tracking-[0.14em] ${passwordState.checks[rule.key] ? 'text-volt' : 'text-mist'}`}>
                                {passwordState.checks[rule.key] ? '✓' : '•'} {rule.label}
                            </p>
                        ))}
                    </div>
                </div>

                {showOtp && (
                    <label className="space-y-1">
                        <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-mist">OTP</span>
                        <input
                            value={form.otp}
                            onChange={(event) => {
                                setForm((prev) => ({ ...prev, otp: event.target.value }));
                                setOtpError('');
                            }}
                            className="w-full rounded-xl border border-mist/35 bg-transparent px-3 py-2 font-ui text-sm uppercase tracking-[0.06em] text-paper focus:border-volt focus:outline-none"
                        />
                        {otpError && <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-ember">{otpError}</p>}
                    </label>
                )}

                <motion.button
                    ref={magnet.ref}
                    style={magnet.style}
                    onMouseMove={magnet.onMouseMove}
                    onMouseLeave={magnet.onMouseLeave}
                    type="submit"
                    disabled={loading}
                    className="magnetic-hit mt-2 rounded-full border border-volt/80 bg-volt px-5 py-3 ui-font text-xs uppercase tracking-[0.16em] text-ink disabled:opacity-60"
                >
                    {loading ? 'Creating...' : showOtp ? 'Verify & Register' : 'Continue'}
                </motion.button>

                <p className="ui-font text-xs uppercase tracking-[0.12em] text-mist">
                    Already have an account? <Link to="/login" className="text-volt">Login</Link>
                </p>
            </motion.form>
        </section>
    );
}
