"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/welcome");
  }, [navigate]);

  return null; // This page will now just redirect
};

export default Index;