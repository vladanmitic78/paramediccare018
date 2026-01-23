import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2, Mail, Lock, User, Phone } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const { login, register } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
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
    
    try {
      if (isLogin) {
        const user = await login(formData.email, formData.password);
        toast.success(language === 'sr' ? 'Uspešna prijava!' : 'Login successful!');
        
        // Redirect based on role
        if (['admin', 'superadmin', 'doctor', 'nurse', 'driver'].includes(user.role)) {
          navigate('/dashboard');
        } else {
          // Regular users go to patient portal
          navigate('/patient');
        }
      } else {
        await register(formData.email, formData.password, formData.full_name, formData.phone, language);
        toast.success(language === 'sr' ? 'Uspešna registracija!' : 'Registration successful!');
        // New users go to patient portal
        navigate('/patient');
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.detail || (language === 'sr' ? 'Greška pri autentifikaciji' : 'Authentication error'));
    } finally {
      setLoading(false);
    }
  };

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
              <label className="text-sm font-medium text-slate-700">
                {t('auth_password')} *
              </label>
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

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs text-slate-500 text-center mb-3 font-medium uppercase tracking-wide">
            {language === 'sr' ? 'Demo Pristup' : 'Demo Access'}
          </p>
          
          <div className="space-y-3">
            {/* Super Admin */}
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-red-700">Super Admin</span>
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  {language === 'sr' ? 'Puna kontrola' : 'Full control'}
                </span>
              </div>
              <p className="text-xs text-slate-700 font-mono">admin@paramedic-care018.rs</p>
              <p className="text-xs text-slate-500 font-mono">Admin123!</p>
            </div>

            {/* Admin */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-purple-700">Admin</span>
                <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                  {language === 'sr' ? 'Upravljanje' : 'Management'}
                </span>
              </div>
              <p className="text-xs text-slate-700 font-mono">office@paramedic-care018.rs</p>
              <p className="text-xs text-slate-500 font-mono">Office123!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
