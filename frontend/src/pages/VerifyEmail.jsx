import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, XCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const VerifyEmail = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('verifying'); // verifying, success, error, already_verified
  const [message, setMessage] = useState('');

  const verifyEmail = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/auth/verify-email?token=${token}`);
      
      if (response.data.already_verified) {
        setStatus('already_verified');
        setMessage(language === 'sr' ? 'Vaš email je već verifikovan' : 'Your email is already verified');
      } else {
        setStatus('success');
        setMessage(language === 'sr' 
          ? 'Vaš email je uspešno verifikovan! Dobrodošli u Paramedic Care 018.' 
          : 'Your email has been verified! Welcome to Paramedic Care 018.');
      }
    } catch (error) {
      setStatus('error');
      const errorMsg = error.response?.data?.detail || 
        (language === 'sr' ? 'Greška pri verifikaciji emaila' : 'Error verifying email');
      setMessage(errorMsg);
    }
  }, [token, language]);

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage(language === 'sr' ? 'Neispravan link za verifikaciju' : 'Invalid verification link');
    }
  }, [token, language, verifyEmail]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <img 
              src="https://customer-assets.emergentagent.com/job_433955cc-2ea1-4976-bce7-1cf9f8ad9654/artifacts/j7ye45w5_Paramedic%20Care%20018%20Logo.jpg"
              alt="Paramedic Care 018"
              className="h-16 w-auto mx-auto"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Verifying State */}
          {status === 'verifying' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-sky-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {language === 'sr' ? 'Verifikacija u toku...' : 'Verifying...'}
              </h1>
              <p className="text-slate-500">
                {language === 'sr' ? 'Molimo sačekajte dok verifikujemo vaš email' : 'Please wait while we verify your email'}
              </p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {language === 'sr' ? 'Email Verifikovan!' : 'Email Verified!'}
              </h1>
              <p className="text-slate-500 mb-6">{message}</p>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 text-green-700">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">
                    {language === 'sr' 
                      ? 'Email dobrodošlice je poslat na vašu adresu' 
                      : 'A welcome email has been sent to your address'}
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white py-6 rounded-xl text-lg gap-2"
              >
                {language === 'sr' ? 'Prijavite se' : 'Sign In'}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Already Verified State */}
          {status === 'already_verified' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-400 to-sky-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {language === 'sr' ? 'Već Verifikovano' : 'Already Verified'}
              </h1>
              <p className="text-slate-500 mb-6">{message}</p>
              
              <Button 
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white py-6 rounded-xl text-lg gap-2"
              >
                {language === 'sr' ? 'Prijavite se' : 'Sign In'}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200">
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {language === 'sr' ? 'Verifikacija Neuspešna' : 'Verification Failed'}
              </h1>
              <p className="text-slate-500 mb-6">{message}</p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/login')}
                  variant="outline"
                  className="w-full py-6 rounded-xl text-lg"
                >
                  {language === 'sr' ? 'Pokušajte ponovo prijavu' : 'Try Signing In Again'}
                </Button>
                <p className="text-sm text-slate-400">
                  {language === 'sr' 
                    ? 'Ako problem potraje, kontaktirajte nas na info@paramedic-care018.rs' 
                    : 'If the problem persists, contact us at info@paramedic-care018.rs'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-6">
          © 2026 Paramedic Care 018. {language === 'sr' ? 'Sva prava zadržana.' : 'All rights reserved.'}
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
