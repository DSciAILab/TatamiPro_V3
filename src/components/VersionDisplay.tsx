"use client";

import React from 'react';
import packageJson from '../../package.json';

const VersionDisplay: React.FC = () => {
  // Assuming package.json is correctly imported as JSON module
  const appVersion = packageJson.version || 'N/A';
  
  return (
    <div className="text-xs text-muted-foreground mt-8">
      Versão do App: {appVersion}
    </div>
  );
};

export default VersionDisplay;