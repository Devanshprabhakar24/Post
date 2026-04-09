import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isValidEmail, validateTestOtp } from '../lib/authValidation';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
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

    const handleEmailChange = (value) => {
        setForm((previous) => ({ ...previous, email: value }));

        if (!value) {
            setEmailError('');
            return;
        }

        if (!isValidEmail(value)) {
            setEmailError('Enter a valid email address');
            return;
        }

        setEmailError('');
    };

    const onSubmit = async (event) => {
        event.preventDefault();

        if (!isValidEmail(form.email)) {
            setEmailError('Enter a valid email address');
            toast.error('Enter a valid email address');
            return;
        }

        if (!showOtp) {
            setShowOtp(true);
            toast('Enter the test OTP to continue');
            return;
        }

        if (!validateTestOtp(form.otp)) {
            setOtpError('OTP must be 123456');
            toast.error('OTP must be 123456');
            return;
        }

        setLoading(true);

        try {
            await login(form);
            toast.success('Welcome back');
            const nextPath = location.state?.from || '/';
            navigate(nextPath, { replace: true });
        } catch (error) {
            toast.error(error.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-12 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl"
        >
            <h1 className="text-2xl font-semibold text-white">Login</h1>
            <p className="mt-1 text-sm text-slate-300">Sign in to continue your realtime feed.</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                <div>
                    <label htmlFor="email" className="mb-1 block text-sm text-slate-300">Email</label>
                    <input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(event) => handleEmailChange(event.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-white outline-none focus:border-cyan-400"
                    />
                    {emailError && <p className="mt-1 text-xs text-rose-300">{emailError}</p>}
                </div>
                <div>
                    <label htmlFor="password" className="mb-1 block text-sm text-slate-300">Password</label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="current-password"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={form.password}
                            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 pr-11 text-white outline-none focus:border-cyan-400"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((previous) => !previous)}
                            className="absolute inset-y-0 right-0 inline-flex items-center justify-center px-3 text-slate-400 transition hover:text-white"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Passwords are stored and sent securely through the backend auth flow.</p>
                </div>

                {showOtp && (
                    <div>
                        <label htmlFor="otp" className="mb-1 block text-sm text-slate-300">OTP</label>
                        <input
                            id="otp"
                            inputMode="numeric"
                            maxLength={6}
                            required
                            value={form.otp}
                            onChange={(event) => {
                                setForm((previous) => ({ ...previous, otp: event.target.value }));
                                if (otpError) {
                                    setOtpError('');
                                }
                            }}
                            placeholder="123456"
                            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-white outline-none focus:border-cyan-400"
                        />
                        <p className="mt-1 text-xs text-slate-400">Test OTP: 123456</p>
                        {otpError && <p className="mt-1 text-xs text-rose-300">{otpError}</p>}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 px-4 py-2 font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {loading ? 'Signing in...' : showOtp ? 'Verify & Login' : 'Continue'}
                </button>
            </form>

            <p className="mt-4 text-sm text-slate-300">
                No account?{' '}
                <Link to="/register" className="text-cyan-300 hover:text-cyan-200">Register</Link>
            </p>
        </motion.section>
    );
}
