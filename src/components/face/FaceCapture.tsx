"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaceCaptureProps {
  onCapture?: (imageData: string) => void;
  className?: string;
}

export const FaceCapture: React.FC<FaceCaptureProps> = ({ onCapture, className }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(true);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        const MODEL_URL = '/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
        
        setModelsLoaded(true);
        setError(null);
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setError('Failed to load face detection models');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  // Face detection loop
  const detectFaces = useCallback(async () => {
    if (!modelsLoaded || !webcamRef.current?.video || !canvasRef.current || !cameraActive) {
      return;
    }

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;

    if (video.readyState !== 4) {
      return;
    }

    // Set canvas dimensions to match video
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);

      // Clear canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Draw detections
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      setFaceDetected(detections.length > 0);
    } catch (err) {
      console.error('Face detection error:', err);
    }
  }, [modelsLoaded, cameraActive]);

  // Run detection loop
  useEffect(() => {
    if (!modelsLoaded || !cameraActive) return;

    const interval = setInterval(detectFaces, 150);
    return () => clearInterval(interval);
  }, [modelsLoaded, cameraActive, detectFaces]);

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setCameraActive(false);
      onCapture?.(imageSrc);
    }
  }, [onCapture]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setCameraActive(true);
  }, []);

  const handleCameraError = useCallback(() => {
    setError('Camera access denied. Please allow camera permissions.');
  }, []);

  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Camera Error
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Face Capture
            </CardTitle>
            <CardDescription className="mt-1">
              Position your face within the frame
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            Beta
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Loading face detection...</p>
          </div>
        ) : capturedImage ? (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <img 
                src={capturedImage} 
                alt="Captured face" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Captured
                </Badge>
              </div>
            </div>
            <Button onClick={handleRetake} variant="outline" className="w-full">
              <CameraOff className="h-4 w-4 mr-2" />
              Retake Photo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                onUserMediaError={handleCameraError}
                videoConstraints={{
                  facingMode: 'user',
                  width: 640,
                  height: 480,
                }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
              />
              {faceDetected && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Face Detected
                  </Badge>
                </div>
              )}
            </div>
            <Button 
              onClick={handleCapture} 
              disabled={!faceDetected}
              className="w-full"
              variant={faceDetected ? "default" : "secondary"}
            >
              <Camera className="h-4 w-4 mr-2" />
              {faceDetected ? 'Capture Photo' : 'Position your face...'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceCapture;
