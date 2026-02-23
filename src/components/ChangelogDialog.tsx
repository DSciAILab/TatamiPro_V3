import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { changelog } from '@/data/changelog';
import { version } from '../../package.json';

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChangelogDialog: React.FC<ChangelogDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <span>Sobre o TatamiPro</span>
            <Badge variant="secondary">v{version}</Badge>
          </DialogTitle>
          <DialogDescription>
            Acompanhe as últimas novidades e melhorias do aplicativo.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-8 pb-4">
            {changelog.map((entry, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    Versão {entry.version}
                    {index === 0 && <Badge variant="default" className="text-[10px] h-5">Atual</Badge>}
                  </h3>
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
                </div>
                
                <div className="space-y-4">
                  {entry.features && entry.features.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-emerald-500 flex items-center gap-1">✨ Novidades</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                        {entry.features.map((feature, i) => <li key={i}>{feature}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {entry.improvements && entry.improvements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-500 flex items-center gap-1">🚀 Melhorias</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                        {entry.improvements.map((improvement, i) => <li key={i}>{improvement}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {entry.fixes && entry.fixes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-amber-500 flex items-center gap-1">🔧 Correções</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
                        {entry.fixes.map((fix, i) => <li key={i}>{fix}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
