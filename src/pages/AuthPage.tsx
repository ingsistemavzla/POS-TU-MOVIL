import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sidebar p-4">
      {/* Logo */}
      <div className="mb-8 flex justify-center">
        <img 
          src="/logo_login.png" 
          alt="Logo" 
          className="h-32 w-auto object-contain"
        />
      </div>
      
      {/* Form Container */}
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm onToggleMode={toggleMode} />
        ) : (
          <RegisterForm onToggleMode={toggleMode} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;
