import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, CheckCircle, XCircle } from 'lucide-react';
import { useGithubConnectActions } from '../../hooks/useGithubConnectActions';

const GithubCallback: React.FC = () => {
  const navigate = useNavigate();
  const { handleOAuthCallback, error } = useGithubConnectActions();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessed.current) {
      return;
    }
    hasProcessed.current = true;

    const processCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (!code) {
        console.error('[GithubCallback] No OAuth code in URL');
        setStatus('error');
        return;
      }

      const success = await handleOAuthCallback(code);

      if (success) {
        setStatus('success');
        // Redirect to github connect page after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setStatus('error');
      }
    };

    processCallback();
  }, [handleOAuthCallback, navigate]);

  return (
    <div className="unjam-flex unjam-items-center unjam-justify-center unjam-min-h-screen unjam-bg-gray-50">
      <div className="unjam-max-w-md unjam-w-full unjam-p-8">
        <div className="unjam-bg-white unjam-rounded-lg unjam-shadow-lg unjam-p-8">
          <div className="unjam-flex unjam-flex-col unjam-items-center unjam-space-y-6">
            {status === 'processing' && (
              <>
                <Github className="unjam-w-16 unjam-h-16 unjam-text-gray-800 unjam-animate-pulse" />
                <div className="unjam-text-center">
                  <h1 className="unjam-text-2xl unjam-font-bold unjam-text-gray-900 unjam-mb-2">
                    Connecting GitHub
                  </h1>
                  <p className="unjam-text-gray-600">
                    Please wait while we complete the connection...
                  </p>
                </div>
                <div className="unjam-w-8 unjam-h-8 unjam-border-4 unjam-border-blue-200 unjam-border-t-blue-600 unjam-rounded-full unjam-animate-spin" />
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="unjam-w-16 unjam-h-16 unjam-text-green-600" />
                <div className="unjam-text-center">
                  <h1 className="unjam-text-2xl unjam-font-bold unjam-text-gray-900 unjam-mb-2">
                    Connected Successfully!
                  </h1>
                  <p className="unjam-text-gray-600">
                    Your GitHub account has been connected. Redirecting...
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="unjam-w-16 unjam-h-16 unjam-text-red-600" />
                <div className="unjam-text-center">
                  <h1 className="unjam-text-2xl unjam-font-bold unjam-text-gray-900 unjam-mb-2">
                    Connection Failed
                  </h1>
                  <p className="unjam-text-gray-600 unjam-mb-4">
                    {error?.message || 'Unable to connect your GitHub account'}
                  </p>
                  <button
                    onClick={() => navigate('/github-connect')}
                    className="unjam-px-6 unjam-py-2 unjam-bg-blue-600 unjam-text-white unjam-rounded-lg hover:unjam-bg-blue-700 unjam-transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GithubCallback;
