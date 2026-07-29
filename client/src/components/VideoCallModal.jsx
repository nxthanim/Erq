import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, MessageCircle, Shield, Camera, AudioLines } from 'lucide-react';

export default function VideoCallModal({ isOpen, onClose, meetingTitle, participantName }) {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const timerRef = useRef(null);

  // Attach stream to video element after render (fixes blank screen — ref not ready when stream is obtained)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Cleanup on unmount/close
  const cleanup = useCallback(() => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setScreenStream(null);
    setIsCallActive(false);
    setPermissionGranted(false);
    setPermissionRequested(false);
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setError(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [localStream, screenStream]);

  useEffect(() => {
    if (!isOpen) cleanup();
    return cleanup;
  }, [isOpen, cleanup]);

  // Call duration timer
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isCallActive]);

  const requestPermissions = async () => {
    try {
      setError(null);
      setPermissionRequested(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      // Immediately stop the test stream — we'll request a fresh one when the call starts
      stream.getTracks().forEach(t => t.stop());
      setPermissionGranted(true);
    } catch (err) {
      setPermissionGranted(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera and microphone access was denied. Please allow access in your browser settings and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect a device and try again.');
      } else {
        setError('Could not access camera or microphone: ' + err.message);
      }
    }
  };

  const startCall = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setIsCallActive(true);
    } catch (err) {
      setError('Failed to start call. Please check your devices and permissions.');
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        setIsScreenSharing(true);
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setIsScreenSharing(false);
        };
      } catch (err) {
        setError('Screen sharing cancelled or denied.');
      }
    }
  };

  const endCall = () => {
    cleanup();
    onClose();
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(67,57,48,0.9)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) endCall(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="relative w-full max-w-5xl rounded-3xl overflow-hidden"
            style={{ background: '#1a1a2e', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4"
              style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-white text-sm font-semibold">{meetingTitle || 'Business Meeting'}</span>
                {isCallActive && (
                  <span className="text-white/60 text-xs font-mono ml-2">{formatDuration(callDuration)}</span>
                )}
              </div>
              <button onClick={endCall} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                <X size={16} className="text-white/80" />
              </button>
            </div>

            {/* Main Video Grid */}
            <div className="relative" style={{ minHeight: '60vh' }}>
              {!isCallActive && !permissionGranted && (
                <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
                  {/* Permission Shield */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#444444] flex items-center justify-center text-white mb-6 shadow-lg"
                  >
                    <Shield size={36} />
                  </motion.div>
                  <h3 className="text-white text-xl font-bold mb-2">Permissions Required</h3>
                  <p className="text-white/50 text-sm mb-2 max-w-sm text-center">
                    This call needs access to your camera and microphone to connect with{' '}
                    <span className="text-white font-semibold">{participantName || 'the participant'}</span>
                  </p>

                  {/* Permission Items */}
                  <div className="flex gap-4 mb-8">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                      <Camera size={16} className="text-blue-400" />
                      <span className="text-white/70 text-sm">Camera</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                      <AudioLines size={16} className="text-green-400" />
                      <span className="text-white/70 text-sm">Microphone</span>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm max-w-md text-center"
                    >
                      <p className="font-medium mb-1">⚠️ Access Denied</p>
                      <p className="text-red-300/80">{error}</p>
                      <p className="text-xs mt-2 text-red-300/60">
                        To fix this, click the camera icon in your browser's address bar and select "Allow", then try again.
                      </p>
                    </motion.div>
                  )}

                  <motion.button
                    onClick={requestPermissions}
                    disabled={permissionRequested && !error}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-white hover:bg-white/90 text-[#1a1a1a] font-bold px-10 py-3.5 rounded-full transition-all flex items-center gap-2.5 shadow-lg shadow-white/10"
                  >
                    {permissionRequested && !error ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#1a1a1a]/30 border-t-[#1a1a1a] rounded-full animate-spin" />
                        <span>Requesting...</span>
                      </>
                    ) : (
                      <>
                        <Shield size={18} />
                        <span>Grant Camera & Microphone Access</span>
                      </>
                    )}
                  </motion.button>
                  <p className="text-white/30 text-xs mt-4">
                    🔒 Your privacy matters. Access is only used during the call and never recorded.
                  </p>
                </div>
              )}

              {!isCallActive && permissionGranted && (
                <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
                  {/* Success check */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white mb-6 shadow-lg"
                  >
                    <span className="text-4xl">✓</span>
                  </motion.div>
                  <h3 className="text-white text-xl font-bold mb-2">All Set!</h3>
                  <p className="text-white/50 text-sm mb-2">
                    Camera and microphone are ready. Start your call with{' '}
                    <span className="text-white font-semibold">{participantName || 'the participant'}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-green-400 text-xs mb-8">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    <span>Camera ✓</span>
                    <span className="text-white/20 mx-1">·</span>
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    <span>Microphone ✓</span>
                  </div>

                  <div className="flex gap-4">
                    <motion.button
                      onClick={startCall}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="bg-[#1a1a1a] hover:bg-[#333333] text-white font-bold px-10 py-3.5 rounded-full transition-all flex items-center gap-2.5 shadow-lg"
                    >
                      <Video size={20} />
                      <span>Start Call</span>
                    </motion.button>
                    <button onClick={toggleScreenShare}
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full transition-all flex items-center gap-2">
                      <Monitor size={18} /> Share Screen
                    </button>
                  </div>

                  <button
                    onClick={() => setPermissionGranted(false)}
                    className="text-white/30 hover:text-white/50 text-xs mt-4 underline underline-offset-2 transition-colors"
                  >
                    Re-check permissions
                  </button>
                </div>
              )}

              {isCallActive && (
                <div className="grid grid-cols-2 gap-4 p-6 pt-16" style={{ minHeight: '60vh' }}>
                  {/* Local video */}
                  <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10" style={{ minHeight: 300 }}>
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {isVideoOff && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#333333] flex items-center justify-center text-white text-xl font-bold">
                          {participantName?.charAt(0) || '?'}
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 text-xs text-white/60 bg-black/40 px-2 py-1 rounded-full">
                      You
                    </div>
                  </div>

                  {/* Screen share or remote participant */}
                  <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10" style={{ minHeight: 300 }}>
                    {isScreenSharing && screenStream ? (
                      <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                            {participantName?.charAt(0) || '?'}
                          </div>
                          <p className="text-white/60 text-sm">{participantName || 'Participant'}</p>
                          <p className="text-white/30 text-xs mt-1">Connected</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 text-xs text-white/60 bg-black/40 px-2 py-1 rounded-full">
                      {isScreenSharing ? 'Screen Share' : (participantName || 'Remote')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            {isCallActive && (
              <div className="flex items-center justify-center gap-4 px-6 py-5"
                style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
                <button onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button onClick={endCall}
                  className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg">
                  <PhoneOff size={20} />
                </button>
                <button onClick={toggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>
                <button onClick={toggleScreenShare}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-[#1a1a1a] text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  <Monitor size={18} />
                </button>
              </div>
            )}

            {/* Screen sharing indicator */}
            {isScreenSharing && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-[#1a1a1a] text-white text-xs font-semibold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                <Monitor size={12} /> You are sharing your screen
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
