import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const FarmerContext = createContext();

export function useFarmer() {
  return useContext(FarmerContext);
}

export function FarmerProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const userStr = localStorage.getItem('krishi_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeBooking, setActiveBooking] = useState(() => {
    try {
      const bookingStr = localStorage.getItem('latest_booking');
      return bookingStr ? JSON.parse(bookingStr) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  const syncActiveBooking = async (phone) => {
    if (!phone) return;
    setLoading(true);
    try {
      if (api.getActiveBooking) {
        const res = await api.getActiveBooking(phone);
        if (res?.data) {
          setActiveBooking(res.data);
          localStorage.setItem('latest_booking', JSON.stringify(res.data));
        } else {
          setActiveBooking(null);
          localStorage.removeItem('latest_booking');
        }
      }
    } catch (error) {
      console.error('Error fetching active booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('krishi_user', JSON.stringify(userData));
    syncActiveBooking(userData.phone_number);
  };

  const logoutUser = () => {
    localStorage.removeItem('krishi_user');
    localStorage.removeItem('krishi_token');
    localStorage.removeItem('latest_booking');
    localStorage.removeItem('krishi-kalyan-v1');
    setUser(null);
    setActiveBooking(null);
  };

  const updateBookingState = (newBooking) => {
    setActiveBooking(newBooking);
    localStorage.setItem('latest_booking', JSON.stringify(newBooking));
  };

  useEffect(() => {
    if (user?.phone_number) {
      syncActiveBooking(user.phone_number);
    }
  }, [user?.phone_number]);

  return (
    <FarmerContext.Provider value={{
      user,
      activeBooking,
      loading,
      syncActiveBooking,
      loginUser,
      logoutUser,
      updateBookingState
    }}>
      {children}
    </FarmerContext.Provider>
  );
}
