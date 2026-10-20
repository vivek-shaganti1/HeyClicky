import React, { useState, useEffect } from 'react';

export default function Menubar() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="menubar">
      <div className="menubar-row">
        {/* Left navigation */}
        <div className="left">
          <nav className="menu-items">
            <span className="nav-brand nav-active">heyclicky</span>
            <a href="#feat">features</a>
            <a href="#pr">pricing</a>
            <a href="/trust">trust</a>
            <a href="/changelog">changelog</a>
            <a href="/careers">careers</a>
          </nav>
        </div>

        {/* Center Animated Logo */}
        <a className="logo-link" aria-label="heyclicky — home" href="/">
          <svg className="clicky-logo" viewBox="0 0 48 31" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="heyclicky" role="img">
            <g stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path className="logo-mouth" d="M24.3 23.3 L33.4 23.3" />
              <g className="logo-upper">
                <path className="logo-zig" d="M9.5 12.4 L14.5 6.5 L24.3 23.3" />
                <path className="logo-eye" d="M27.1 12.4 L32.86 6.5 L38.4 12.4" />
                <path className="logo-zig-shut" d="M9.5 9.5 L14.5 9.5 L24.3 23.3" />
                <path className="logo-eye-shut" d="M27.1 9.5 L32.86 9.5 L38.4 9.5" />
              </g>
            </g>
          </svg>
        </a>

        {/* Right Status Bar */}
        <div className="right">
          <div className="status">
            {/* WiFi */}
            <span className="status-item">
              <span className="ic">
                <img className="no-drag" src="/assets/nav-wifi.svg" alt="WiFi" />
              </span>
              <span className="status-pop" aria-hidden="true">
                <span className="status-pill">
                  <span className="gl no-drag"></span>
                  <span className="status-pill-main">
                    <span className="status-ic">
                      <img className="no-drag" src="/assets/nav-wifi.svg" alt="" />
                    </span>
                    <span className="status-name">buildspace</span>
                  </span>
                  <img className="status-end no-drag" src="/assets/status-check.svg" alt="Connected" />
                </span>
              </span>
            </span>

            {/* Now Playing (iPod Touch) */}
            <span className={`status-item ${isPlaying ? 'playing' : ''}`}>
              <span 
                className="ic np-btn" 
                role="button" 
                tabIndex={0} 
                aria-pressed={isPlaying} 
                aria-label="Play now playing"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                <img className="no-drag hp" src="/assets/nav-headphones.svg" alt="Now Playing" />
              </span>
              <span className="status-pop" aria-hidden="true">
                <span className="status-pill" onClick={() => setIsPlaying(!isPlaying)} style={{ cursor: 'pointer' }}>
                  <span className="gl no-drag"></span>
                  <span className="status-pill-main">
                    <span className="status-ic status-art">
                      <img className="no-drag" src="/assets/status-nowplaying.avif" alt="Cover" />
                    </span>
                    <span className="status-np">
                      <span className="status-name">iPod Touch</span>
                      <span className={`status-bars ${isPlaying ? '' : 'dim'}`}>
                        <i style={{ height: '7.1px' }}></i>
                        <i style={{ height: '11.9px' }}></i>
                        <i style={{ height: '8.7px' }}></i>
                        <i style={{ height: '11.9px' }}></i>
                        <i style={{ height: '4px' }}></i>
                      </span>
                    </span>
                  </span>
                  <img className="status-end np-play" src={isPlaying ? "/assets/player-pause.svg" : "/assets/nav-play.svg"} alt="Toggle" />
                </span>
              </span>
            </span>

            {/* Bluetooth */}
            <span className="status-item">
              <span className="ic">
                <img className="no-drag bt" src="/assets/nav-bluetooth.svg" alt="Bluetooth" />
              </span>
              <span className="status-pop" aria-hidden="true">
                <span className="status-pill">
                  <span className="gl no-drag"></span>
                  <span className="status-pill-main">
                    <span className="status-ic">
                      <img className="no-drag" src="/assets/status-headphones.svg" alt="" />
                    </span>
                    <span className="status-name">farza’s airpods</span>
                  </span>
                  <img className="status-end no-drag" src="/assets/status-check.svg" alt="Connected" />
                </span>
              </span>
            </span>

            {/* Battery */}
            <svg className="battery-img no-drag" width="24" height="14" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M6.33008 1.17004H14.6699C16.2519 1.17004 16.9381 1.17482 17.4854 1.33215C18.8635 1.72859 19.9415 2.80653 20.3379 4.18469C20.4952 4.73195 20.5 5.4181 20.5 7.00012C20.5 8.58223 20.4953 9.26828 20.3379 9.81555C19.9415 11.1937 18.8635 12.2717 17.4854 12.6681C16.9381 12.8254 16.2519 12.8302 14.6699 12.8302H6.33008C4.74809 12.8302 4.0619 12.8254 3.51465 12.6681C2.13648 12.2717 1.05854 11.1937 0.662109 9.81555C0.504734 9.26828 0.5 8.58223 0.5 7.00012C0.5 5.4181 0.504772 4.73195 0.662109 4.18469C1.05854 2.80653 2.13648 1.72859 3.51465 1.33215C4.0619 1.17482 4.74805 1.17004 6.33008 1.17004Z" stroke="#B5B5B4" />
              <rect className="bat-fill" x="2.33" y="3" width="12" height="8" rx="2.5" fill="#B5B5B4" />
              <path d="M23.1615 5.42305C22.7446 4.84307 22 5.28826 22 6.0025V7.9975C22 8.71174 22.7446 9.15693 23.1615 8.57695C23.4854 8.1262 23.67 7.57801 23.67 7C23.67 6.42199 23.4854 5.8738 23.1615 5.42305Z" fill="#B5B5B4" />
            </svg>

            {/* Time */}
            <span className="time">{timeStr || '4:11 PM'}</span>

            {/* Get HeyClicky CTA */}
            <a 
              className="getclicky" 
              href="https://github.com/farzaa/clicky-releases/releases/latest/download/HeyClicky.dmg" 
              download 
              data-placement="menubar"
            >
              <span className="ic">
                <img className="no-drag ap" src="/assets/nav-apple.svg" alt="" />
              </span>
              <b>get heyclicky</b>
            </a>
          </div>

          {/* Mobile menu toggle */}
          <button type="button" className="menu-toggle" aria-label="Menu" aria-expanded="false">
            <img className="menu-toggle-ic no-drag" src="/assets/nav-control-center.png" alt="" width="16" height="16" />
          </button>
        </div>
      </div>
    </header>
  );
}
