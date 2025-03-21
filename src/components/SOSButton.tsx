import { motion } from 'framer-motion';
import React, { useState, useEffect } from 'react';

export const SOSButton: React.FC = () => {
  const [isPressed, setIsPressed] = useState(false);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation(position.coords);
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  }, []);

  const handleSOSClick = () => {
    setIsPressed(true);
    if (userLocation) {
      // Here you would implement the emergency alert system
      // Send location to emergency contacts
      console.log('Emergency alert triggered at:', userLocation);
    }
    setTimeout(() => setIsPressed(false), 2000);
  };

  return (
    <motion.button
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full 
        ${isPressed ? 'bg-red-700' : 'bg-red-600'} 
        shadow-lg text-white font-bold text-xl
        dark:bg-red-500 dark:hover:bg-red-600`}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      animate={{
        boxShadow: isPressed
          ? '0 0 0 0px rgba(239, 68, 68, 0.2)'
          : '0 0 0 20px rgba(239, 68, 68, 0)',
      }}
      transition={{ duration: 0.5, repeat: isPressed ? Infinity : 0 }}
      onClick={handleSOSClick}
    >
      SOS
    </motion.button>
  );
};