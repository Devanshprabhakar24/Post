import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import useMagnet from '../hooks/useMagnet';
import { useAuth } from '../context/AuthContext';
import { isValidEmail, validateTestOtp } from '../lib/authValidation';

function InputField({ id, label, type = 'text', value, onChange, error, children }) {
    return (
        <label htmlFor={id} className="block space-y-1">
            <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-mist">{label}</span>
            <div className="group rounded-xl border border-mist/35 px-3 py-2 transition focus-within:border-volt">
                <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    className="w-full bg-transparent font-ui text-sm uppercase tracking-[0.06em] text-paper placeholder:text-mist/70 focus:outline-none"
                />
                {children}
            </div>
            {error && <p className="ui-font text-[10px] uppercase tracking-[0.14em] text-ember">{error}</p>}
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
        <section className="grid min-h-[85vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-mist/35 lg:grid-cols-2">
            <div className="relative hidden overflow-hidden bg-ink lg:block">
                <div className="absolute inset-0 animate-[hue-rotate_8s_linear_infinite] bg-[radial-gradient(circle_at_20%_20%,rgba(200,241,53,0.2),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,107,53,0.26),transparent_50%),radial-gradient(circle_at_50%_50%,rgba(245,240,232,0.08),transparent_45%)]" />
                <p className="absolute left-6 top-1/2 -translate-y-1/2 font-display text-8xl leading-none tracking-[0.08em] text-paper [writing-mode:vertical-rl]">
                    POST EXPLORER
                </p>
            </div>

            <motion.form
                initial={reduced ? { opacity: 1 } : { opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={onSubmit}
                className="flex flex-col justify-center gap-4 bg-paper px-6 py-10"
            >
                <h1 className="font-display text-6xl leading-none text-ink">LOGIN</h1>
                <p className="font-body text-lg italic text-mist">Welcome to the live editorial feed.</p>

                <InputField
                    id="email"
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(event) => {
                        const value = event.target.value;
                        setForm((prev) => ({ ...prev, email: value }));
                        setEmailError(isValidEmail(value) ? '' : 'Enter a valid email address');
                    }}
                    error={emailError}
                />

                <label htmlFor="password" className="block space-y-1">
                    <span className="ui-font text-[10px] uppercase tracking-[0.18em] text-mist">Password</span>
                    <div className="group relative rounded-xl border border-mist/35 px-3 py-2 transition focus-within:border-volt">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            className="w-full bg-transparent pr-10 font-ui text-sm uppercase tracking-[0.06em] text-paper focus:outline-none"
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
                    className="magnetic-hit mt-2 overflow-hidden rounded-full border border-volt/80 bg-volt px-5 py-3 ui-font text-xs uppercase tracking-[0.16em] text-ink disabled:opacity-60"
                >
                    {loading ? 'Signing in...' : showOtp ? 'Verify & Login' : 'Continue'}
                </motion.button>

                <p className="ui-font text-xs uppercase tracking-[0.12em] text-mist">
                    No account? <Link to="/register" className="text-volt">Register</Link>
                </p>
            </motion.form>
        </section>
    );
}
