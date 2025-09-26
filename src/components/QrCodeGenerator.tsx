"use client";

import React from 'react';
import * as QRCode from 'qrcode.react'; // Importação de namespace

interface QrCodeGeneratorProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
}

const QrCodeGenerator: React.FC<QrCodeGeneratorProps> = ({
  value,
  size = 128,
  level = 'H',
  includeMargin = false,
}) => {
  return (
    <QRCode.default
      value={value}
      size={size}
      level={level}
      includeMargin={includeMargin}
    />
  );
};

export default QrCodeGenerator;