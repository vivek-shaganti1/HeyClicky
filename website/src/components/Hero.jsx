import React, { useState } from 'react';

export default function Hero({ onOpenModal }) {
  const [isPlayingHello, setIsPlayingHello] = useState(false);

  const toggleHelloPlay = () => {
    const video = document.getElementById('main-hello-video');
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlayingHello(true);
      } else {
        video.pause();
        setIsPlayingHello(false);
      }
    }
  };

  return (
    <section className="hero">
      {/* Background small loop videos & GIF stickers */}
      <video
        className="abs no-drag draggable"
        src="/assets/h-bw.mp4"
        style={{ left: '467px', top: '87px', width: '72px', height: '72px', objectFit: 'cover' }}
        autoPlay
        muted
        loop
        playsInline
      />
      <img
        className="abs no-drag m-decor m-pika draggable"
        src="/assets/gif-pokemon.webp"
        style={{ left: '1205px', top: '535px', width: '72.5px', height: '44.9px', objectFit: 'cover' }}
        alt="Pikachu"
      />
      <video
        className="abs no-drag draggable"
        src="/assets/gif-spongebob2.mp4"
        style={{ left: '19.94px', top: '73.25px', width: '113.5px', height: '68.7px', objectFit: 'cover' }}
        autoPlay
        muted
        loop
        playsInline
      />
      <img
        className="abs no-drag draggable"
        src="/assets/sysicon0.avif"
        style={{ left: '41px', top: '274px', width: '50.65px', height: '50.65px' }}
        alt="Trash"
      />
      <img
        className="abs no-drag m-decor m-folder folder-btn"
        src="/assets/sysicon1.avif"
        style={{ left: '310px', top: '220px', width: '40px', height: '40px' }}
        alt="Folder"
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal?.({ src: '/assets/hello.mp4', title: 'heyclicky team photo' })}
      />
      <img
        className="abs no-drag m-decor m-folder3 folder-btn"
        src="/assets/sysicon1.avif"
        style={{ left: '1153px', top: '472px', width: '44px', height: '44px' }}
        alt="Folder"
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal?.({ src: '/assets/usecase.mp4', title: 'heyclicky video' })}
      />
      <img
        className="abs no-drag m-decor m-ball folder-btn"
        src="/assets/beachball.svg"
        style={{ left: '802px', top: '191px', width: '22px', height: '22px' }}
        alt="Beachball"
        role="button"
        tabIndex={0}
      />
      <img
        className="abs no-drag m-decor m-phone draggable"
        src="/assets/gif-vintagephone.webp"
        style={{ left: '198.7px', top: '596px', width: '71px', height: '99px', objectFit: 'contain', transform: 'rotate(22.9deg)' }}
        alt="Vintage Phone"
      />
      <video
        className="abs no-drag draggable"
        src="/assets/gif-happy2000.mp4"
        style={{ left: '1323px', top: '41px', width: '103px', height: '39px', objectFit: 'cover' }}
        autoPlay
        muted
        loop
        playsInline
      />
      <video
        className="abs no-drag draggable"
        src="/assets/gif-summerlove.mp4"
        style={{ left: '861px', top: '113px', width: '46px', height: '46px', objectFit: 'cover' }}
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Kaomojis */}
      <div className="abs kao m-decor m-kao" style={{ left: '382px', top: '121px', fontSize: '24px', letterSpacing: '-0.72px', transform: 'rotate(-8deg)' }}>
        ^ ω ^
      </div>
      <div className="abs kao" style={{ left: '1183px', top: '392px', fontSize: '24px', letterSpacing: '-0.72px', transform: 'rotate(7deg)' }}>
        {'{ ^-^ }'}
      </div>
      <div className="abs kao" style={{ left: '288px', top: '460px', fontSize: '16px', letterSpacing: '-0.48px', transform: 'rotate(-7.7deg)' }}>
        (¬_¬)
      </div>
      <div className="abs kao" style={{ left: '868px', top: '81px', fontSize: '16px', letterSpacing: '-0.48px', transform: 'rotate(-7.7deg)' }}>
        ¯\_(ツ)_/¯
      </div>

      {/* Nametags */}
      <div className="abs m-decor m-nametag-red draggable" style={{ left: '1234px', top: '141px', transform: 'rotate(-7.56deg)' }}>
        <div className="nametag">
          <div className="hdr">
            <div className="big">Hello</div>
            <div className="sm">my name is</div>
          </div>
          <div className="body" style={{ height: '36.4px' }}>
            <img className="photo no-drag" src="/assets/image10.avif" style={{ width: '74px', height: '27.5px', transform: 'rotate(-2deg)' }} alt="" />
          </div>
          <div className="ftr"></div>
        </div>
      </div>

      <div className="abs m-decor m-tag draggable" style={{ left: '316px', top: '24.7px', transform: 'rotate(4deg)' }}>
        <div className="nametag blue" style={{ width: '72px' }}>
          <div className="hdr" style={{ fontSize: '3.9px' }}>
            <div className="big" style={{ fontSize: '3.9px' }}>Hello</div>
            <div className="sm" style={{ fontSize: '3.9px' }}>my name is</div>
          </div>
          <div className="body" style={{ height: '36.4px' }}>
            <img className="photo no-drag" src="/assets/image10.avif" style={{ width: '58px', height: '21.6px' }} alt="" />
          </div>
          <div className="ftr" style={{ height: '6.75px' }}></div>
        </div>
      </div>

      {/* Floating Retro Mac Video Windows */}
      {/* 1. heyclicky-draw.mov */}
      <div className="abs win-wrap vidwin" style={{ left: '527px', top: '25px' }}>
        <div className="win">
          <div className="bar">
            <div className="dots">
              <img src="/assets/win-close.png" alt="" />
              <img src="/assets/win-min.png" alt="" />
              <button 
                type="button" 
                className="win-zoom-btn" 
                aria-label="Play fullscreen"
                onClick={() => onOpenModal?.({ src: '/assets/heyclicky-draw.mp4', title: 'heyclicky-draw.mov' })}
              >
                <img className="no-drag" src="/assets/win-zoom.png" alt="" />
              </button>
            </div>
            <img src="/assets/win-x.svg" alt="" />
          </div>
          <div className="screen" style={{ width: '172px', height: '97px' }}>
            <video className="no-drag" src="/assets/heyclicky-draw.mp4" poster="/assets/hero-heyclicky-draw-poster.webp" muted loop autoPlay playsInline />
          </div>
        </div>
        <div className="win-caption">heyclicky-draw.mov</div>
      </div>

      {/* 2. usecase.mov */}
      <div className="abs win-wrap vidwin" style={{ left: '996px', top: '62px' }}>
        <div className="win">
          <div className="bar">
            <div className="dots">
              <img src="/assets/win-close.png" alt="" />
              <img src="/assets/win-min.png" alt="" />
              <button 
                type="button" 
                className="win-zoom-btn" 
                aria-label="Play fullscreen"
                onClick={() => onOpenModal?.({ src: '/assets/usecase.mp4', title: 'usecase.mov' })}
              >
                <img className="no-drag" src="/assets/win-zoom.png" alt="" />
              </button>
            </div>
            <img src="/assets/win-x.svg" alt="" />
          </div>
          <div className="screen" style={{ width: '240px', height: '114.4px', borderRadius: '4.444px' }}>
            <video className="no-drag" src="/assets/usecase.mp4" poster="/assets/hero-usecase-poster.webp" muted loop autoPlay playsInline />
          </div>
        </div>
        <div className="win-caption">usecase.mov</div>
      </div>

      {/* 3. it-draws-too-omg.mov */}
      <div className="abs win-wrap vidwin" style={{ left: '125px', top: '75px' }}>
        <div className="win">
          <div className="bar">
            <div className="dots">
              <img src="/assets/win-close.png" alt="" />
              <img src="/assets/win-min.png" alt="" />
              <button 
                type="button" 
                className="win-zoom-btn" 
                aria-label="Play fullscreen"
                onClick={() => onOpenModal?.({ src: '/assets/it-draws-too-omg.mp4', title: 'it-draws-too-omg.mov' })}
              >
                <img className="no-drag" src="/assets/win-zoom.png" alt="" />
              </button>
            </div>
            <img src="/assets/win-x.svg" alt="" />
          </div>
          <div className="screen" style={{ width: '113px', height: '201px' }}>
            <video className="no-drag" src="/assets/it-draws-too-omg.mp4" poster="/assets/hero-it-draws-too-omg-poster.webp" muted loop autoPlay playsInline />
          </div>
        </div>
        <div className="win-caption">it-draws-too-omg.mov</div>
      </div>

      {/* 4. daddyshome.mov */}
      <div className="abs win-wrap vidwin" style={{ left: '1262px', top: '378px' }}>
        <div className="win">
          <div className="bar">
            <div className="dots">
              <img src="/assets/win-close.png" alt="" />
              <img src="/assets/win-min.png" alt="" />
              <button 
                type="button" 
                className="win-zoom-btn" 
                aria-label="Play fullscreen"
                onClick={() => onOpenModal?.({ src: '/assets/daddyshome.mp4', title: 'daddyshome.mov' })}
              >
                <img className="no-drag" src="/assets/win-zoom.png" alt="" />
              </button>
            </div>
            <img src="/assets/win-x.svg" alt="" />
          </div>
          <div className="screen" style={{ width: '137px', height: '244px' }}>
            <video className="no-drag" src="/assets/daddyshome.mp4" poster="/assets/hero-daddyshome-poster.webp" muted loop autoPlay playsInline />
          </div>
        </div>
        <div className="win-caption">daddyshome.mov</div>
      </div>

      {/* 5. nohandstricklol.mov */}
      <div className="abs win-wrap vidwin" style={{ left: '38px', top: '405px' }}>
        <div className="win">
          <div className="bar">
            <div className="dots">
              <img src="/assets/win-close.png" alt="" />
              <img src="/assets/win-min.png" alt="" />
              <button 
                type="button" 
                className="win-zoom-btn" 
                aria-label="Play fullscreen"
                onClick={() => onOpenModal?.({ src: '/assets/nohandstricklol.mp4', title: 'nohandstricklol.mov' })}
              >
                <img className="no-drag" src="/assets/win-zoom.png" alt="" />
              </button>
            </div>
            <img src="/assets/win-x.svg" alt="" />
          </div>
          <div className="screen" style={{ width: '212px', height: '119px' }}>
            <video className="no-drag" src="/assets/nohandstricklol.mp4" poster="/assets/hero-nohandstricklol-poster.webp" muted loop autoPlay playsInline />
          </div>
        </div>
        <div className="win-caption">nohandstricklol.mov</div>
      </div>

      {/* Central Big Video (hello.mov) */}
      <div className={`abs win-wrap no-fade ${isPlayingHello ? 'played' : ''}`} id="big-video" style={{ left: '320px', top: '526px', width: '800px' }}>
        <div className="hellomov cursor-glass" onClick={toggleHelloPlay}>
          <video
            id="main-hello-video"
            className="cover no-drag"
            src="/assets/hello.mp4"
            poster="/assets/hero-hello-poster.webp"
            autoPlay
            muted
            loop
            playsInline
          />
          {!isPlayingHello && (
            <div className="play-cta liquid-glass" style={{ display: 'flex' }}>
              <span className="gloss no-drag"></span>
              <img className="tri no-drag" src="/assets/play-tri.svg" alt="" />
              <span>play video</span>
            </div>
          )}
        </div>
        <div className="win-caption">hello.mov</div>
      </div>

      {/* Center Headline & CTAs */}
      <div className="abs headline-wrap no-fade" id="hero-center" style={{ left: '50%', top: '352px', transform: 'translate(-50%,-50%)' }}>
        <div className="head-group">
          <h1 className="headline">heyclicky</h1>
          <p className="subtitle">an ai buddy that lives on your mac</p>
        </div>
        <div className="btns">
          <div className="btn-col">
            <a 
              className="btn mac" 
              href="https://github.com/farzaa/clicky-releases/releases/latest/download/HeyClicky.dmg" 
              download 
              data-placement="hero"
            >
              <div className="gloss no-drag"></div>
              <img className="ico no-drag" src="/assets/btn-apple.svg" alt="" />
              <span className="cta-desktop">download for mac</span>
              <span className="cta-mobile">send it to me</span>
            </a>
            <div className="btn-sub">100% free. sonoma 14.2 or higher</div>
          </div>
          <a className="btn os-win" href="https://tally.so/r/kdWMjM" target="_blank" rel="noopener noreferrer">
            <div className="gloss no-drag"></div>
            <img className="ico no-drag" src="/assets/btn-windows.svg" alt="" />
            <span>windows waitlist</span>
          </a>
        </div>
      </div>
    </section>
  );
}
