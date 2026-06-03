import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function JiraCallback() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');

      if (window.opener) {
        if (error) {
          window.opener.postMessage({ jiraConnected: false, error }, '*');
        } else {
          window.opener.postMessage({ jiraConnected: true }, '*');
        }
      }
    }
    // Close the popup after a short delay so the message can be delivered
    const timeout = setTimeout(() => {
      if (window && window.close) window.close();
    }, 1000);
    return () => clearTimeout(timeout);
  }, []);

  const error = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('error') : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a1628] text-white p-4 font-sans">
      <div className="w-full max-w-sm p-6 bg-[#0d2137] rounded-2xl border border-[#1e3a52] text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {error ? (
          <>
            <div className="w-14 h-14 bg-red-950/40 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/10">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-[15px] font-extrabold text-red-400 mb-1.5 uppercase tracking-wider">Connection Failed</h2>
            <p className="text-[11.5px] text-[#4a7fa5] mb-5 leading-normal max-w-[280px] mx-auto">{error}</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-green-950/40 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-900/10">
              <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-[15px] font-extrabold text-[#22c55e] mb-1.5 uppercase tracking-wider">Connected Successfully</h2>
            <p className="text-[11.5px] text-[#4a7fa5] mb-5 leading-normal max-w-[280px] mx-auto">Your Atlassian account has been securely linked. This popup will close shortly.</p>
          </>
        )}
        <button
          onClick={() => router.push('/')}
          className="w-full bg-[#0052CC] hover:bg-[#0047b3] text-white font-bold py-2.5 rounded-xl text-[12px] uppercase tracking-wider transition-all shadow-lg shadow-[#0052CC]/15"
        >
          Return to ForgeAI
        </button>
      </div>
    </div>
  );
}
