"use client";

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCodeIcon, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showError } from '@/utils/toast';

interface NativeQrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError: (errorMessage: string) => void;
}

const NativeQrScanner: React.FC<NativeQrScannerProps> = ({ onScanSuccess, onScanError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonClick = () => {
    // @ts-ignore
    if (!('BarcodeDetector' in window)) {
      showError('Seu navegador não suporta a detecção de QR Code. Tente usar Chrome ou Safari em um dispositivo móvel.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);

    try {
      // @ts-ignore - BarcodeDetector might not be in all TS lib versions
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const imageBitmap = await createImageBitmap(file);
      const barcodes = await barcodeDetector.detect(imageBitmap);

      if (barcodes.length > 0) {
        onScanSuccess(barcodes[0].rawValue);
      } else {
        onScanError('Nenhum QR Code encontrado na imagem.');
      }
    } catch (error) {
      console.error('Erro ao escanear QR Code:', error);
      onScanError('Ocorreu um erro ao processar a imagem.');
    } finally {
      setIsLoading(false);
      // Reset the input value to allow scanning the same file again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <>
      <Input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        id="qr-scanner-input"
      />
      <Button onClick={handleButtonClick} variant="outline" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <QrCodeIcon className="mr-2 h-4 w-4" />
        )}
        {isLoading ? 'Processando...' : 'Escanear QR Code com a Câmera'}
      </Button>
    </>
  );
};

export default NativeQrScanner;