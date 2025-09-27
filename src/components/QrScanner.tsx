"use client";

import React, { useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

const scannerRegionId = "qr-scanner-region";

const QrScanner: React.FC<QrScannerProps> = ({ onScanSuccess }) => {
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    const startScanner = () => {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [], // Use all supported types
      };

      const handleSuccess = (decodedText: string) => {
        if (scanner) {
          if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
            scanner.pause(true);
          }
        }
        onScanSuccess(decodedText);
      };

      const handleError = (errorMessage: string) => {
        // Ignore common non-error messages
        if (!errorMessage.toLowerCase().includes("qr code parse error")) {
          console.warn(`QR Scanner Error: ${errorMessage}`);
        }
      };

      scanner = new Html5QrcodeScanner(scannerRegionId, config, false);
      scanner.render(handleSuccess, handleError);
    };

    // Delay start to ensure DOM element is ready
    const timeoutId = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timeoutId);
      if (scanner) {
        scanner.clear().catch(error => {
          console.error("Failed to clear scanner.", error);
        });
      }
    };
  }, [onScanSuccess]);

  return (
    <div>
      <div id={scannerRegionId} />
    </div>
  );
};

export default QrScanner;