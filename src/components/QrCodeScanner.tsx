"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCodeIcon } from 'lucide-react';

interface QrCodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
}

const QrCodeScanner: React.FC<QrCodeScannerProps> = ({ onScanSuccess, onScanError }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const qrCodeRegionId = "qr-code-full-region";

  useEffect(() => {
    if (isScanning) {
      scannerRef.current = new Html5QrcodeScanner(
        qrCodeRegionId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          disableFlip: false,
        },
        false // verbose
      );

      const html5QrcodeSuccessCallback = (decodedText: string, decodedResult: any) => {
        onScanSuccess(decodedText);
        setIsScanning(false); // Stop scanning after success
        scannerRef.current?.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner", error);
        });
      };

      const html5QrcodeErrorCallback = (errorMessage: string) => {
        // console.warn(`QR Code scanning error: ${errorMessage}`);
        if (onScanError) {
          onScanError(errorMessage);
        }
      };

      scannerRef.current.render(html5QrcodeSuccessCallback, html5QrcodeErrorCallback);
    } else {
      scannerRef.current?.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner", error);
      });
    }

    return () => {
      scannerRef.current?.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner on unmount", error);
      });
    };
  }, [isScanning, onScanSuccess, onScanError]);

  return (
    <Dialog onOpenChange={setIsScanning}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <QrCodeIcon className="mr-2 h-4 w-4" /> Escanear QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Escanear QR Code do Atleta</DialogTitle>
        </DialogHeader>
        <div id={qrCodeRegionId} className="w-full h-[300px] bg-gray-100 flex items-center justify-center text-muted-foreground">
          {/* QR Code scanner will render here */}
        </div>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Aponte a câmera para o QR Code do atleta.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default QrCodeScanner;