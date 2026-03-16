import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

import './BioLinkElement.css';

const BioLinkElement = ({ element, isPreview = false, settings = {} }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const renderElement = () => {
    switch (element.type) {
      case 'gallery':
        return renderGallery();
      case 'video':
        return renderVideo();
      case 'separator':
        return renderSeparator();
      case 'cta':
        return renderCTA();
      case 'text':
        return renderText();
      default:
        return <div>Unknown element type</div>;
    }
  };

  const renderGallery = () => {
    const images = element.content?.images || [];
    
    // Helper function to get the correct image URL
    const getImageUrl = (imageUrl) => {
      if (imageUrl.startsWith('data:')) {
        // Base64 data URL
        return imageUrl;
      } else if (imageUrl.startsWith('http')) {
        // Full URL
        return imageUrl;
      } else {
        // Relative URL, add backend URL
        return `${import.meta.env.VITE_BACKEND_URL}${imageUrl}`;
      }
    };
    
    const handleImageClick = (index) => {
      setCurrentImageIndex(index);
      setShowImageModal(true);
    };

    const handlePrevImage = () => {
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    };

    const handleNextImage = () => {
      setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    };

  const handleCloseModal = () => {
    setShowImageModal(false);
  };

  // Keyboard navigation for modal
  const handleKeyDown = (e) => {
    if (!showImageModal) return;
    
    switch (e.key) {
      case 'Escape':
        handleCloseModal();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        handlePrevImage();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleNextImage();
        break;
    }
  };

  // Add keyboard event listener when modal is open
  useEffect(() => {
    if (showImageModal) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showImageModal, currentImageIndex]);

    if (images.length === 0) {
      return (
        <div className="biolink-element-gallery">
          <div className="biolink-element-gallery-placeholder">
            <p>No images uploaded</p>
          </div>
        </div>
      );
    }

    // If only 1 image, show it in a simple format
    if (images.length === 1) {
      return (
        <div className="biolink-element-gallery">
            <div className="biolink-element-gallery-single">
              <div className="biolink-element-gallery-item">
                <img src={getImageUrl(images[0])} alt="Gallery 1" />
                {element.content?.captions?.[0] && (
                  <p className="biolink-element-gallery-caption">{element.content.captions[0]}</p>
                )}
              </div>
            </div>
        </div>
      );
    }

    // For more than 1 image, show 4x4 grid with click to view all
    return (
      <div className="biolink-element-gallery">
        <div className="biolink-element-gallery-grid-4x4">
          {images.slice(0, 4).map((image, index) => (
            <div 
              key={index} 
              className="biolink-element-gallery-item-4x4"
              onClick={() => handleImageClick(index)}
            >
              <img src={getImageUrl(image)} alt={`Gallery ${index + 1}`} />
              {index === 3 && images.length > 4 && (
                <div className="biolink-element-more-images-overlay">
                  <span>+{images.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Image Modal - Rendered as Portal */}
        {showImageModal && createPortal(
          <div className="biolink-element-image-modal-overlay" onClick={handleCloseModal}>
            <div className="biolink-element-image-modal" onClick={(e) => e.stopPropagation()}>
              <div className="biolink-element-image-modal-header">
                <h3>Gallery ({currentImageIndex + 1} of {images.length})</h3>
                <button className="biolink-element-close-modal-btn" onClick={handleCloseModal} title="Close (Esc)">
                  <X size={24} />
                </button>
              </div>
              
              <div className="biolink-element-image-modal-content">
                <div className="biolink-element-image-modal-grid">
                  {images.map((image, index) => (
                    <div 
                      key={index} 
                      className={`biolink-element-image-modal-item ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                      title={`View image ${index + 1}`}
                    >
                      <img src={getImageUrl(image)} alt={`Gallery ${index + 1}`} />
                    </div>
                  ))}
                </div>
                
                <div className="biolink-element-image-modal-main">
                  <button 
                    className="biolink-element-nav-btn biolink-element-prev-btn" 
                    onClick={handlePrevImage}
                    title="Previous image (←)"
                    disabled={images.length <= 1}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  
                  <div className="biolink-element-main-image-container">
                    <img 
                      src={getImageUrl(images[currentImageIndex])} 
                      alt={`Gallery ${currentImageIndex + 1}`} 
                      className="biolink-element-main-image"
                    />
                    {element.content?.captions?.[currentImageIndex] && (
                      <p className="biolink-element-main-image-caption">
                        {element.content.captions[currentImageIndex]}
                      </p>
                    )}
                  </div>
                  
                  <button 
                    className="biolink-element-nav-btn biolink-element-next-btn" 
                    onClick={handleNextImage}
                    title="Next image (→)"
                    disabled={images.length <= 1}
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  };

  const renderVideo = () => {
    const { url, caption } = element.content || {};
    const source = element.content?.source || 'url';
    const displayMode = element.content?.displayMode || 'single'; // single or grid

    if (!url) {
      return (
        <div className="biolink-element-video">
          <div className="biolink-element-video-placeholder">
            <p>{source === 'upload' ? 'Upload a video' : 'Enter video URL'}</p>
          </div>
        </div>
      );
    }

    const ensureAbsoluteUrl = (maybeRelative) => {
      if (!maybeRelative) return '';
      if (maybeRelative.startsWith('http')) return maybeRelative;
      try {
        return `${import.meta.env.VITE_BACKEND_URL || ''}${maybeRelative}`;
      } catch {
        return maybeRelative;
      }
    };

    const isDirectVideoFile = (videoUrl) => {
      const lower = videoUrl.toLowerCase();
      return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.includes('/uploads/biolinks/');
    };

    const getVideoEmbedUrl = (videoUrl) => {
      if (videoUrl.includes('youtube.com/watch?v=')) {
        const params = new URL(videoUrl).searchParams;
        const videoId = params.get('v');
        return `https://www.youtube.com/embed/${videoId}`;
      } else if (videoUrl.includes('youtu.be/')) {
        const videoId = videoUrl.split('youtu.be/')[1];
        return `https://www.youtube.com/embed/${videoId}`;
      } else if (videoUrl.includes('vimeo.com/')) {
        const videoId = videoUrl.split('vimeo.com/')[1];
        return `https://player.vimeo.com/video/${videoId}`;
      }
      return videoUrl;
    };

    const effectiveUrl = source === 'upload' || isDirectVideoFile(url) ? ensureAbsoluteUrl(url) : getVideoEmbedUrl(url);
    const useHtml5 = source === 'upload' || isDirectVideoFile(url);

    // Grid layout inspired by gallery
    if (displayMode === 'grid') {
      return (
        <div className="biolink-element-video">
          <div className="biolink-element-video-grid-2x2">
            <div className="biolink-element-video-item-2x2">
              {useHtml5 ? (
                <video 
                  controls 
                  playsInline 
                  src={effectiveUrl}
                />
              ) : (
                <iframe
                  src={effectiveUrl}
                  title="Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
            <div className="biolink-element-video-item-2x2 biolink-element-video-empty"></div>
            <div className="biolink-element-video-item-2x2 biolink-element-video-empty"></div>
            <div className="biolink-element-video-item-2x2 biolink-element-video-empty"></div>
          </div>
          {caption && <p className="biolink-element-video-caption">{caption}</p>}
        </div>
      );
    }

    // Single video layout (original)
    return (
      <div className="biolink-element-video">
        <div className="biolink-element-video-container">
          {useHtml5 ? (
            <video controls playsInline src={effectiveUrl} />
          ) : (
            <iframe
              src={effectiveUrl}
              title="Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
        {caption && <p className="biolink-element-video-caption">{caption}</p>}
      </div>
    );
  };

  const renderSeparator = () => {
    const { style, color, height } = element.content || {};
    
    const separatorStyles = {
      height: height || '2px',
      backgroundColor: color || settings.accentColor || '#8b5cf6',
      margin: '1rem 0'
    };

    switch (style) {
      case 'dots':
        return (
          <div className="biolink-element-separator-dots" style={separatorStyles}>
            <span>•</span>
            <span>•</span>
            <span>•</span>
          </div>
        );
      case 'dashed':
        return (
          <div className="biolink-element-separator-dashed" style={separatorStyles} />
        );
      default:
        return <div className="biolink-element-separator-line" style={separatorStyles} />;
    }
  };

  const renderCTA = () => {
    const { text, url, style } = element.content || {};
    
    if (!text || !url) {
      return (
        <div className="biolink-element-cta-placeholder">
          <p>Configure CTA button</p>
        </div>
      );
    }

    const buttonStyles = {
      backgroundColor: settings.accentColor || '#8b5cf6',
      color: '#ffffff',
      borderRadius: settings.borderRadius || '12px',
      padding: settings.spacing || '16px'
    };

    return (
      <div className="biolink-element-cta">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`biolink-element-cta-button ${style}`}
          style={buttonStyles}
        >
          {text}
        </a>
      </div>
    );
  };

  const renderText = () => {
    const { content, alignment } = element.content || {};
    
    if (!content) {
      return (
        <div className="biolink-element-text-placeholder">
          <p>Add text content</p>
        </div>
      );
    }

    const textStyles = {
      color: settings.textColor || '#1e1b4b',
      textAlign: 'center',
      fontSize: '16px',
      lineHeight: '1.6'
    };

    return (
      <div className="biolink-element-text" style={textStyles}>
        <p>{content}</p>
      </div>
    );
  };



  return (
    <div className={`biolink-element biolink-element-${element.type}`}>
      {renderElement()}
    </div>
  );
};

export default BioLinkElement;
