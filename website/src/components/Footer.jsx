import React from 'react';

export default function Footer() {
  return (
    <footer className="footer" style={{ position: 'relative', width: '1440px', margin: '0 auto', height: '592px' }}>
      <img
        className="footer-decor"
        src="/assets/sysicon0.avif"
        alt=""
        style={{ left: '20px', top: '313px', width: '75px', height: '75px', position: 'absolute' }}
      />
      <img
        className="footer-decor footer-folder-btn"
        src="/assets/sysicon1.avif"
        alt="folder"
        role="button"
        tabIndex={0}
        style={{ left: '1292px', top: '289px', width: '75px', height: '75px', cursor: 'pointer', position: 'absolute' }}
      />

      <nav className="footer-links">
        <div className="footer-col">
          <p className="footer-head">product</p>
          <a className="footer-link" href="#feat">features</a>
          <a className="footer-link" href="#pr">pricing</a>
          <a className="footer-link" href="/changelog">changelog</a>
          <a className="footer-link" href="#hero-center">try it</a>
        </div>
        <div className="footer-col">
          <p className="footer-head">resources</p>
          <a className="footer-link" href="/trust">trust</a>
          <a className="footer-link" href="/privacy-policy">privacy</a>
          <a className="footer-link" href="/referral-terms">referrals</a>
          <a className="footer-link" href="mailto:hi@heyclicky.com">support</a>
        </div>
        <div className="footer-col">
          <p className="footer-head">connect</p>
          <a className="footer-link" href="https://instagram.com/_heyclicky" target="_blank" rel="noopener noreferrer">instagram</a>
          <a className="footer-link" href="https://x.com/heyclicky" target="_blank" rel="noopener noreferrer">x (twitter)</a>
          <a className="footer-link" href="https://www.linkedin.com/company/heyclicky" target="_blank" rel="noopener noreferrer">linkedin</a>
          <a className="footer-link" href="https://www.youtube.com/@HeyClicky" target="_blank" rel="noopener noreferrer">youtube</a>
        </div>
        <div className="footer-col">
          <p className="footer-head">disclaimer</p>
          <p className="footer-disc">*heyclicky only sees your screen when you press the hotkey - screenshots are never stored*</p>
        </div>
      </nav>

      <div className="footer-mark">
        <img className="footer-mark-static" src="/assets/footer-wordmark.webp" alt="heyclicky" />
      </div>

      <p className="footer-copy">© Humansongs, Inc. 2026</p>
    </footer>
  );
}
