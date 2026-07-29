import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Mic, Shield, CheckCircle, AlertTriangle, Loader2, ScanFace } from 'lucide-react';
import { paymentsAPI } from '../utils/api';

export default function PaymentConfirmationModal({ isOpen, onClose, transaction, onConfirmed }) {
  const [step, setStep] = useState('intro'); // intro → permission → capture → audio → submitting → success
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setStep('intro');
      setError(null);
      setCapturedImage(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setIsRecording(false);
      setSubmitting(false);
      setAudioLevel(0);
    }
  }, [isOpen, cleanup]);

  const requestCamera = async () => {
    try {
      setError(null);
      setStep('permission');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep('capture');
    } catch (err) {
      setError('Camera and microphone access is required for security verification. Please allow access in your browser settings.');
      setStep('intro');
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    // Draw the video frame
    ctx.drawImage(video, 0, 0);
    // Draw a security overlay
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    // Draw timestamp
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '14px monospace';
    ctx.fillText(new Date().toISOString(), 20, canvas.height - 20);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    setCapturedImage(imageData);
    setStep('audio');
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setStep('capture');
  };

  const startAudioRecording = async () => {
    try {
      audioChunksRef.current = [];
      setIsRecording(true);
      setAudioLevel(0);

      // Get audio stream for recording
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      
      // Audio level detection
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!isRecording) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(avg / 128, 1));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        audioStream.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      recorder.start();
      updateLevel();

    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.');
      setIsRecording(false);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const reRecordAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setAudioLevel(0);
  };

  const submitConfirmation = async () => {
    if (!capturedImage) return;
    setSubmitting(true);
    setError(null);
    setStep('submitting');
    
    try {
      let audioBase64 = null;
      if (audioBlob) {
        audioBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(audioBlob);
        });
      }

      await paymentsAPI.confirmBiometric({
        transactionId: transaction.id,
        selfieData: capturedImage,
        audioData: audioBase64,
        mimeType: 'image/jpeg',
      });

      setStep('success');
      setTimeout(() => {
        onConfirmed?.();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit biometric confirmation. Please try again.');
      setStep('audio');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="relative bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] rounded-3xl overflow-hidden w-full max-w-lg border border-white/10 shadow-2xl"
            style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gebeya-600 to-gebeya-800 flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Secure Payment Confirmation</h3>
                  <p className="text-white/40 text-xs">Biometric verification required</p>
                </div>
              </div>
              {!submitting && (
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                  <X size={16} className="text-white/60" />
                </button>
              )}
            </div>

            {/* Payment Summary */}
            <div className="mx-6 mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-xs">Transaction Amount</span>
                <span className="text-white/30 text-[10px] font-mono">#{transaction?.id?.slice(0, 8)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-sm">ETB {formatCurrency(transaction?.amount)}</span>
                <span className="text-green-400 text-xs font-semibold bg-green-500/10 px-2 py-0.5 rounded-full">In Escrow</span>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-6 py-4" style={{ minHeight: 300 }}>
              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2"
                >
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Step: Intro */}
              {step === 'intro' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-6"
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gebeya-500 to-gebeya-700 flex items-center justify-center mb-5 shadow-lg shadow-gebeya-500/20"
                  >
                    <ScanFace size={36} className="text-white" />
                  </motion.div>
                  <h4 className="text-white text-lg font-bold mb-2">Confirm Your Identity</h4>
                  <p className="text-white/50 text-sm text-center mb-6 max-w-sm">
                    To confirm you've received payment of <strong className="text-white">ETB {formatCurrency(transaction?.amount)}</strong>, 
                    we need to verify your identity using your camera and microphone.
                  </p>

                  <div className="w-full space-y-2 mb-6">
                    {[
                      { icon: <Camera size={14} />, text: 'Take a live selfie as proof of identity' },
                      { icon: <Mic size={14} />, text: 'Record a voice confirmation of payment receipt' },
                      { icon: <Shield size={14} />, text: 'Encrypted and stored as secure evidence' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-gebeya-400">{item.icon}</span>
                        <span className="text-white/60 text-xs">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={requestCamera}
                    className="w-full py-3.5 bg-gradient-to-r from-gebeya-600 to-gebeya-700 hover:from-gebeya-700 hover:to-gebeya-800 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Camera size={18} />
                    Begin Identity Verification
                  </button>
                  <p className="text-white/30 text-[10px] mt-3">
                    🔒 Your data is encrypted and used only for this verification
                  </p>
                </motion.div>
              )}

              {/* Step: Permission */}
              {step === 'permission' && (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 size={36} className="text-gebeya-400 animate-spin mb-4" />
                  <p className="text-white/70 text-sm">Requesting camera and microphone access...</p>
                  <p className="text-white/30 text-xs mt-2">Please allow access when prompted by Chrome</p>
                </div>
              )}

              {/* Step: Capture */}
              {step === 'capture' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-2">
                    <h4 className="text-white font-bold text-sm">📸 Take a Live Selfie</h4>
                    <p className="text-white/40 text-xs">Position your face in the frame</p>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden bg-black/60 border-2 border-gebeya-500/50" style={{ minHeight: 280 }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover absolute inset-0"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    {/* Scan overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 rounded-2xl border-2 border-gebeya-400/60 relative">
                        <motion.div
                          className="absolute -top-0.5 left-0 right-0 h-0.5 bg-gebeya-400 shadow-lg shadow-gebeya-400"
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                        />
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-gebeya-400 rounded-tl" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-gebeya-400 rounded-tr" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-gebeya-400 rounded-bl" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-gebeya-400 rounded-br" />
                      </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <button
                    onClick={captureSelfie}
                    className="w-full py-3 bg-gebeya-600 hover:bg-gebeya-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Camera size={16} />
                    Capture Selfie
                  </button>
                </motion.div>
              )}

              {/* Step: Audio Recording */}
              {step === 'audio' && capturedImage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-2">
                    <h4 className="text-white font-bold text-sm">🎤 Voice Confirmation</h4>
                    <p className="text-white/40 text-xs">Say: "I confirm receipt of ETB {formatCurrency(transaction?.amount)}"</p>
                  </div>

                  {/* Preview of captured selfie */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0">
                      <img
                        src={`data:image/jpeg;base64,${capturedImage}`}
                        alt="Selfie preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-white/80 text-xs font-medium">Selfie captured ✓</p>
                      <p className="text-white/30 text-[10px]">{new Date().toLocaleString()}</p>
                    </div>
                    <button onClick={retakePhoto} className="ml-auto text-xs text-gebeya-400 hover:text-gebeya-300 underline underline-offset-2">
                      Retake
                    </button>
                  </div>

                  {/* Audio Recording UI */}
                  {!audioBlob ? (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500/20' : 'bg-white/10'} ${isRecording ? 'animate-pulse' : ''}`}>
                            <Mic size={28} className={isRecording ? 'text-red-400' : 'text-white/40'} />
                          </div>
                          {isRecording && (
                            <motion.div
                              className="absolute -inset-2 rounded-full border-2 border-red-400/30"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          )}
                        </div>
                        
                        {/* Audio level meter */}
                        {isRecording && (
                          <div className="w-full max-w-[200px] h-2 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                              animate={{ width: `${audioLevel * 100}%` }}
                              transition={{ duration: 0.1 }}
                            />
                          </div>
                        )}

                        <p className="text-white/50 text-sm text-center">
                          {isRecording
                            ? 'Recording... say your confirmation clearly'
                            : 'Press record to confirm you received payment'}
                        </p>

                        {!isRecording ? (
                          <button
                            onClick={startAudioRecording}
                            className="px-8 py-3 rounded-full bg-gebeya-600 hover:bg-gebeya-700 text-white font-semibold transition-all flex items-center gap-2"
                          >
                            <Mic size={16} />
                            Start Recording
                          </button>
                        ) : (
                          <button
                            onClick={stopAudioRecording}
                            className="px-8 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold transition-all flex items-center gap-2"
                          >
                            <span className="w-3 h-3 bg-white rounded-sm" />
                            Stop Recording
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          <CheckCircle size={20} className="text-green-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">Voice recorded ✓</p>
                          <p className="text-white/40 text-xs">Confirmation audio captured</p>
                        </div>
                        {audioUrl && (
                          <button
                            onClick={() => {
                              const audio = new Audio(audioUrl);
                              audio.play();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs hover:bg-white/20 transition-all"
                          >
                            ▶ Play
                          </button>
                        )}
                        <button onClick={reRecordAudio} className="text-xs text-gebeya-400 hover:text-gebeya-300 underline underline-offset-2">
                          Re-record
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={submitConfirmation}
                    disabled={!audioBlob || submitting}
                    className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Submitting Secure Confirmation...
                      </>
                    ) : (
                      <>
                        <Shield size={18} />
                        Submit Biometric Confirmation
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* Step: Submitting */}
              {step === 'submitting' && (
                <div className="flex flex-col items-center justify-center py-10">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gebeya-500 to-gebeya-700 flex items-center justify-center mb-4"
                  >
                    <Shield size={28} className="text-white" />
                  </motion.div>
                  <p className="text-white text-sm font-semibold">Processing Secure Confirmation...</p>
                  <p className="text-white/40 text-xs mt-1">Encrypting and storing biometric evidence</p>
                </div>
              )}

              {/* Step: Success */}
              {step === 'success' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-green-500/30"
                  >
                    <CheckCircle size={40} className="text-white" />
                  </motion.div>
                  <h4 className="text-white text-xl font-bold mb-2">Payment Confirmed ✓</h4>
                  <p className="text-white/50 text-sm text-center mb-1">
                    Biometric verification completed successfully.
                  </p>
                  <p className="text-green-400 text-xs font-semibold">
                    ETB {formatCurrency(transaction?.amount)} — Confirmed
                  </p>
                  <div className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <Shield size={14} className="text-gebeya-400" />
                    <span className="text-white/40 text-[10px]">Evidence securely stored</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Security footer */}
            <div className="px-6 pb-4 pt-0">
              <div className="flex items-center justify-center gap-4 text-[10px] text-white/20">
                <span className="flex items-center gap-1">🔒 256-bit encryption</span>
                <span>·</span>
                <span className="flex items-center gap-1">📸 Biometric proof</span>
                <span>·</span>
                <span className="flex items-center gap-1">✓ Audit trail</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
