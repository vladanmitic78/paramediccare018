import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2, Lock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const ResetPassword = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerifying(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/api/auth/verify-reset-token?token=${token}`);
        setTokenValid(response.data.valid);
        setEmail(response.data.email);
      } catch (error) {
        console.error('Token verification failed:', error);
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error(language === 'sr' ? 'Lozinke se ne poklapaju' : 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error(language === 'sr' ? 'Lozinka mora imati najmanje 6 karaktera' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/api/auth/reset-password`, {
        token: token,
        new_password: formData.password
      });
      
      setSuccess(true);
      toast.success(language === 'sr' ? 'Lozinka uspešno promenjena!' : 'Password changed successfully!');
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMsg = error.response?.data?.detail || (language === 'sr' ? 'Greška pri promeni lozinke' : 'Error resetting password');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto mb-4" />
          <p className="text-slate-600">
            {language === 'sr' ? 'Verifikacija linka...' : 'Verifying link...'}
          </p>
        </div>
      </div>
    );
  }

  // Invalid or missing token
  if (!token || !tokenValid) {
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
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200">
              <XCircle className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              {language === 'sr' ? 'Nevažeći Link' : 'Invalid Link'}
            </h1>
            
            <p className="text-slate-500 mb-6">
              {language === 'sr' 
                ? 'Link za resetovanje lozinke je istekao ili nije validan. Molimo zatražite novi link.'
                : 'The password reset link has expired or is invalid. Please request a new link.'}
            </p>
            
            <Button 
              onClick={() => navigate('/login')}
              className="w-full py-6 rounded-xl bg-sky-500 hover:bg-sky-600"
              data-testid="back-to-login-btn"
            >
              {language === 'sr' ? 'Nazad na Prijavu' : 'Back to Login'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
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
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              {language === 'sr' ? 'Lozinka Promenjena!' : 'Password Changed!'}
            </h1>
            
            <p className="text-slate-500 mb-6">
              {language === 'sr' 
                ? 'Vaša lozinka je uspešno promenjena. Sada možete da se prijavite sa novom lozinkom.'
                : 'Your password has been successfully changed. You can now log in with your new password.'}
            </p>
            
            <Button 
              onClick={() => navigate('/login')}
              className="w-full py-6 rounded-xl bg-sky-500 hover:bg-sky-600"
              data-testid="go-to-login-btn"
            >
              {language === 'sr' ? 'Prijavi se' : 'Log In'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-sky-50 via-white to-blue-50" data-testid="reset-password-page">
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
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-sky-400 to-sky-500 rounded-full flex items-center justify-center shadow-lg shadow-sky-200">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {language === 'sr' ? 'Nova Lozinka' : 'New Password'}
          </h1>
          <p className="text-slate-500 text-center mb-2">
            {language === 'sr' 
              ? 'Unesite novu lozinku za vaš nalog'
              : 'Enter a new password for your account'}
          </p>
          <p className="text-sm text-sky-600 text-center mb-6">
            {email}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === 'sr' ? 'Nova Lozinka' : 'New Password'} *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                  data-testid="new-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {language === 'sr' ? 'Potvrdi Lozinku' : 'Confirm Password'} *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                  data-testid="confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-6 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold"
              disabled={loading}
              data-testid="reset-password-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'sr' ? 'Učitavanje...' : 'Loading...'}
                </>
              ) : (
                language === 'sr' ? 'Promeni Lozinku' : 'Change Password'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-sky-600 hover:text-sky-700 text-sm font-medium"
              data-testid="back-to-login-link"
            >
              {language === 'sr' ? '← Nazad na Prijavu' : '← Back to Login'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
