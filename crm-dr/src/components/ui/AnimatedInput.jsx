import React from 'react';

/**
 * ANIMATED INPUT COMPONENT
 * Input con animación de onda en el label
 * Convertido de styled-components a CSS puro + Tailwind
 */

const AnimatedInput = ({ label = 'Name', type = 'text', ...props }) => {
  const labelChars = label.split('');

  return (
    <div className="wave-group relative">
      <style>{`
        .wave-group .input {
          font-size: 16px;
          padding: 10px 10px 10px 5px;
          display: block;
          width: 100%;
          border: none;
          border-bottom: 1px solid #515151;
          background: transparent;
          color: white;
        }
        
        .wave-group .input:focus {
          outline: none;
        }
        
        .wave-group .label {
          color: #999;
          font-size: 18px;
          font-weight: normal;
          position: absolute;
          pointer-events: none;
          left: 5px;
          top: 10px;
          display: flex;
        }
        
        .wave-group .label-char {
          transition: 0.2s ease all;
          transition-delay: calc(var(--index) * 0.05s);
        }
        
        .wave-group .input:focus ~ .label .label-char,
        .wave-group .input:valid ~ .label .label-char {
          transform: translateY(-20px);
          font-size: 14px;
          color: #5264AE;
        }
        
        .wave-group .bar {
          position: relative;
          display: block;
          width: 100%;
        }
        
        .wave-group .bar:before,
        .wave-group .bar:after {
          content: '';
          height: 2px;
          width: 0;
          bottom: 1px;
          position: absolute;
          background: #5264AE;
          transition: 0.2s ease all;
        }
        
        .wave-group .bar:before {
          left: 50%;
        }
        
        .wave-group .bar:after {
          right: 50%;
        }
        
        .wave-group .input:focus ~ .bar:before,
        .wave-group .input:focus ~ .bar:after {
          width: 50%;
        }
      `}</style>

      <input
        required
        type={type}
        className="input"
        {...props}
      />

      <span className="bar" />

      <label className="label">
        {labelChars.map((char, index) => (
          <span
            key={index}
            className="label-char"
            style={{ '--index': index }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </label>
    </div>
  );
};

export default AnimatedInput;
