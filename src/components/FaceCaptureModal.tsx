import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X, ShieldCheck, RefreshCw } from 'lucide-react';
import {
  captureVideoFrameAsSquare,
  compressProfileImageFile,
  storeProfilePhoto,
} from '../utils/imageCompressor';
import { PhotoSource } from '../types';

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  studentCode: string;
  storageFileName: string; // e.g. "student.webp" or "guardian_g1.webp"
  onComplete: (photoUrl: string, source: PhotoSource) => void;
  onSkip: () => void;
}

export const FaceCaptureModal: React.FC<Props> = ({
  open,
  title,
  subtitle,
  studentCode,
  storageFileName,
  onComplete,
  onSkip,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewSource, setPreviewSource] = useState<PhotoSource>('face_scan');
  const [consentChecked, setConsentChecked] = useState(true);
  const [saving, setSaving] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setPreviewUrl('');
      setCameraError('');
    }
    return () => stopCamera();
  }, [open]);

  if (!open) return null;

  const startCamera = async () => {
    setCameraError('');
    setPreviewUrl('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError('ไม่สามารถเปิดกล้องได้ (อาจไม่ได้รับอนุญาตหรือไม่มีกล้อง) — สามารถเลือกภาพจากคลังภาพได้ครับ');
    }
  };

  const handleSnap = () => {
    if (!videoRef.current) return;
    const dataUrl = captureVideoFrameAsSquare(videoRef.current);
    setPreviewUrl(dataUrl);
    setPreviewSource('face_scan');
    stopCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    const compressed = await compressProfileImageFile(file);
    setPreviewUrl(compressed);
    setPreviewSource('self_upload');
    e.target.value = '';
  };

  const handleConfirmSave = async () => {
    if (!previewUrl || !consentChecked) return;
    setSaving(true);
    try {
      const finalUrl = await storeProfilePhoto(studentCode, storageFileName, previewUrl);
      onComplete(finalUrl, previewSource);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#ECF3F7] p-6 shadow-2xl border border-white space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#2B3E50]">{title}</h3>
            {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onSkip} className="clay-btn-soft p-1.5 text-slate-600" aria-label="ปิด">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera / Preview Viewport with Face Oval Guide */}
        <div className="relative w-64 h-64 mx-auto rounded-3xl overflow-hidden bg-[#2B3E50] flex items-center justify-center shadow-inner border-2 border-white">
          {previewUrl ? (
            <img src={previewUrl} alt="ตัวอย่างภาพถ่าย" className="w-full h-full object-cover" />
          ) : cameraActive ? (
            <>
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              {/* Face Oval Guide Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-52 rounded-[50%] border-2 border-dashed border-[#92C2C2] shadow-[0_0_0_999px_rgba(20,32,44,0.38)]" />
              </div>
            </>
          ) : (
            <div className="text-center text-slate-300 px-4 space-y-2">
              <Camera className="w-10 h-10 mx-auto text-[#92C2C2]" />
              <p className="text-xs">กด “ถ่ายภาพตอนนี้” เพื่อเปิดกล้องหน้า หรือเลือกภาพจากคลังภาพ (ย่ออัตโนมัติ 400×400 px)</p>
            </div>
          )}
        </div>

        {cameraError && <p className="text-xs text-rose-600 text-center">{cameraError}</p>}

        {/* PDPA Consent Checkbox */}
        <label className="flex items-start gap-2 text-xs text-slate-700 bg-white/75 rounded-2xl p-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#4A7C82]"
          />
          <span>
            <ShieldCheck className="w-3.5 h-3.5 inline text-[#4A7C82] mr-1" />
            ยินยอมให้โรงเรียนเปรมติณสูลานนท์เก็บภาพถ่ายเพื่อใช้ยืนยันตัวตนและดูแลช่วยเหลือนักเรียนตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </span>
        </label>

        {/* Action Buttons */}
        <div className="space-y-2">
          {cameraActive ? (
            <button onClick={handleSnap} className="clay-btn-primary w-full py-2.5 text-sm font-bold inline-flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" /> กดถ่ายภาพ
            </button>
          ) : previewUrl ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={startCamera} className="clay-btn-soft py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1">
                <RefreshCw className="w-3.5 h-3.5" /> ถ่ายใหม่
              </button>
              <button
                disabled={!consentChecked || saving}
                onClick={handleConfirmSave}
                className="clay-btn-primary py-2.5 text-xs font-bold disabled:opacity-40"
              >
                {saving ? 'กำลังบันทึก...' : 'ยืนยันใช้ภาพนี้'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={startCamera} className="clay-btn-primary py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5">
                <Camera className="w-4 h-4" /> ถ่ายภาพตอนนี้
              </button>
              <label className="clay-btn-soft py-2.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-4 h-4 text-[#4A7C82]" /> เลือกจากคลังภาพ
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          )}

          <button onClick={onSkip} className="w-full py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
            ข้ามไปก่อน
          </button>
        </div>
      </div>
    </div>
  );
};
