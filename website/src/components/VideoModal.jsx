import React from 'react';

export default function VideoModal({ isOpen, onClose, videoData }) {
  if (!isOpen || !videoData) return null;

  return (
    <div className="hero-modal-backdrop" onClick={onClose}>
      <div className="hero-modal" onClick={(e) => e.stopPropagation()}>
        <div className="win" style={{ width: 'min(90vw, 760px)' }}>
          <div className="bar">
            <div className="dots">
              <button type="button" className="hero-modal-dot" onClick={onClose} aria-label="Close">
                <img src="/assets/win-close.png" alt="" />
              </button>
              <img src="/assets/win-min.png" alt="" />
              <img src="/assets/win-zoom.png" alt="" />
            </div>
            <div className="hero-modal-title">{videoData.title || 'heyclicky.mov'}</div>
            <img src="/assets/win-x.svg" alt="" style={{ cursor: 'pointer' }} onClick={onClose} />
          </div>
          <div className="hero-modal-screen" style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}>
            <video
              className="ready"
              src={videoData.src}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
