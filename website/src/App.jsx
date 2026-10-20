import React, { useState, useEffect } from 'react';
import Menubar from './components/Menubar';
import Hero from './components/Hero';
import Features from './components/Features';
import Manifesto from './components/Manifesto';
import Feedback from './components/Feedback';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import VideoModal from './components/VideoModal';

export default function App() {
  const [modalData, setModalData] = useState(null);

  // Delightful draggable behavior for stickers
  useEffect(() => {
    let activeElem = null;
    let initialX = 0;
    let initialY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMouseDown = (e) => {
      const target = e.target.closest('.draggable');
      if (target && !e.target.closest('button') && !e.target.closest('a')) {
        activeElem = target;
        initialX = e.clientX;
        initialY = e.clientY;
        activeElem.style.zIndex = '50';
      }
    };

    const onMouseMove = (e) => {
      if (activeElem) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        const currentTransform = activeElem.dataset.baseTransform || '';
        activeElem.style.transform = `${currentTransform} translate(${currentX}px, ${currentY}px)`;
      }
    };

    const onMouseUp = () => {
      if (activeElem) {
        activeElem = null;
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="stage" style={{ minHeight: '100vh', background: '#f5f5f5', position: 'relative' }}>
      <Menubar />
      <Hero onOpenModal={(data) => setModalData(data)} />
      <Features />
      <Manifesto />
      <div className="side-fade" style={{ top: '2733px', height: '768px' }}></div>
      <div className="section-stroke" style={{ top: '3495px' }}></div>
      <Feedback />
      <Pricing />
      <FAQ />
      <Footer />
      <VideoModal
        isOpen={!!modalData}
        videoData={modalData}
        onClose={() => setModalData(null)}
      />
    </div>
  );
}
