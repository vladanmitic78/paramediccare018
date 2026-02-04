import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2, Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const ForgotPassword = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/api/auth/forgot-password`, {
        email: email.trim().toLowerCase(),
        language: language
      });
      
      setSuccess(true);
    } catch (error) {
      console.error('Forgot password error:', error);
      // Still show success to prevent email enumeration
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  // Success state - email sent
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
              <Mail className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              {language === 'sr' ? 'Proverite Vaš Email' : 'Check Your Email'}
            </h1>
            
            <p className="text-slate-500 mb-6">
              {language === 'sr' 
                ? `Ako postoji nalog sa email adresom ${email}, poslali smo vam link za resetovanje lozinke.`
                : `If an account exists with ${email}, we've sent you a password reset link.`}
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-amber-800 text-sm">
                <strong>{language === 'sr' ? 'Napomena:' : 'Note:'}</strong>{' '}
                {language === 'sr' 
                  ? 'Link za resetovanje ističe za 1 sat. Proverite i spam folder.'
                  : 'The reset link expires in 1 hour. Check your spam folder too.'}
              </p>
            </div>
            
            <Button 
              onClick={() => {
                setSuccess(false);
                setEmail('');
              }}
              variant="outline"
              className="w-full py-6 rounded-xl mb-3"
              data-testid="try-again-btn"
            >
              {language === 'sr' ? 'Pokušaj ponovo' : 'Try again'}
            </Button>

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
    );
  }

  // Email input form
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-sky-50 via-white to-blue-50" data-testid="forgot-password-page">
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
            <Mail className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {language === 'sr' ? 'Zaboravili ste lozinku?' : 'Forgot your password?'}
          </h1>
          <p className="text-slate-500 text-center mb-6">
            {language === 'sr' 
              ? 'Unesite vašu email adresu i poslaćemo vam link za resetovanje lozinke.'
              : 'Enter your email address and we\'ll send you a link to reset your password.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="pl-10"
                  required
                  data-testid="forgot-password-email-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-6 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold"
              disabled={loading}
              data-testid="forgot-password-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'sr' ? 'Slanje...' : 'Sending...'}
                </>
              ) : (
                language === 'sr' ? 'Pošalji Link' : 'Send Reset Link'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center text-sky-600 hover:text-sky-700 text-sm font-medium"
              data-testid="back-to-login-link"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {language === 'sr' ? 'Nazad na Prijavu' : 'Back to Login'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
