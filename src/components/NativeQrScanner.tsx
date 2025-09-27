"use client";

import React, { useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { QrCodeIcon, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface NativeQrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError: (errorMessage: string) => void;
}

const NativeQrScanner: React.FC<NativeQrScannerProps> = ({ onScanSuccess, onScanError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          onScanError('Não foi possível obter o contexto do canvas.');
          setIsLoading(false);
          return;
        }
        ctx.drawImage(image, 0, 0, image.width, image.height);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          onScanSuccess(code.data);
        } else {
          onScanError('Nenhum QR Code encontrado na imagem.');
        }
        setIsLoading(false);
      };
      image.onerror = () => {
        onScanError('Não foi possível carregar a imagem.');
        setIsLoading(false);
      };
      image.src = e.target?.result as string;
    };

    reader.onerror = () => {
      onScanError('Não foi possível ler o arquivo.');
      setIsLoading(false);
    };

    reader.readAsDataURL(file);

    // Reset the input value to allow scanning the same file again
    event.target.value = '';
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