
import React from 'react';
import { ChevronLeftIcon } from '../constants';
import { AppView } from '../types';

interface HeaderProps {
  title: string;
  currentView: AppView;
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, currentView, onBack }) => {
  const showBackButton = currentView !== 'home' && onBack;

  return (
    <header className="bg-white shadow-md sticky top-0 z-50 ios-safe-area-top">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="w-1/4">
          {showBackButton && (
            <button
              onClick={onBack}
              className="text-blue-500 hover:text-blue-700 flex items-center p-2 -ml-2"
              aria-label="Back"
            >
              <ChevronLeftIcon className="w-6 h-6" />
              <span className="ml-1 text-lg">Back</span>
            </button>
          )}
        </div>
        <h1 className="text-xl font-semibold text-gray-800 text-center w-1/2">{title}</h1>
        <div className="w-1/4"></div> {/* Spacer for centering title */}
      </div>
    </header>
  );
};

export default Header;
