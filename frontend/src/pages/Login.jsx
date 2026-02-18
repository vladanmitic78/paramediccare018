import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const { login } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Trim whitespace from inputs (helps with mobile keyboard issues)
    const email = formData.email.trim().toLowerCase();
    const password = formData.password.trim();
    
    try {
      if (isLogin) {
        const user = await login(email, password);
        toast.success(language === 'sr' ? 'Uspešna prijava!' : 'Login successful!');
        
        // Check if on mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        
        // Redirect based on role and device
        if (isMobile) {
          // Admin/superadmin can choose - for now redirect to responsive dashboard
          if (['admin', 'superadmin'].includes(user.role)) {
            // Admin on mobile goes to dashboard (it has mobile responsive design)
            navigate('/dashboard');
          } else {
            // Other mobile users go to unified PWA
            navigate('/app');
          }
        } else {
          // Desktop users go to role-specific pages
          if (user.role === 'driver') {
            navigate('/driver');
          } else if (['doctor', 'nurse'].includes(user.role)) {
            navigate('/medical');
          } else if (['admin', 'superadmin'].includes(user.role)) {
            navigate('/dashboard');
          } else {
            navigate('/patient');
          }
        }
      } else {
        // Registration - now returns message instead of token
        const response = await axios.post(`${API}/api/auth/register`, {
          email: email,
          password: password,
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          language: language
        });
        
        if (response.data.requires_verification) {
          setRegistrationSuccess(true);
          toast.success(language === 'sr' 
            ? 'Proverite vaš email za verifikaciju!' 
            : 'Check your email for verification!');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri autentifikaciji' : 'Authentication error'));
    } finally {
      setLoading(false);
    }
  };

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <div className="w-full max-w-md text-center">
          {/* Logo */}
          <div className="mb-8">
            <Link to="/">
              <img 
                src="https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg"
                alt="Paramedic Care 018"
                className="h-16 w-auto mx-auto"
              />
            </Link>
          </div>
          
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
              <Mail className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              {language === 'sr' ? 'Proverite Vaš Email!' : 'Check Your Email!'}
            </h1>
            
            <p className="text-slate-500 mb-6">
              {language === 'sr' 
                ? `Poslali smo verifikacioni link na ${formData.email}. Kliknite na link da aktivirate vaš nalog.`
                : `We've sent a verification link to ${formData.email}. Click the link to activate your account.`}
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-amber-800 text-sm">
                <strong>{language === 'sr' ? 'Napomena:' : 'Note:'}</strong>{' '}
                {language === 'sr' 
                  ? 'Link za verifikaciju ističe za 24 sata. Proverite i spam folder.'
                  : 'The verification link expires in 24 hours. Check your spam folder too.'}
              </p>
            </div>
            
            <Button 
              onClick={() => {
                setRegistrationSuccess(false);
                setIsLogin(true);
              }}
              variant="outline"
              className="w-full py-6 rounded-xl"
            >
              {language === 'sr' ? 'Nazad na prijavu' : 'Back to Login'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" data-testid="login-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img 
              src="https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg"
              alt="Paramedic Care 018"
              className="h-20 w-auto object-contain mx-auto"
            />
          </Link>
        </div>

        {/* Form Card */}
        <div className="card-base">
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {isLogin ? t('auth_login') : t('auth_register')}
          </h1>
          <p className="text-slate-600 text-center mb-8">
            {isLogin 
              ? (language === 'sr' ? 'Dobrodošli nazad' : 'Welcome back')
              : (language === 'sr' ? 'Kreirajte novi nalog' : 'Create a new account')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {t('auth_name')} *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder={language === 'sr' ? 'Puno ime' : 'Full name'}
                      className="pl-10"
                      required={!isLogin}
                      data-testid="register-name-input"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    {t('auth_phone')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+381..."
                      className="pl-10"
                      data-testid="register-phone-input"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {t('auth_email')} *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                  className="pl-10"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">
                  {t('auth_password')} *
                </label>
                {isLogin && (
                  <Link 
                    to="/forgot-password" 
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                    data-testid="forgot-password-link"
                  >
                    {language === 'sr' ? 'Zaboravili ste lozinku?' : 'Forgot password?'}
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
              data-testid="auth-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'sr' ? 'Učitavanje...' : 'Loading...'}
                </>
              ) : (
                isLogin ? t('auth_submit_login') : t('auth_submit_register')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600 text-sm">
              {isLogin ? t('auth_no_account') : t('auth_have_account')}{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sky-600 hover:text-sky-700 font-medium"
                data-testid="toggle-auth-mode"
              >
                {isLogin ? t('auth_register') : t('auth_login')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
