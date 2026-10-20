import React from 'react';

export default function Manifesto() {
  return (
    <section className="man-section" style={{ position: 'relative', width: '1440px', margin: '0 auto', height: '768px' }}>
      <div className="man-plabel reveal rv-late">the dream</div>

      {/* Arches with rainbow gradient */}
      <div className="man-arches" style={{ left: 0, top: '120px', width: '1440px', height: '511px', position: 'absolute' }}>
        <img className="man-arches-poster no-drag" src="/assets/man-arches-poster.webp" alt="" />
        <video
          className="man-arches-vid no-drag"
          src="/assets/arches.mp4"
          poster="/assets/man-arches-poster.webp"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="man-rainbow" style={{ left: 0, top: '17px', width: '1440px', height: '494px' }}></div>
      </div>

      {/* Stickers */}
      <img
        className="man-decor no-drag reveal draggable"
        src="/assets/man-mail.webp"
        style={{ left: '989px', top: '227px', width: '70px', height: '53px', position: 'absolute' }}
        alt="you've got mail"
      />
      <img
        className="man-decor no-drag reveal draggable"
        src="/assets/man-cat.avif"
        style={{ left: '337px', top: '138px', width: '96.5px', height: '95.79px', position: 'absolute' }}
        alt="Cat"
      />
      <img
        className="man-decor no-drag reveal draggable"
        src="/assets/man-astro.avif"
        style={{ left: '234px', top: '493px', width: '63.29px', height: '55.51px', position: 'absolute' }}
        alt="Astronaut"
      />
      <img
        className="man-decor no-drag reveal draggable"
        src="/assets/man-laptop.avif"
        style={{ left: '1087px', top: '538px', width: '137.55px', height: '131.89px', position: 'absolute' }}
        alt="Laptop"
      />

      {/* Notes Window */}
      <div className="man-window no-drag manifesto reveal rv-late" style={{ left: '480px', top: '112.5px', position: 'absolute' }}>
        <div className="titlebar">
          <div className="dots">
            <img src="/assets/win-close.png" alt="" />
            <img src="/assets/win-min.png" alt="" />
            <img src="/assets/win-zoom.png" alt="" />
          </div>
          <div className="t">
            <span className="t-ico" aria-hidden="true"></span>notes
          </div>
        </div>
        <div className="doc">
          <p className="txt">we all have access to the same ai models, yet very few of us unlock their full power!</p>
          <p className="txt">we just believe it's an interface problem.</p>
          <p className="txt">
            we wanna take the same frontier models everyone else is using, and make it so this technology can{' '}
            <span className="ink">break out of uninspired chat interfaces and clunky terminals.</span>
          </p>
          <p className="txt">we're trying to figure out the ai interface the next billion people will use.</p>
          <p className="txt">
            it's early! try out what we have today and lmk what you think.<span className="car">|</span>
          </p>

          <div className="sign">
            <a className="who" href="https://x.com/FarzaTV" target="_blank" rel="noopener noreferrer">
              <img className="no-drag" src="/assets/man-farza-src.webp" alt="Farza" />
              <div className="name">
                <span className="a">farza,</span>
                <span className="b">founder</span>
              </div>
            </a>
            <span className="heyclicky-box">
              <img className="heyclicky" src="/assets/man-heyclicky-mark.avif" alt="heyclicky" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
