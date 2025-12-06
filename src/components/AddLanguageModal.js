// frontend/src/components/AddLanguageModal.js
import React, { useState, useEffect } from 'react';
import { X, Code, ChevronRight, Search, Loader } from 'lucide-react';
import { suggestionsService } from '../services/suggestionsService';

const AddLanguageModal = ({ isOpen, onClose, userLanguages, onSelectLanguage }) => {
  const [allLanguages, setAllLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchLanguages();
    }
  }, [isOpen]);

  const fetchLanguages = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the existing suggestionsService
      const languages = await suggestionsService.getProgrammingLanguages();
      
      console.log('Fetched languages:', languages);
      setAllLanguages(languages || []);
      
    } catch (err) {
      console.error('Error fetching languages:', err);
      setError('Failed to load languages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter out languages user already has
  const userLanguageIds = userLanguages.map(ul => 
    ul.language_id || ul.programming_languages?.id
  );
  
  const availableLanguages = allLanguages.filter(lang => 
    !userLanguageIds.includes(lang.id)
  );

  // Apply search filter
  const filteredLanguages = availableLanguages.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Animated Background Elements */}
        <div style={styles.bgDecor1} />
        <div style={styles.bgDecor2} />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.headerIcon}>
              <Code size={24} color="#3b82f6" />
            </div>
            <div>
              <h2 style={styles.title}>Add Programming Language</h2>
              <p style={styles.subtitle}>
                Select a language to take an assessment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={styles.closeButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search languages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <Loader size={48} />
              <p style={styles.loadingText}>Loading languages...</p>
            </div>
          ) : error ? (
            <div style={styles.errorContainer}>
              <p style={styles.errorText}>{error}</p>
              <button
                onClick={fetchLanguages}
                style={styles.retryButton}
              >
                Try Again
              </button>
            </div>
          ) : filteredLanguages.length === 0 ? (
            <div style={styles.emptyContainer}>
              <Code size={48} color="#6b7280" />
              <p style={styles.emptyText}>
                {searchQuery ? 'No languages found matching your search' : 'No more languages available to add'}
              </p>
            </div>
          ) : (
            <div style={styles.languageGrid}>
              {filteredLanguages.map(lang => (
                <button
                  key={lang.id}
                  style={styles.languageCard}
                  onClick={() => onSelectLanguage(lang)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.05) 100%)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={styles.languageCardContent}>
                    <Code size={20} color="#3b82f6" />
                    <span style={styles.languageName}>{lang.name}</span>
                  </div>
                  <ChevronRight size={18} color="#9ca3af" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            You'll take a quick assessment to determine your skill level
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(8px)',
    padding: '20px'
  },
  modal: {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(7, 11, 20, 0.98) 100%)',
    borderRadius: '24px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 2
  },
  bgDecor1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
    top: '-200px',
    right: '-200px',
    zIndex: 1,
    pointerEvents: 'none'
  },
  bgDecor2: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
    bottom: '-150px',
    left: '-150px',
    zIndex: 1,
    pointerEvents: 'none'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    zIndex: 3
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'white',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '4px 0 0 0'
  },
  closeButton: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 2rem',
    marginTop: '1.5rem',
    position: 'relative',
    zIndex: 3
  },
  searchInput: {
    flex: 1,
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: 'white',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease'
  },
  content: {
    padding: '2rem',
    overflowY: 'auto',
    flex: 1,
    position: 'relative',
    zIndex: 3
  },
  languageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px'
  },
  languageCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.05) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'left'
  },
  languageCardContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  languageName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#e2e8f0'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '60px'
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '16px'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '60px'
  },
  errorText: {
    color: '#fca5a5',
    fontSize: '16px',
    textAlign: 'center'
  },
  retryButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '60px'
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: '15px',
    textAlign: 'center',
    maxWidth: '300px'
  },
  footer: {
    padding: '1.5rem 2rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
    zIndex: 3
  },
  footerText: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: 0,
    textAlign: 'center'
  }
};

export default AddLanguageModal;