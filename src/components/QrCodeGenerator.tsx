import { QRCode } from 'qrcode.react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function QrCodeGenerator() {
  const [value, setValue] = useState('Hello, world!');
  const { toast } = useToast();

  const handleGenerate = () => {
    toast({
      title: 'QR Code generated',
      description: `Value: ${value}`,
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">QR Code Generator</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="qr-input">Enter text</Label>
          <Input
            id="qr-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type something..."
          />
        </div>
      <Button onClick={handleGenerate} className="w-full">
        Generate QR Code
      </Button>
      <div className="flex justify-center">
        <QRCode value={value} size={256} />
      </div>
      </CardContent>
    </Card>
  );
}