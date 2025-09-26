"use client";

import React from 'react';

export interface PageHeaderProps {
  title: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title }) => {
  return (
    <h1 className="text-3xl font-bold text-center">{title}</h1>
  );
};