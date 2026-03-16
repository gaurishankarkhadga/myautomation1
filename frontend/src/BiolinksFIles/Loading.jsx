import React from 'react';
import './Loading.css';

const Loading = () => {
  return (
    <div className="neo-futuristic-loader">
      <div className="neo-futuristic-loader__container">
        <div className="neo-futuristic-loader__ring neo-futuristic-loader__ring--outer"></div>
        <div className="neo-futuristic-loader__ring neo-futuristic-loader__ring--middle"></div>
        <div className="neo-futuristic-loader__ring neo-futuristic-loader__ring--inner"></div>
        <div className="neo-futuristic-loader__dot"></div>
        <div className="neo-futuristic-loader__pulse"></div>
        <div className="neo-futuristic-loader__glow"></div>
      </div>
    </div>
  );
};

export default Loading;