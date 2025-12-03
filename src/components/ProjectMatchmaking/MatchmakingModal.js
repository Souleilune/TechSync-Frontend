// frontend/src/components/ProjectMatchmaking/MatchmakingModal.js
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Zap, Trophy, ChevronRight, X, Sparkles, Target, Shield, Sword, Star } from 'lucide-react';

const MatchmakingModal = ({ 
  isOpen, 
  onClose, 
  matchedProjects = [], 
  onViewAllMatches,
  onProjectSelect 
}) => {
  const [animationPhase, setAnimationPhase] = useState('entering');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase('entering');
      setSelectedIndex(0);
      
      const timer1 = setTimeout(() => setAnimationPhase('scanning'), 300);
      const timer2 = setTimeout(() => setAnimationPhase('reveal'), 1800);
      const timer3 = setTimeout(() => setAnimationPhase('complete'), 2800);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && selectedIndex > 0) {
        setSelectedIndex(prev => prev - 1);
      }
      if (e.key === 'ArrowRight' && selectedIndex < Math.min(matchedProjects.length - 1, 2)) {
        setSelectedIndex(prev => prev + 1);
      }
      if (e.key === 'Enter' && matchedProjects[selectedIndex]) {
        onProjectSelect(matchedProjects[selectedIndex]);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, matchedProjects, onClose, onProjectSelect]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || matchedProjects.length === 0) return null;

  const topMatches = matchedProjects.slice(0, 3);
  const bestMatch = topMatches[0];

  const getMatchRank = (score) => {
    if (score >= 90) return { rank: 'S', color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.6)' };
    if (score >= 80) return { rank: 'A', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' };
    if (score >= 70) return { rank: 'B', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.6)' };
    if (score >= 60) return { rank: 'C', color: '#22c55e', glow: 'rgba(34, 197, 94, 0.6)' };
    return { rank: 'D', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.6)' };
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return {color: '#22c55e' };
      case 'medium': return {color: '#f59e0b' };
      case 'hard': return {color: '#ef4444' };
      default: return {color: '#3b82f6' };
    }
  };

  const keyframes = `
    @keyframes mmFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes mmScaleIn {
      from { 
        opacity: 0;
        transform: scale(0.9) translateY(20px);
      }
      to { 
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
    
    @keyframes scanLine {
      0% { transform: translateY(-100%); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateY(100vh); opacity: 0; }
    }
    
    @keyframes hexPulse {
      0%, 100% { 
        transform: scale(1);
        filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
      }
      50% { 
        transform: scale(1.05);
        filter: drop-shadow(0 0 40px rgba(59, 130, 246, 0.8));
      }
    }
    
    @keyframes borderGlow {
      0%, 100% { 
        box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.1), 
                    0 0 20px rgba(59, 130, 246, 0.2);
      }
      50% { 
        box-shadow: inset 0 0 30px rgba(59, 130, 246, 0.2), 
                    0 0 40px rgba(59, 130, 246, 0.4);
      }
    }
    
    @keyframes textGlow {
      0%, 100% { text-shadow: 0 0 10px currentColor; }
      50% { text-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
    }
    
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes cardReveal {
      from { 
        opacity: 0;
        transform: translateY(40px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    @keyframes rankPop {
      0% { transform: scale(0) rotate(-180deg); }
      50% { transform: scale(1.2) rotate(10deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    
    @keyframes energyFlow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    @keyframes radarScan {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    @keyframes particleFloat {
      0%, 100% { 
        transform: translateY(0) translateX(0);
        opacity: 0.3;
      }
      50% { 
        transform: translateY(-20px) translateX(10px);
        opacity: 0.8;
      }
    }
  `;

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'mmFadeIn 0.3s ease-out'
    },
    scanLine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '2px',
      background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
      animation: animationPhase === 'scanning' ? 'scanLine 1.5s ease-in-out' : 'none',
      opacity: animationPhase === 'scanning' ? 1 : 0,
      boxShadow: '0 0 20px #3b82f6, 0 0 40px #3b82f6'
    },
    gridOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `
        linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
      pointerEvents: 'none'
    },
    cornerAccent: {
      position: 'absolute',
      width: '100px',
      height: '100px',
      pointerEvents: 'none'
    },
    container: {
      position: 'relative',
      width: '100%',
      maxWidth: '950px',
      padding: '40px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      animation: 'mmScaleIn 0.5s ease-out'
    },
    closeButton: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      width: '44px',
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      color: '#6b7280',
      transition: 'all 0.3s ease',
      zIndex: 10
    },
    headerContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: '32px',
      opacity: animationPhase !== 'entering' ? 1 : 0,
      transform: animationPhase !== 'entering' ? 'translateY(0)' : 'translateY(-20px)',
      transition: 'all 0.5s ease-out'
    },
    hexagonBadge: {
      position: 'relative',
      width: '80px',
      height: '92px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '20px',
      animation: animationPhase === 'scanning' ? 'hexPulse 1s ease-in-out infinite' : 'none'
    },
    hexagonSvg: {
      position: 'absolute',
      width: '100%',
      height: '100%'
    },
    hexagonContent: {
      position: 'relative',
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    matchFoundText: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#3b82f6',
      textTransform: 'uppercase',
      letterSpacing: '4px',
      marginBottom: '8px',
      animation: 'textGlow 2s ease-in-out infinite'
    },
    mainTitle: {
      fontSize: '36px',
      fontWeight: '800',
      color: 'white',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      marginBottom: '8px',
      background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    subtitle: {
      fontSize: '14px',
      color: '#64748b',
      letterSpacing: '1px'
    },
    statsContainer: {
      display: 'flex',
      gap: '32px',
      marginBottom: '36px',
      padding: '20px 40px',
      background: 'rgba(15, 23, 42, 0.6)',
      borderRadius: '12px',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      opacity: animationPhase === 'complete' ? 1 : 0,
      transform: animationPhase === 'complete' ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.5s ease-out',
      animation: animationPhase === 'complete' ? 'borderGlow 3s ease-in-out infinite' : 'none'
    },
    statItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      position: 'relative'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '700',
      fontFamily: 'monospace'
    },
    statLabel: {
      fontSize: '11px',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    statDivider: {
      width: '1px',
      height: '40px',
      background: 'linear-gradient(180deg, transparent, rgba(59, 130, 246, 0.3), transparent)',
      alignSelf: 'center'
    },
    cardsContainer: {
      display: 'flex',
      gap: '24px',
      justifyContent: 'center',
      marginBottom: '36px',
      opacity: animationPhase === 'reveal' || animationPhase === 'complete' ? 1 : 0,
      transition: 'opacity 0.5s ease-out',
      flexWrap: 'wrap'
    },
    card: {
      position: 'relative',
      width: '280px',
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(7, 11, 20, 0.95) 100%)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      overflow: 'hidden',
      animation: 'cardReveal 0.6s ease-out forwards',
      animationDelay: '0.1s',
      opacity: 0
    },
    cardSelected: {
      border: '1px solid rgba(59, 130, 246, 0.5)',
      boxShadow: '0 0 30px rgba(59, 130, 246, 0.2), inset 0 0 30px rgba(59, 130, 246, 0.05)',
      transform: 'translateY(-8px)'
    },
    cardHeader: {
      position: 'relative',
      padding: '24px 20px 16px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
    },
    rankBadge: {
      position: 'absolute',
      top: '-20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      fontWeight: '800',
      fontFamily: 'monospace',
      border: '2px solid',
      animation: 'rankPop 0.5s ease-out forwards',
      animationDelay: '0.3s',
      opacity: 0
    },
    bestMatchBadge: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 10px',
      background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1))',
      borderRadius: '6px',
      border: '1px solid rgba(251, 191, 36, 0.3)',
      fontSize: '10px',
      fontWeight: '600',
      color: '#fbbf24',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    matchScore: {
      textAlign: 'center',
      marginTop: '16px'
    },
    scoreValue: {
      fontSize: '48px',
      fontWeight: '800',
      fontFamily: 'monospace',
      lineHeight: 1
    },
    scoreLabel: {
      fontSize: '12px',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      marginTop: '4px'
    },
    cardBody: {
      padding: '20px'
    },
    projectTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: 'white',
      marginBottom: '8px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    projectDescription: {
      fontSize: '13px',
      color: '#64748b',
      lineHeight: '1.5',
      marginBottom: '16px',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      minHeight: '40px'
    },
    cardMeta: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    difficultyBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '500',
      textTransform: 'uppercase'
    },
    memberCount: {
      fontSize: '12px',
      color: '#64748b',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    techStack: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px'
    },
    techTag: {
      padding: '4px 10px',
      background: 'rgba(59, 130, 246, 0.1)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#93c5fd',
      fontFamily: 'monospace'
    },
    cardFooter: {
      padding: '16px 20px',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      background: 'rgba(0, 0, 0, 0.2)'
    },
    selectIndicator: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '12px',
      color: '#3b82f6',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    actionsContainer: {
      display: 'flex',
      gap: '16px',
      opacity: animationPhase === 'complete' ? 1 : 0,
      transform: animationPhase === 'complete' ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.5s ease-out 0.2s',
      flexWrap: 'wrap',
      justifyContent: 'center'
    },
    primaryButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 40px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      border: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '700',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      position: 'relative',
      overflow: 'hidden'
    },
    buttonGlow: {
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
      animation: 'energyFlow 2s ease-in-out infinite'
    },
    secondaryButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 32px',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#94a3b8',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textTransform: 'uppercase',
      letterSpacing: '1px'
    },
    hint: {
      marginTop: '28px',
      fontSize: '12px',
      color: '#475569',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      opacity: animationPhase === 'complete' ? 1 : 0,
      transition: 'opacity 0.5s ease-out 0.4s'
    },
    hintKey: {
      padding: '4px 8px',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '4px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#64748b'
    }
  };

  return createPortal(
    <>
      <style>{keyframes}</style>
      <div style={styles.overlay} onClick={onClose}>
        {/* Grid Overlay */}
        <div style={styles.gridOverlay} />
        
        {/* Scan Line Effect */}
        <div style={styles.scanLine} />
        
        {/* Corner Accents */}
        <svg style={{...styles.cornerAccent, top: 0, left: 0}} viewBox="0 0 100 100">
          <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1"/>
        </svg>
        <svg style={{...styles.cornerAccent, top: 0, right: 0, transform: 'scaleX(-1)'}} viewBox="0 0 100 100">
          <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1"/>
        </svg>
        <svg style={{...styles.cornerAccent, bottom: 0, left: 0, transform: 'scaleY(-1)'}} viewBox="0 0 100 100">
          <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1"/>
        </svg>
        <svg style={{...styles.cornerAccent, bottom: 0, right: 0, transform: 'scale(-1)'}} viewBox="0 0 100 100">
          <path d="M0 30 L0 0 L30 0" fill="none" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="1"/>
        </svg>
        
        <div style={styles.container} onClick={(e) => e.stopPropagation()}>
         

          {/* Header */}
          <div style={styles.headerContainer}>
            {/* Hexagon Badge */}
            <div style={styles.hexagonBadge}>
              <svg style={styles.hexagonSvg} viewBox="0 0 80 92">
                <defs>
                  <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8"/>
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <polygon 
                  points="40,2 76,24 76,68 40,90 4,68 4,24" 
                  fill="rgba(15, 23, 42, 0.8)"
                  stroke="url(#hexGradient)"
                  strokeWidth="2"
                  filter="url(#glow)"
                />
              </svg>
              <div style={styles.hexagonContent}>
                <Target size={32} color="#3b82f6" />
              </div>
            </div>
            
            <span style={styles.matchFoundText}>Match Found</span>
            <h1 style={styles.mainTitle}>Projects Detected</h1>
            <span style={styles.subtitle}>Compatibility analysis complete</span>
          </div>

          {/* Stats */}
          <div style={styles.statsContainer}>
            <div style={styles.statItem}>
              <span style={{...styles.statValue, color: '#3b82f6'}}>{matchedProjects.length}</span>
              <span style={styles.statLabel}>Matches</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={{...styles.statValue, color: '#22c55e'}}>{Math.round(bestMatch?.score || 0)}%</span>
              <span style={styles.statLabel}>Top Score</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={{...styles.statValue, color: '#a855f7'}}>
                {topMatches.filter(p => (p.score || 0) >= 70).length}
              </span>
              <span style={styles.statLabel}>High Tier</span>
            </div>
          </div>

          {/* Project Cards */}
          <div style={styles.cardsContainer}>
            {topMatches.map((project, index) => {
              const matchRank = getMatchRank(project.score || 0);
              const diffInfo = getDifficultyIcon(project.difficulty_level);
              const isSelected = index === selectedIndex;
              
              return (
                <div
                  key={project.projectId || project.id || index}
                  style={{
                    ...styles.card,
                    ...(isSelected ? styles.cardSelected : {}),
                    animationDelay: `${0.1 + index * 0.15}s`
                  }}
                  onClick={() => setSelectedIndex(index)}
                  onDoubleClick={() => onProjectSelect(project)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {/* Card Header */}
                  <div style={styles.cardHeader}>
                    {/* Rank Badge */}
                    <div style={{
                      ...styles.rankBadge,
                      background: `linear-gradient(135deg, ${matchRank.color}20, ${matchRank.color}10)`,
                      borderColor: matchRank.color,
                      color: matchRank.color,
                      boxShadow: `0 0 20px ${matchRank.glow}`
                    }}>
                      {matchRank.rank}
                    </div>
                    
                    {/* Best Match Badge */}
                    {index === 0 && (
                      <div style={styles.bestMatchBadge}>
                        <Trophy size={10} />
                        Best
                      </div>
                    )}
                    
                    {/* Match Score */}
                    <div style={styles.matchScore}>
                      <div style={{
                        ...styles.scoreValue,
                        background: `linear-gradient(135deg, ${matchRank.color}, ${matchRank.color}aa)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}>
                        {Math.round(project.score || 0)}
                      </div>
                      <div style={styles.scoreLabel}>Match Score</div>
                    </div>
                  </div>
                  
                  {/* Card Body */}
                  <div style={styles.cardBody}>
                    <h3 style={styles.projectTitle}>{project.title}</h3>
                    <p style={styles.projectDescription}>{project.description}</p>
                    
                    <div style={styles.cardMeta}>
                      <div style={{
                        ...styles.difficultyBadge,
                        color: diffInfo.color
                      }}>
                        <span>{diffInfo.icon}</span>
                        {project.difficulty_level || 'Medium'}
                      </div>
                      <div style={styles.memberCount}>
                        <Users size={12} />
                        {project.current_members || 0}/{project.maximum_members || 10}
                      </div>
                    </div>
                    
                    <div style={styles.techStack}>
                      {(project.technologies || []).slice(0, 3).map((tech, i) => (
                        <span key={i} style={styles.techTag}>{tech}</span>
                      ))}
                      {(project.technologies?.length || 0) > 3 && (
                        <span style={styles.techTag}>+{project.technologies.length - 3}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Card Footer */}
                  <div style={styles.cardFooter}>
                    <div style={{
                      ...styles.selectIndicator,
                      opacity: isSelected ? 1 : 0.3
                    }}>
                      {isSelected ? (
                        <>
                          <Shield size={14} />
                          Selected
                        </>
                      ) : (
                        <>
                          Click to select
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div style={styles.actionsContainer}>
            <button
              style={styles.primaryButton}
              onClick={() => onProjectSelect(topMatches[selectedIndex])}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={styles.buttonGlow} />
              <Sword size={18} />
              Enter Project
              <ChevronRight size={18} />
            </button>
            
            <button
              style={styles.secondaryButton}
              onClick={onViewAllMatches}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <Users size={18} />
              View All ({matchedProjects.length})
            </button>
          </div>

          {/* Keyboard Hints */}
          <div style={styles.hint}>
            <span style={styles.hintKey}>←</span>
            <span style={styles.hintKey}>→</span>
            <span>Navigate</span>
            <span style={{ margin: '0 8px', color: '#334155' }}>•</span>
            <span style={styles.hintKey}>Enter</span>
            <span>Select</span>
            <span style={{ margin: '0 8px', color: '#334155' }}>•</span>
            <span style={styles.hintKey}>Esc</span>
            <span>Close</span>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default MatchmakingModal;