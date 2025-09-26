"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new /login page
    navigate('/login');
  }, [navigate]);

  return null; // This page will now just redirect
};

export default Auth;