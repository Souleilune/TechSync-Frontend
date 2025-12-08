// frontend/src/components/AIChat/AIChatInterface.js - UPDATED THEME
// Matches Dashboard dark theme with subtle gradients and modern styling

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { aiChatService } from '../../services/aiChatService';
import { Send, Sparkles, Code, Coffee, Lightbulb, Rocket, MessageCircle, Bot, CheckCircle } from 'lucide-react';

const AIChatInterface = () => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [creatingProject, setCreatingProject] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      content: `Hi ${user?.username || 'there'}! I'm Sync, your AI coding assistant. I can help you to:

• Generate project ideas with structured weekly tasks
• Plan and structure your coding projects  
• Provide technical guidance and best practices
• Answer questions about programming concepts
• Help with project architecture and implementation

What would you like to work on today?`,
      timestamp: new Date().toISOString()
    }]);
  }, [user?.username]);

  // Listen for project creation events from Dashboard
  useEffect(() => {
    const handleCreateAIProject = async (event) => {
      console.log('═══════════════════════════════════════════════');
      console.log('📨 AI CHAT RECEIVED CREATE PROJECT EVENT');
      console.log('═══════════════════════════════════════════════');
      const projectData = event.detail.project;
      
      console.log('📥 event.detail:', event.detail);
      console.log('📥 event.detail.project:', projectData);
      console.log('📥 event.detail.project.tasks:', projectData.tasks?.length || 0);
      
      if (projectData.tasks && projectData.tasks.length > 0) {
        console.log('📋 Received task titles:', projectData.tasks.map(t => t.title));
      } else {
        console.error('⚠️ NO TASKS IN EVENT.DETAIL.PROJECT!');
        console.error('⚠️ Project data keys:', Object.keys(projectData));
      }
      console.log('═══════════════════════════════════════════════');
      
      setCreatingProject(projectData.title);
      
      try {
        const cleanedProjectData = validateAndCleanProjectData(projectData);
        
        console.log('═══════════════════════════════════════════════');
        console.log('🚀 CALLING aiChatService.createProjectFromResponse');
        console.log('═══════════════════════════════════════════════');
        console.log('📤 Sending cleanedProjectData:', cleanedProjectData);
        console.log('📤 Sending cleanedProjectData.tasks:', cleanedProjectData.tasks?.length || 0);
        
        if (cleanedProjectData.tasks && cleanedProjectData.tasks.length > 0) {
          console.log('📋 Sending task titles:', cleanedProjectData.tasks.map(t => t.title));
        } else {
          console.error('⚠️ CLEANED DATA HAS NO TASKS!');
        }
        console.log('═══════════════════════════════════════════════');
        
        const response = await aiChatService.createProjectFromResponse(cleanedProjectData, token);
        
        if (response.success) {
          const taskCount = cleanedProjectData.tasks?.length || 0;
          const successMessage = {
            id: Date.now(),
            role: 'assistant',
            content: `Great! I've successfully created the project "${cleanedProjectData.title}" ${taskCount > 0 ? `with ${taskCount} tasks` : ''} for you! You can now find it in your "My Projects" section. ${taskCount > 0 ? 'The tasks are ready to guide you through the project development.' : ''} Let that sync in!`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, successMessage]);
          
          window.dispatchEvent(new CustomEvent('projectCreated', { 
            detail: { project: response.data.project } 
          }));
          
        } else {
          throw new Error(response.message || 'Failed to create project');
        }
      } catch (error) {
        console.error('Error creating project:', error);
        const errorMessage = {
          id: Date.now(),
          role: 'assistant',
          content: `Sorry, I couldn't create the project "${projectData.title}". ${error.response?.data?.message || error.message || 'Please try again.'}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setCreatingProject(null);
      }
    };

    window.addEventListener('createAIProject', handleCreateAIProject);
    return () => window.removeEventListener('createAIProject', handleCreateAIProject);
  }, [token]);

  // ENHANCED: Parse tasks from AI response
  const parseTasksFromContent = (content) => {
    console.log('═══════════════════════════════════════════════');
    console.log('🔍 PARSE TASKS START');
    console.log('═══════════════════════════════════════════════');
    console.log('📄 Content length:', content.length);
    console.log('📄 First 500 chars:', content.substring(0, 500));
    
    const tasks = [];
    const lines = content.split('\n');
    
    console.log('📄 Total lines to parse:', lines.length);
    
    let currentWeek = null;
    let currentTaskTitle = '';
    let currentDescription = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match "Week X:" pattern
      const weekMatch = line.match(/^Week\s+(\d+)[\s:;-]+(.+)/i);
      if (weekMatch) {
        // Save previous task if exists
        if (currentTaskTitle) {
          const task = {
            title: currentTaskTitle,
            description: currentDescription.trim(),
            priority: 'medium',
            category: 'learning',
            estimated_hours: Math.min(parseInt(currentWeek) * 8, 40),
            target_date: null
          };
          tasks.push(task);
          console.log(`✅ Parsed: ${task.title} (${task.estimated_hours}h)`);
        }
        
        currentWeek = weekMatch[1];
        currentTaskTitle = `Week ${currentWeek}: ${weekMatch[2]}`;
        currentDescription = '';
        console.log(`🔍 Found Week ${currentWeek}: ${weekMatch[2]}`);
        continue;
      }
      
      // Collect subtasks/description
      if (currentTaskTitle) {
        if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
          const cleaned = line.replace(/^[-•*]\s*/, '').trim();
          if (cleaned && !cleaned.toLowerCase().startsWith('expected outcome')) {
            currentDescription += cleaned + '\n';
          }
        }
      }
    }
    
    // Save last task
    if (currentTaskTitle) {
      const task = {
        title: currentTaskTitle,
        description: currentDescription.trim(),
        priority: 'medium',
        category: 'learning',
        estimated_hours: Math.min(parseInt(currentWeek) * 8, 40),
        target_date: null
      };
      tasks.push(task);
      console.log(`✅ Parsed: ${task.title} (${task.estimated_hours}h)`);
    }
    
    console.log('═══════════════════════════════════════════════');
    console.log('✅ PARSE TASKS COMPLETE');
    console.log('📊 Total tasks parsed:', tasks.length);
    
    if (tasks.length > 0) {
      console.log('📋 Task summary:');
      tasks.forEach((task, i) => {
        console.log(`  ${i + 1}. ${task.title} (${task.estimated_hours}h)`);
      });
    } else {
      console.error('⚠️ NO TASKS WERE PARSED!');
      console.error('⚠️ Check if AI response has "Week 1:", "Week 2:", etc.');
    }
    console.log('═══════════════════════════════════════════════');
    
    return tasks;
  };

  // Enhanced validation function
  const validateAndCleanProjectData = (projectData) => {
    console.log('═══════════════════════════════════════════════');
    console.log('🧹 VALIDATE AND CLEAN - START');
    console.log('═══════════════════════════════════════════════');
    console.log('📥 INPUT projectData:', projectData);
    console.log('📥 INPUT projectData.tasks:', projectData.tasks?.length || 0);
    
    if (projectData.tasks && projectData.tasks.length > 0) {
      console.log('📋 Input task titles:', projectData.tasks.map(t => t.title));
    } else {
      console.error('⚠️ INPUT HAS NO TASKS!');
    }
    
    const cleaned = {
      title: String(projectData.title || 'Untitled Project').trim().substring(0, 100),
      description: String(projectData.description || projectData.detailed_description || 'AI-generated project').trim().substring(0, 500),
      detailed_description: String(projectData.detailed_description || projectData.description || 'AI-generated project').trim(),
      difficulty_level: validateDifficultyLevel(projectData.difficulty_level),
      required_experience_level: validateExperienceLevel(projectData.required_experience_level || projectData.difficulty_level),
      maximum_members: Math.max(1, Math.min(10, parseInt(projectData.maximum_members) || 1)),
      programming_languages: validateProgrammingLanguages(projectData.programming_languages),
      topics: validateTopics(projectData.topics),
      estimated_duration: projectData.estimated_duration || 'medium',
      status: 'active',
      is_public: false,
      tasks: Array.isArray(projectData.tasks) ? projectData.tasks : []
    };

    console.log('═══════════════════════════════════════════════');
    console.log('🧹 VALIDATE AND CLEAN - END');
    console.log('═══════════════════════════════════════════════');
    console.log('📤 OUTPUT cleaned:', cleaned);
    console.log('📤 OUTPUT cleaned.tasks:', cleaned.tasks?.length || 0);
    
    if (cleaned.tasks && cleaned.tasks.length > 0) {
      console.log('📋 Output task titles:', cleaned.tasks.map(t => t.title));
    } else {
      console.error('⚠️ OUTPUT HAS NO TASKS!');
      console.error('⚠️ This means tasks were lost during validation');
    }
    console.log('═══════════════════════════════════════════════');

    return cleaned;
  };

  const validateDifficultyLevel = (level) => {
    const validLevels = ['easy', 'medium', 'hard', 'expert'];
    const normalized = String(level || 'medium').toLowerCase().trim();
    
    const levelMap = {
      'beginner': 'easy',
      'intermediate': 'medium',
      'advanced': 'hard',
      'professional': 'expert'
    };
    
    const mappedLevel = levelMap[normalized] || normalized;
    return validLevels.includes(mappedLevel) ? mappedLevel : 'medium';
  };

  const validateExperienceLevel = (level) => {
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const normalized = String(level || 'intermediate').toLowerCase().trim();
    
    const difficultyToExperience = {
      'easy': 'beginner',
      'medium': 'intermediate', 
      'hard': 'advanced',
      'expert': 'expert'
    };
    
    const mappedLevel = difficultyToExperience[normalized] || normalized;
    return validLevels.includes(mappedLevel) ? mappedLevel : 'intermediate';
  };

  const validateProgrammingLanguages = (languages) => {
    if (!Array.isArray(languages)) {
      return ['JavaScript'];
    }
    
    const validLanguages = [
      'JavaScript', 'Python', 'Java', 'C#', 'C++', 'C', 'TypeScript', 
      'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin', 'Dart', 'R',
      'HTML', 'CSS', 'SQL', 'Shell', 'PowerShell'
    ];
    
    const cleaned = languages
      .map(lang => cleanTechnologyName(String(lang).trim()))
      .filter(lang => lang && lang.length > 0)
      .slice(0, 5);
    
    const frameworkMap = {
      'React': 'JavaScript',
      'Vue': 'JavaScript',
      'Angular': 'JavaScript',
      'Node.js': 'JavaScript',
      'Express': 'JavaScript',
      'Django': 'Python',
      'Flask': 'Python',
      'Spring': 'Java',
      'Laravel': 'PHP',
      'Rails': 'Ruby',
      'Next.js': 'JavaScript',
      'Nuxt.js': 'JavaScript'
    };
    
    const mapped = cleaned.map(lang => {
      const normalized = lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
      return frameworkMap[normalized] || 
             validLanguages.find(valid => valid.toLowerCase() === lang.toLowerCase()) || 
             lang;
    });
    
    return mapped.length > 0 ? [...new Set(mapped)] : ['JavaScript'];
  };

  const validateTopics = (topics) => {
    if (!Array.isArray(topics)) {
      return ['Web Development'];
    }
    
    const cleaned = topics
      .map(topic => String(topic).trim())
      .filter(topic => topic && topic.length > 0)
      .slice(0, 3);
    
    return cleaned.length > 0 ? cleaned : ['Web Development'];
  };

  const cleanTechnologyName = (tech) => {
    if (!tech) return null;
    
    let cleaned = tech
      .trim()
      .replace(/^\*\*\s*/, '')
      .replace(/\s*\*\*$/, '')
      .replace(/\*\*/g, '')
      .replace(/[()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const techMap = {
      'react': 'JavaScript',
      'vue': 'JavaScript', 
      'angular': 'JavaScript',
      'node': 'JavaScript',
      'nodejs': 'JavaScript',
      'node.js': 'JavaScript',
      'express': 'JavaScript',
      'django': 'Python',
      'flask': 'Python',
      'spring': 'Java',
      'laravel': 'PHP',
      'rails': 'Ruby',
      'nextjs': 'JavaScript',
      'next.js': 'JavaScript',
      'nuxtjs': 'JavaScript',
      'nuxt.js': 'JavaScript'
    };
    
    const lowerCleaned = cleaned.toLowerCase();
    const mapped = techMap[lowerCleaned];
    
    if (mapped) {
      return mapped;
    }
    
    const invalidWords = ['scoring', 'score', 'restart', 'option', 'timer', 'feature', 'system', 'tracking', 'leaderboard', 'feedback'];
    const isInvalid = invalidWords.some(word => lowerCleaned.includes(word));
    
    if (isInvalid) {
      console.log(`⚠️ Rejected invalid tech: "${cleaned}"`);
      return null;
    }
    
    return cleaned;
  };

  // ENHANCED: Extract project data with proper task parsing
  const extractProjectDataFromText = (content) => {
    console.log('═══════════════════════════════════════════════');
    console.log('🔍 EXTRACT PROJECT DATA - START');
    console.log('═══════════════════════════════════════════════');
    console.log('📄 Content length:', content.length);
    console.log('📄 First 200 chars:', content.substring(0, 200));
    
    const projects = [];
    
    const sanitizeTitle = (raw) => {
      if (!raw) return 'Untitled Project';
      let s = String(raw)
        .replace(/\*\*/g, '')
        .replace(/[#*_`]/g, '')
        .trim();
      s = s.replace(/^[\s\-•]*\d+\.\s*/, '').trim();
      s = s.replace(/^[\s\-•]+/, '').trim();
      s = s.replace(/^(?:project\s*(?:name|title)|title|name)\s*:?\s*/i, '').trim();
      s = s.replace(/^["'`]+|["'`]+$/g, '').trim();
      return s || 'Untitled Project';
    };

    // Extract title
    const titleMatch = content.match(/\*\*([^*]+)\*\*/);
    const title = titleMatch ? sanitizeTitle(titleMatch[1]) : 'AI Suggested Project';
    console.log('📌 Title:', title);

    // Extract description
    const lines = content.split('\n').filter(l => l.trim());
    let description = '';
    let foundTitle = false;
    
    for (const line of lines) {
      if (line.includes('**') && !foundTitle) {
        foundTitle = true;
        continue;
      }
      if (foundTitle && line.trim() && !line.startsWith('-') && !line.startsWith('•') && 
          !line.match(/^(Key Features|Technologies|Time Estimate|Difficulty|Week \d+):/i)) {
        description = line.trim();
        break;
      }
    }
    console.log('📝 Description:', description.substring(0, 100));

    // Extract technologies
    let technologies = ['JavaScript'];
    const techMatch = content.match(/Technologies:\s*([^\n]+)/i);
    if (techMatch) {
      const techLine = techMatch[1].trim();
      const extractedTechs = techLine
        .split(/[,•·+&/|]/)
        .map(t => cleanTechnologyName(t.trim()))
        .filter(t => t && t.length > 0 && t.length < 30);
      
      if (extractedTechs.length > 0) {
        technologies = extractedTechs;
      }
      console.log('🔧 Technologies:', technologies);
    }

    // Extract difficulty
    let difficulty = 'medium';
    const diffMatch = content.match(/Difficulty:\s*([^\n]+)/i);
    if (diffMatch) {
      difficulty = validateDifficultyLevel(diffMatch[1].trim());
    }
    console.log('⚡ Difficulty:', difficulty);

    // CRITICAL: Parse tasks from the FULL content
    console.log('📋 About to parse tasks...');
    const tasks = parseTasksFromContent(content);
    console.log('📋 Tasks returned from parser:', tasks.length);

    const project = {
      title,
      description: description || 'AI-generated project idea',
      detailed_description: content.trim(),
      difficulty_level: difficulty,
      required_experience_level: validateExperienceLevel(difficulty),
      maximum_members: 1,
      programming_languages: technologies,
      topics: ['Web Development'],
      estimated_duration: 'medium',
      tasks: tasks
    };

    console.log('═══════════════════════════════════════════════');
    console.log('✅ PROJECT OBJECT CREATED');
    console.log('═══════════════════════════════════════════════');
    console.log('📦 Project title:', project.title);
    console.log('📦 Project.tasks:', project.tasks?.length || 0);
    
    if (project.tasks && project.tasks.length > 0) {
      console.log('📋 Project task titles:', project.tasks.map(t => t.title));
    } else {
      console.error('⚠️ PROJECT HAS NO TASKS AFTER EXTRACTION!');
    }
    console.log('═══════════════════════════════════════════════');
    
    projects.push(project);
    return projects;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await aiChatService.sendMessage(
        userMessage.content,
        conversationHistory,
        token
      );

      if (response.success) {
        // 🔥 IMPROVED: More flexible project suggestion detection
        const isValidProjectSuggestion = (message) => {
          const content = message.trim();
          
          // Check 1: Has bold title (most project suggestions start with this)
          const hasBoldTitle = /\*\*[^*]+\*\*/.test(content);
          
          // Check 2: Has weekly task breakdown pattern (Week 1:, Week 2:, etc.)
          const hasWeeklyTasks = /Week\s+\d+[\s:;-]/i.test(content);
          
          // Check 3: Count project-related keywords
          const projectKeywords = [
            'Key Features:',
            'Technologies:',
            'Difficulty:',
            'Time Estimate:',
            'Weekly Task Breakdown:',
            'Project Setup',
            'Implementation',
            'Testing'
          ];
          
          const keywordCount = projectKeywords.filter(keyword => 
            content.includes(keyword)
          ).length;
          
          // Check 4: Has technology/language mention
          const hasTechMention = /Technologies?:\s*[^\n]+/i.test(content);
          
          // Check 5: Has difficulty level
          const hasDifficulty = /Difficulty:\s*(Easy|Medium|Hard|Beginner|Intermediate|Advanced)/i.test(content);
          
          // Check 6: Length check - project suggestions are typically longer
          const isLongEnough = content.length > 300;
          
          // Check 7: Has multiple bullet points (features list)
          const bulletCount = (content.match(/^[•\-\*]\s/gm) || []).length;
          const hasMultipleBullets = bulletCount >= 3;
          
          // NEW: Check 8: Has "project idea" phrase (catches conversational intros)
          const hasProjectIdeaPhrase = /(?:project idea|detailed project|here'?s? (?:a|an|the) (?:detailed )?project)/i.test(content);
          
          // NEW: Check 9: Has project-suggestive phrases
          const projectPhrases = [
            'building a',
            'create a',
            'develop a',
            'project for you',
            'suggest',
            'how about',
            'budget tracker',
            'todo app',
            'weather app'
          ];
          const hasProjectPhrase = projectPhrases.some(phrase => 
            content.toLowerCase().includes(phrase)
          );
          
          // Flexible criteria: 
          // Must have weekly tasks OR (bold title + at least 2 keywords + long enough)
          // OR has conversational project intro with sufficient structure
          const meetsFlexibleCriteria = (
            hasWeeklyTasks || 
            (hasBoldTitle && keywordCount >= 2 && isLongEnough) ||
            (hasBoldTitle && hasTechMention && hasDifficulty && hasMultipleBullets) ||
            (hasProjectIdeaPhrase && hasBoldTitle && isLongEnough) ||  // "Here's a project idea for you: **Title**"
            (hasProjectPhrase && hasBoldTitle && keywordCount >= 2)     // "How about building a **Title**" with keywords
          );
          
          console.log('🔍 Project Detection Debug:', {
            hasBoldTitle,
            hasWeeklyTasks,
            keywordCount,
            hasTechMention,
            hasDifficulty,
            isLongEnough,
            bulletCount,
            hasMultipleBullets,
            hasProjectIdeaPhrase,
            hasProjectPhrase,
            meetsFlexibleCriteria
          });
          
          return meetsFlexibleCriteria;
        };

        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.data.message,
          timestamp: response.data.timestamp,
          isProjectSuggestion: isValidProjectSuggestion(response.data.message)
        };
        
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { text: "Help me plan a web application", icon: <Code size={16} /> },
    { text: "Generate a JavaScript project idea", icon: <Lightbulb size={16} /> },
    { text: "Best practices for React development", icon: <Coffee size={16} /> },
    { text: "How to structure a full-stack project", icon: <Rocket size={16} /> }
  ];

  const handleShowPreview = (projectData) => {
    console.log('═══════════════════════════════════════════════');
    console.log('🎯 HANDLE SHOW PREVIEW - START');
    console.log('═══════════════════════════════════════════════');
    console.log('📥 Input projectData:', projectData);
    console.log('📥 Input projectData.tasks:', projectData.tasks?.length || 0);
    
    if (projectData.tasks && projectData.tasks.length > 0) {
      console.log('📋 Input task titles:', projectData.tasks.map(t => t.title));
    } else {
      console.error('⚠️ INPUT TO PREVIEW HAS NO TASKS!');
    }
    
    const cleanedProjectData = validateAndCleanProjectData(projectData);
    
    console.log('═══════════════════════════════════════════════');
    console.log('🎯 HANDLE SHOW PREVIEW - DISPATCHING EVENT');
    console.log('═══════════════════════════════════════════════');
    console.log('📤 Dispatching cleaned data:', cleanedProjectData);
    console.log('📤 Dispatching with tasks:', cleanedProjectData.tasks?.length || 0);
    
    if (cleanedProjectData.tasks && cleanedProjectData.tasks.length > 0) {
      console.log('📋 Dispatching task titles:', cleanedProjectData.tasks.map(t => t.title));
    } else {
      console.error('⚠️ DISPATCHING WITH NO TASKS!');
    }
    console.log('═══════════════════════════════════════════════');
    
    window.dispatchEvent(new CustomEvent('aiProjectPreview', { 
      detail: { project: cleanedProjectData } 
    }));
  };

  const MessageComponent = ({ message, isClickableProject, creatingProject, onShowPreview, extractProjectDataFromText }) => {
    const [isHovered, setIsHovered] = useState(false);
    const isBeingCreated = creatingProject && message.content.includes(creatingProject);

    return (
      <div
        style={{
          maxWidth: '85%',
          fontSize: '14px',
          lineHeight: '1.7',
          position: 'relative',
          ...(message.role === 'user' ? {
            alignSelf: 'flex-end',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white',
            padding: '14px 18px',
            borderRadius: '16px 16px 4px 16px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          } : {
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(26, 28, 32, 0.8)',
            color: '#e2e8f0',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 20px',
            borderRadius: '16px 16px 16px 4px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            ...(isClickableProject ? {
              cursor: 'pointer',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              ...(isHovered ? {
                borderColor: 'rgba(59, 130, 246, 0.4)',
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 16px rgba(59, 130, 246, 0.2)'
              } : {})
            } : {})
          })
        }}
        onMouseEnter={() => isClickableProject && setIsHovered(true)}
        onMouseLeave={() => isClickableProject && setIsHovered(false)}
      >
        {message.role === 'assistant' && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '10px', 
            fontSize: '11px', 
            color: '#64748b',
            fontWeight: '500'
          }}>
            <Bot size={14} />
            <span>Sync</span>
            <span>•</span>
            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
        )}

        {isBeingCreated && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)', zIndex: 10
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white',
              padding: '10px 18px', borderRadius: '10px', fontSize: '13px',
              fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <div style={{
                width: '18px', height: '18px', border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite'
              }}></div>
              Creating project with tasks...
            </div>
          </div>
        )}
        
        {isClickableProject && isHovered && !creatingProject && (
          <button
            style={{
              position: 'absolute', top: '10px', right: '10px',
              padding: '6px 14px', background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white', border: 'none', borderRadius: '10px',
              fontSize: '11px', cursor: 'pointer', fontWeight: '600',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all 0.2s ease'
            }}
            onClick={(e) => {
              e.stopPropagation();
              const projects = extractProjectDataFromText(message.content);
              if (projects.length > 0) {
                onShowPreview(projects[0]);
              }
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
            }}
          >
            <Sparkles size={12} />
            Preview Project
          </button>
        )}
        
        <div>
          {message.content.split('\n').map((line, index) => {
            if (line.startsWith('**') && line.endsWith('**')) {
              return <div key={index} style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '15px', color: '#60a5fa' }}>
                {line.replace(/\*\*/g, '')}
              </div>;
            }
            if (line.startsWith('• ')) {
              return <div key={index} style={{ marginLeft: '16px', marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '12px' }}>•</span>
                <span style={{ color: '#cbd5e1' }}>{line.substring(2)}</span>
              </div>;
            }
            if (line.match(/^Week\s+\d+/i)) {
              return <div key={index} style={{ fontWeight: '600', marginTop: '10px', marginBottom: '6px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <CheckCircle size={14} />
                {line}
              </div>;
            }
            if (line.startsWith('- ')) {
              return <div key={index} style={{ marginLeft: '28px', marginBottom: '4px', color: '#94a3b8', fontSize: '12px' }}>
                {line}
              </div>;
            }
            if (line === '---') {
              return <hr key={index} style={{ margin: '16px 0', border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }} />;
            }
            return <div key={index} style={line ? { marginBottom: '6px' } : { marginBottom: '10px' }}>
              {line || <br />}
            </div>;
          })}
        </div>
        
        {isClickableProject && !creatingProject && (
          <div style={{
            marginTop: '12px', padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(147, 51, 234, 0.04))',
            borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.15)',
            fontSize: '12px', color: '#64748b', fontWeight: '500',
            textAlign: 'center', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '6px'
          }}>
            <Sparkles size={14} />
            Hover to preview this project before creating
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(7, 11, 20, 0.8) 100%)',
      borderRadius: '20px',
      border: '1px solid rgba(59, 130, 246, 0.15)',
      height: '650px',
      backdropFilter: 'blur(20px)',
      color: 'white',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3), inset 0 0 40px rgba(59, 130, 246, 0.03)',
      overflow: 'hidden',
      animation: 'borderGlow 4s ease-in-out infinite'
    }}>
      {/* Grid Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
        borderRadius: '20px',
        zIndex: 0
      }} />

      {/* Animated Scan Line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: 'linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)',
        animation: 'scanLine 3s ease-in-out infinite',
        boxShadow: '0 0 20px #3b82f6, 0 0 40px #3b82f6',
        zIndex: 1
      }} />

      {/* Floating Particles */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          width: '4px',
          height: '4px',
          backgroundColor: '#3b82f6',
          borderRadius: '50%',
          top: '20%',
          left: '10%',
          animation: 'float 6s ease-in-out infinite',
          boxShadow: '0 0 10px #3b82f6'
        }} />
        <div style={{
          position: 'absolute',
          width: '3px',
          height: '3px',
          backgroundColor: '#8b5cf6',
          borderRadius: '50%',
          top: '40%',
          right: '15%',
          animation: 'float 8s ease-in-out infinite',
          animationDelay: '2s',
          boxShadow: '0 0 8px #8b5cf6'
        }} />
        <div style={{
          position: 'absolute',
          width: '5px',
          height: '5px',
          backgroundColor: '#10b981',
          borderRadius: '50%',
          bottom: '30%',
          left: '20%',
          animation: 'float 7s ease-in-out infinite',
          animationDelay: '1s',
          boxShadow: '0 0 12px #10b981'
        }} />
        <div style={{
          position: 'absolute',
          width: '3px',
          height: '3px',
          backgroundColor: '#3b82f6',
          borderRadius: '50%',
          bottom: '20%',
          right: '25%',
          animation: 'float 9s ease-in-out infinite',
          animationDelay: '3s',
          boxShadow: '0 0 8px #3b82f6'
        }} />
      </div>
      
      {/* Corner Accents */}
      <svg style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '80px',
        height: '80px',
        pointerEvents: 'none',
        zIndex: 1
      }} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="2">
          <animate attributeName="stroke" values="rgba(59, 130, 246, 0.3);rgba(59, 130, 246, 0.8);rgba(59, 130, 246, 0.3)" dur="3s" repeatCount="indefinite"/>
        </path>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.8">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
      <svg style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '80px',
        height: '80px',
        transform: 'scaleX(-1)',
        pointerEvents: 'none',
        zIndex: 1
      }} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="2">
          <animate attributeName="stroke" values="rgba(59, 130, 246, 0.3);rgba(59, 130, 246, 0.8);rgba(59, 130, 246, 0.3)" dur="3s" repeatCount="indefinite"/>
        </path>
        <circle cx="0" cy="0" r="4" fill="#3b82f6" opacity="0.8">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
      <svg style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '80px',
        height: '80px',
        transform: 'scaleY(-1)',
        pointerEvents: 'none',
        zIndex: 1
      }} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(139, 92, 246, 0.5)" strokeWidth="2">
          <animate attributeName="stroke" values="rgba(139, 92, 246, 0.3);rgba(139, 92, 246, 0.8);rgba(139, 92, 246, 0.3)" dur="3s" repeatCount="indefinite"/>
        </path>
        <circle cx="0" cy="0" r="4" fill="#8b5cf6" opacity="0.8">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
      <svg style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '80px',
        height: '80px',
        transform: 'scale(-1)',
        pointerEvents: 'none',
        zIndex: 1
      }} viewBox="0 0 100 100">
        <path d="M0 40 L0 0 L40 0" fill="none" stroke="rgba(139, 92, 246, 0.5)" strokeWidth="2">
          <animate attributeName="stroke" values="rgba(139, 92, 246, 0.3);rgba(139, 92, 246, 0.8);rgba(139, 92, 246, 0.3)" dur="3s" repeatCount="indefinite"/>
        </path>
        <circle cx="0" cy="0" r="4" fill="#8b5cf6" opacity="0.8">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
      
      {/* Header with Hexagon Badge */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        padding: '20px 24px',
        borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(7, 11, 20, 0.6))',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Animated Hexagon Badge */}
            <div style={{
              position: 'relative',
              width: '50px',
              height: '58px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%',
                filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.5))',
                animation: 'hexPulse 3s ease-in-out infinite'
              }} viewBox="0 0 50 58">
                <defs>
                  <linearGradient id="hexGradChat" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8"/>
                  </linearGradient>
                </defs>
                <polygon 
                  points="25,2 47,14 47,44 25,56 3,44 3,14" 
                  fill="rgba(15, 23, 42, 0.9)"
                  stroke="url(#hexGradChat)"
                  strokeWidth="2"
                />
              </svg>
              <MessageCircle size={22} color="#3b82f6" style={{ position: 'relative', zIndex: 2 }} />
            </div>
            
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '800',
                background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                Sync AI Assistant
              </h3>
              <div style={{ 
                fontSize: '11px', 
                color: '#64748b', 
                fontWeight: '600', 
                marginTop: '4px',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>Neural Code Generation Engine</div>
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))',
            borderRadius: '20px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.2), inset 0 0 10px rgba(16, 185, 129, 0.1)'
          }}>
            <div style={{
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: 'radial-gradient(circle, #10b981 0%, #059669 100%)',
              animation: 'pulse 2s infinite',
              boxShadow: '0 0 12px #10b981, 0 0 24px #10b981'
            }}></div>
            <span style={{ 
              fontSize: '11px', 
              color: '#10b981', 
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              textShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
            }}>ONLINE</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        position: 'absolute',
        top: '82px',
        bottom: '90px',
        left: 0,
        right: 0,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        zIndex: 2
      }} className="messages-scrollbar">
        {messages.length === 1 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#cbd5e1',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              <Lightbulb size={16} color="#3b82f6" />
              Quick Start Ideas
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  style={{
                    position: 'relative',
                    padding: '14px 18px',
                    background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.12), rgba(30, 41, 59, 0.08))',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.3s ease',
                    fontWeight: '600',
                    overflow: 'hidden'
                  }}
                  onClick={() => setInputMessage(action.text)}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.15))';
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.4)';
                    e.target.style.transform = 'translateY(-3px) scale(1.02)';
                    e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.25), 0 0 40px rgba(59, 130, 246, 0.1)';
                    e.target.style.color = '#60a5fa';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(51, 65, 85, 0.12), rgba(30, 41, 59, 0.08))';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = 'none';
                    e.target.style.color = '#cbd5e1';
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.3s ease'
                  }}>
                    {action.icon}
                  </div>
                  <span style={{ flex: 1 }}>{action.text}</span>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    boxShadow: '0 0 8px #3b82f6'
                  }} className="action-indicator" />
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((message) => {
          const isClickableProject = message.role === 'assistant' && message.isProjectSuggestion;
          
          return (
            <MessageComponent
              key={message.id}
              message={message}
              isClickableProject={isClickableProject}
              creatingProject={creatingProject}
              onShowPreview={handleShowPreview}
              extractProjectDataFromText={extractProjectDataFromText}
            />
          );
        })}
        
        {isLoading && (
          <div style={{
            alignSelf: 'flex-start',
            maxWidth: '85%',
            padding: '16px 20px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            color: '#64748b',
            border: '1px solid rgba(59, 130, 246, 0.15)',
            borderRadius: '16px 16px 16px 4px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              width: '20px', height: '20px', 
              border: '2px solid rgba(59, 130, 246, 0.3)',
              borderTop: '2px solid #3b82f6', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite'
            }}></div>
            Sync is thinking...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '20px 24px',
        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(7, 11, 20, 0.98) 100%)',
        backdropFilter: 'blur(12px)',
        zIndex: 2
      }}>
        <form onSubmit={handleSendMessage} style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'center'
        }}>
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything about coding projects..."
            style={{
              flex: 1,
              padding: '14px 18px',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              borderRadius: '14px',
              fontSize: '14px',
              resize: 'none',
              height: '52px',
              fontFamily: 'inherit',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              color: 'white',
              backdropFilter: 'blur(8px)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            disabled={isLoading}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(59, 130, 246, 0.1)';
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(59, 130, 246, 0.15)';
              e.target.style.boxShadow = 'inset 0 1px 3px rgba(0, 0, 0, 0.1)';
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            style={{
              width: '52px',
              height: '52px',
              background: isLoading || !inputMessage.trim() 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: isLoading || !inputMessage.trim() ? '#475569' : 'white',
              border: isLoading || !inputMessage.trim() 
                ? '1px solid rgba(255, 255, 255, 0.08)' 
                : 'none',
              borderRadius: '14px',
              cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isLoading || !inputMessage.trim() 
                ? 'none' 
                : '0 8px 30px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)',
              flexShrink: 0,
              boxSizing: 'border-box',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!isLoading && inputMessage.trim()) {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && inputMessage.trim()) {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 8px 30px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)';
              }
            }}
          >
            {!isLoading && inputMessage.trim() && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                animation: 'shimmer 3s ease-in-out infinite'
              }} />
            )}
            {isLoading ? (
              <div style={{
                width: '20px', height: '20px', 
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid white', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite'
              }}></div>
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.6; 
            transform: scale(1.2);
          }
        }
        
        @keyframes scanLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-40px) translateX(-5px);
            opacity: 0.5;
          }
          75% {
            transform: translateY(-20px) translateX(-15px);
            opacity: 0.9;
          }
        }
        
        @keyframes hexPulse {
          0%, 100% { 
            filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.4));
          }
          50% { 
            filter: drop-shadow(0 0 24px rgba(59, 130, 246, 0.8));
          }
        }
        
        @keyframes borderGlow {
          0%, 100% { 
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3), 
                        inset 0 0 40px rgba(59, 130, 246, 0.03),
                        0 0 60px rgba(59, 130, 246, 0.1);
          }
          50% { 
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3), 
                        inset 0 0 60px rgba(59, 130, 246, 0.06),
                        0 0 80px rgba(59, 130, 246, 0.2);
          }
        }
        
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes ripple {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        button:active::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0);
          animation: ripple 0.6s ease-out;
        }
        
        button:hover .action-indicator {
          opacity: 1 !important;
          animation: pulse 1.5s infinite;
        }
        
        .messages-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        
        .messages-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.4);
          border-radius: 5px;
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
        
        .messages-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.6));
          border-radius: 5px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
        }
        
        .messages-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
        }
        
        .messages-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.8) rgba(15, 23, 42, 0.4);
        }
      `}</style>
    </div>
  );
};

export default AIChatInterface;