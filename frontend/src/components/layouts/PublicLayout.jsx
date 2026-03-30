import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation, Footer } from '../index';

const PublicLayout = () => {
  return (
    <div className="App flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;

