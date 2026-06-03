import React, { useRef, useState } from "react";
import { Camera, Square, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";

const CameraPostCapture = ({ onImageCaptured, onCancel }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // 1. Start Streaming the User's Device Camera
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }, // Use "environment" for back phone camera
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      toast.error("Could not access camera. Please grant permissions.");
      setIsCameraActive(false);
    }
  };

  // 2. Freeze Frame and Snap the Photo
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    
    // Set canvas dimensions to match the actual incoming video stream frame size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    // Draw current frame instantly onto canvas layer
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 🚀 THE MAGIC LINE: Converts canvas frame into the exact Base64 string your backend expects!
    const base64Image = canvas.toDataURL("image/png");

    onImageCaptured(base64Image); // Pass it up to your existing form state!
    stopCamera();
  };

  // 3. Stop the track stream to save battery/turn off device camera light
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsCameraActive(false);
    if (onCancel) onCancel();
  };

  return (
    <div className="p-4 bg-base-200 rounded-2xl border border-base-300 text-center space-y-4">
      {!isCameraActive ? (
        <button
          type="button"
          onClick={startCamera}
          className="btn btn-primary w-full gap-2 rounded-xl"
        >
          <Camera className="size-4" />
          Open Device Camera
        </button>
      ) : (
        <div className="space-y-3 relative">
          {/* Live Video Preview Stream Box */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[300px]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={stopCamera}
              className="btn btn-circle btn-sm btn-ghost absolute top-2 right-2 bg-black/40 text-white hover:bg-black/60"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="btn btn-success flex-1 text-white gap-2 rounded-xl font-bold"
            >
              <Square className="size-4 fill-current" />
              Snap Photo
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="btn btn-ghost bg-base-300 rounded-xl px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraPostCapture;