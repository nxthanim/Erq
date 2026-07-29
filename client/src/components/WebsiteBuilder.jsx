import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  Layout, Type, Image, Palette, Eye, Download, Code, Plus, X, GripVertical,
  ChevronRight, Sparkles, Globe, Smartphone, Monitor, RefreshCw, Send,
  Loader, CheckCircle, AlertCircle, Trash2, Edit3, Save, Copy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

// Pre-built section templates
const SECTION_TEMPLATES = {
  hero: {
    type: 'hero',
    label: 'Hero',
    icon: '🏠',
    defaultContent: {
      title: 'Welcome to Our Website',
      subtitle: 'We create amazing digital experiences that help your business grow.',
      cta: 'Get Started',
      ctaLink: '#',
      bgColor: '#1a1a2e',
      textColor: '#ffffff',
      accentColor: '#e94560',
      image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'
    }
  },
  features: {
    type: 'features',
    label: 'Features',
    icon: '⭐',
    defaultContent: {
      title: 'Our Features',
      subtitle: 'Everything you need to succeed',
      items: [
        { icon: '🚀', title: 'Fast Performance', desc: 'Lightning-fast load times for your users' },
        { icon: '🔒', title: 'Secure', desc: 'Enterprise-grade security for your data' },
        { icon: '📱', title: 'Responsive', desc: 'Looks great on all devices' },
        { icon: '🎨', title: 'Beautiful Design', desc: 'Modern, clean, and professional' }
      ],
      bgColor: '#ffffff',
      textColor: '#1f2937',
      accentColor: '#3b82f6'
    }
  },
  about: {
    type: 'about',
    label: 'About',
    icon: 'ℹ️',
    defaultContent: {
      title: 'About Us',
      subtitle: 'We are a passionate team dedicated to delivering excellence.',
      body: 'We believe in creating meaningful digital experiences that make a difference. Our team combines creativity with technical expertise to deliver outstanding results for our clients. With years of experience in the industry, we have helped hundreds of businesses achieve their goals.',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
      stats: [
        { number: '500+', label: 'Projects Done' },
        { number: '100+', label: 'Happy Clients' },
        { number: '50+', label: 'Team Members' },
        { number: '5+', label: 'Years Experience' }
      ],
      bgColor: '#f8fafc',
      textColor: '#1f2937',
      accentColor: '#3b82f6'
    }
  },
  contact: {
    type: 'contact',
    label: 'Contact',
    icon: '📧',
    defaultContent: {
      title: 'Get In Touch',
      subtitle: 'Have a question? We would love to hear from you.',
      email: 'hello@example.com',
      phone: '+1 234 567 890',
      address: '123 Main Street, City, Country',
      bgColor: '#ffffff',
      textColor: '#1f2937',
      accentColor: '#3b82f6'
    }
  },
  footer: {
    type: 'footer',
    label: 'Footer',
    icon: '🔽',
    defaultContent: {
      text: '© 2026 All Rights Reserved.',
      links: ['Privacy Policy', 'Terms of Service', 'Contact'],
      bgColor: '#1a1a2e',
      textColor: '#ffffff',
      accentColor: '#e94560'
    }
  },
  stats: {
    type: 'stats',
    label: 'Stats',
    icon: '📊',
    defaultContent: {
      title: 'Our Impact',
      items: [
        { number: '10K+', label: 'Users' },
        { number: '99.9%', label: 'Uptime' },
        { number: '4.9', label: 'Rating' },
        { number: '150+', label: 'Countries' }
      ],
      bgColor: '#1e293b',
      textColor: '#ffffff',
      accentColor: '#f59e0b'
    }
  },
  testimonials: {
    type: 'testimonials',
    label: 'Testimonials',
    icon: '💬',
    defaultContent: {
      title: 'What People Say',
      subtitle: 'Hear from our satisfied customers',
      items: [
        { name: 'John Doe', role: 'CEO, Tech Corp', quote: 'Amazing service! Highly recommended.', avatar: '👨‍💼' },
        { name: 'Jane Smith', role: 'Designer, Creative Inc', quote: 'The best decision we ever made for our business.', avatar: '👩‍🎨' }
      ],
      bgColor: '#f8fafc',
      textColor: '#1f2937',
      accentColor: '#8b5cf6'
    }
  },
  pricing: {
    type: 'pricing',
    label: 'Pricing',
    icon: '💰',
    defaultContent: {
      title: 'Pricing Plans',
      subtitle: 'Choose the perfect plan for you',
      items: [
        { name: 'Basic', price: '$9', period: '/month', features: ['Feature 1', 'Feature 2', 'Feature 3'], highlighted: false },
        { name: 'Pro', price: '$29', period: '/month', features: ['All Basic features', 'Feature 4', 'Feature 5', 'Feature 6'], highlighted: true },
        { name: 'Enterprise', price: '$99', period: '/month', features: ['All Pro features', 'Feature 7', 'Feature 8', 'Custom support'], highlighted: false }
      ],
      bgColor: '#ffffff',
      textColor: '#1f2937',
      accentColor: '#3b82f6'
    }
  },
  team: {
    type: 'team',
    label: 'Team',
    icon: '👥',
    defaultContent: {
      title: 'Our Team',
      subtitle: 'Meet the talented people behind our success',
      items: [
        { name: 'Alice Johnson', role: 'CEO & Founder', avatar: '👩‍💼', bio: 'Visionary leader with 15+ years experience' },
        { name: 'Bob Williams', role: 'CTO', avatar: '👨‍💻', bio: 'Tech genius who loves solving complex problems' },
        { name: 'Carol Davis', role: 'Design Lead', avatar: '👩‍🎨', bio: 'Creative mind with an eye for perfection' }
      ],
      bgColor: '#f8fafc',
      textColor: '#1f2937',
      accentColor: '#10b981'
    }
  },
  cta: {
    type: 'cta',
    label: 'Call to Action',
    icon: '🎯',
    defaultContent: {
      title: 'Ready to Get Started?',
      subtitle: 'Join thousands of satisfied customers today.',
      buttonText: 'Get Started Now',
      buttonLink: '#',
      bgColor: '#3b82f6',
      textColor: '#ffffff',
      accentColor: '#ffffff'
    }
  }
};

// Render a section to HTML (for preview and export)
function renderSectionToHTML(section) {
  const c = section.content;
  const isDark = ['#1a1a2e', '#1e293b', '#1a1a2e'].includes(c.bgColor?.toLowerCase());
  
  switch (section.type) {
    case 'hero':
      return `
        <section style="background: ${c.bgColor}; color: ${c.textColor}; padding: 100px 20px; text-align: center; position: relative; overflow: hidden; min-height: 80vh; display: flex; align-items: center; justify-content: center;">
          ${c.image ? `<div style="position: absolute; inset: 0; opacity: 0.15; background: url('${c.image}') center/cover;"></div>` : ''}
          <div style="position: relative; z-index: 1; max-width: 800px; animation: fadeInUp 1s ease-out;">
            <h1 style="font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; margin: 0 0 20px; line-height: 1.2; letter-spacing: -0.02em;">${c.title}</h1>
            <p style="font-size: clamp(1rem, 2vw, 1.25rem); line-height: 1.7; opacity: 0.9; margin: 0 0 35px; max-width: 600px; margin-left: auto; margin-right: auto;">${c.subtitle}</p>
            ${c.cta ? `<a href="${c.ctaLink || '#'}" style="display: inline-block; padding: 16px 40px; background: ${c.accentColor}; color: ${c.textColor}; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1.1rem; transition: transform 0.3s, box-shadow 0.3s; box-shadow: 0 4px 20px ${c.accentColor}40;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 30px ${c.accentColor}60'" onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px ${c.accentColor}40'">${c.cta}</a>` : ''}
          </div>
        </section>`;
    
    case 'features':
      return `
        <section style="background: ${c.bgColor}; color: ${c.textColor}; padding: 80px 20px;">
          <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 700; margin: 0 0 10px;">${c.title}</h2>
            <p style="font-size: 1.1rem; opacity: 0.7; margin: 0 0 50px; max-width: 600px; margin-left: auto; margin-right: auto;">${c.subtitle}</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">
              ${(c.items || []).map(item => `
                <div style="background: ${isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc'}; border-radius: 16px; padding: 35px 25px; text-align: center; transition: transform 0.3s, box-shadow 0.3s;" onmouseover="this.style.transform='translateY(-5px)';this.style.boxShadow='0 10px 40px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                  <div style="font-size: 2.5rem; margin-bottom: 15px;">${item.icon || '⭐'}</div>
                  <h3 style="font-size: 1.2rem; font-weight: 600; margin: 0 0 10px;">${item.title}</h3>
                  <p style="font-size: 0.9rem; opacity: 0.7; line-height: 1.6; margin: 0;">${item.desc}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </section>`;
    
    case 'about':
      return `
        <section style="background: ${c.bgColor}; color: ${c.textColor}; padding: 80px 20px;">
          <div style="max-width: 1200px; margin: 0 auto;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center;">
              <div>
                <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 700; margin: 0 0 15px;">${c.title}</h2>
                <p style="font-size: 1.05rem; opacity: 0.8; margin: 0 0 10px;">${c.subtitle}</p>
                <p style="font-size: 0.95rem; opacity: 0.65; line-height: 1.8; margin: 0;">${c.body}</p>
              </div>
              ${c.image ? `<div style="border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15);"><img src="${c.image}" alt="About" style="width: 100%; height: 400px; object-fit: cover; display: block;"></div>` : ''}
            </div>
            ${c.stats ? `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 30px; margin-top: 60px; padding-top: 40px; border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}; text-align: center;">
                ${c.stats.map(stat => `
                  <div>
                    <div style="font-size: 2rem; font-weight: 800; color: ${c.accentColor};">${stat.number}</div>
                    <div style="font-size: 0.85rem; opacity: 0.6; margin-top: 5px;">${stat.label}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </section>`;
    
    case 'contact':
      return `
        <section style="background: ${c.bgColor}; color: ${c.textColor}; padding: 80px 20px;">
          <div style="max-width: 800px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 700; margin: 0 0 10px;">${c.title}</h2>
            <p style="font-size: 1.1rem; opacity: 0.7; margin: 0 0 50px;">${c.subtitle}</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 30px;">
              ${c.email ? `<div style="padding: 25px; border-radius: 16px; background: ${isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc'};">
                <div style="font-size: 2rem; margin-bottom: 10px;">📧</div>
                <h4 style="font-size: 0.9rem; font-weight: 600; margin: 0 0 5px;">Email</h4>
                <p style="font-size: 0.85rem; opacity: 0.7; margin: 0;">${c.email}</p>
              </div>` : ''}
              ${c.phone ? `<div style="padding: 25px; border-radius: 16px; background: ${isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc'};">
                <div style="font-size: 2rem; margin-bottom: 10px;">📞</div>
                <h4 style="font-size: 0.9rem; font-weight: 600; margin: 0 0 5px;">Phone</h4>
                <p style="font-size: 0.85rem; opacity: 0.7; margin: 0;">${c.phone}</p>
              </div>` : ''}
              ${c.address ? `<div style="padding: 25px; border-radius: 16px; background: ${isDark ? 'rgba(255,255,255,0.08)' : '#f8fafc'};">
                <div style="font-size: 2rem; margin-bottom: 10px;">📍</div>
                <h4 style="font-size: 0.9rem; font-weight: 600; margin: 0 0 5px;">Address</h4>
                <p style="font-size: 0.85rem; opacity: 0.7; margin: 0;">${c.address}</p>
              </div>` : ''}
            </div>
            <form style="margin-top: 40px; max-width: 500px; margin-left: auto; margin-right: auto;" onsubmit="event.preventDefault();alert('Message sent!');">
              <div style="display: grid; gap: 15px;">
                <input placeholder="Your Name" style="width: 100%; padding: 14px 18px; border: 2px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}; border-radius: 12px; font-size: 1rem; outline: none; box-sizing: border-box; background: ${isDark ? 'rgba(255,255,255,0.05)' : '#fff'}; color: ${c.textColor};">
                <input placeholder="Your Email" type="email" style="width: 100%; padding: 14px 18px; border: 2px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}; border-radius: 12px; font-size: 1rem; outline: none; box-sizing: border-box; background: ${isDark ? 'rgba(255,255,255,0.05)' : '#fff'}; color: ${c.textColor};">
                <textarea placeholder="Your Message" rows="4" style="width: 100%; padding: 14px 18px; border: 2px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}; border-radius: 12px; font-size: 1rem; outline: none; resize: vertical; box-sizing: border-box; background: ${isDark ? 'rgba(255,255,255,0.05)' : '#fff'}; color: ${c.textColor};"></textarea>
                <button type="submit" style="padding: 16px 40px; background: ${c.accentColor}; color: white; border: none; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: transform 0.3s, box-shadow 0.3s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">Send Message</button>
              </div>
            </form>
          </div>
        </section>`;
    
    case 'footer':
      return `
        <footer style="background: ${c.bgColor}; color: ${c.textColor}; padding: 40px 20px; text-align: center;">
          <div style="max-width: 1200px; margin: 0 auto;">
            <p style="margin: 0 0 20px; opacity: 0.8;">${c.text}</p>
            ${c.links ? `<div style="display: flex; justify-content: center; gap: 25px; flex-wrap: wrap;">
              ${c.links.map(link => `<a href="#" style="color: ${c.accentColor}; text-decoration: none; font-size: 0.9rem; opacity: 0.8; transition: opacity 0.3s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">${link}</a>`).join('')}
            </div>` : ''}
          </div>
        </footer>`;
    
    case 'stats':
      return `
        <section style="background: ${c.bgColor}; color: ${c.textColor}; padding: 80px 20px; text-align: center;">
          <div style="max-width: 1200px; margin: 0 auto;">
            ${c.title ? `<h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 700; margin: 0 0 50px;">${c.title}</h2>` : ''}
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 30px;">
              ${(c.items || []).map(item => `
                <div>
                  <div style="font-size: 2.5rem; font-weight: 800; color: ${c.accentColor};">${item.number}</div>
                  <div style="font-size: 1rem; opacity: 0.7; margin-top: 5px;">${item.label}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>`;
    
    case 'testimonials':
      return `
        <section style="background: ${c.bgColor}; color: ${c.textColor}; padding: 80px 20px;">
          <div style="max-width: 1000px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 700; margin: 0 0 10px;">${c.title}</h2>
            <p style="font-size: 1.1rem; opacity: 0.7; margin: 0 0 50px;">${c.subtitle}</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
              ${(c.items || []).map(item => `
                <div style="background: ${isDark ? 'rgba(255,255,255,0.06)' : '#fff'}; border-radius: 16px; padding: 30px; text-align: left; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                  <div style="font-size: 1rem; line-height: 1.7; opacity: 0.8; margin-bottom: 20px; font-style: italic;">"${item.quote}"</div>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 2rem;">${item.avatar || '👤'}</span>
                    <div>
                      <div style="font-weight: 600; font-size: 0.95rem;">${item.name}</div>
                      <div style="font-size: 0.8rem; opacity: 0.6;">${item.role}</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </section>`;
    
    case 'pricing':
      return `
        <section style="background: ${c.bgColor}; color: ${c.textColor}; padding: 80px 20px;">
          <div style="max-width: 1100px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 700; margin: 0 0 10px;">${c.title}</h2>
            <p style="font-size: 1.1rem; opacity: 0.7; margin: 0 0 50px;">${c.subtitle}</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px;">
              ${(c.items || []).map(item => `
                <div style="background: ${item.highlighted ? c.accentColor : (isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc')}; border-radius: 20px; padding: 40px 30px; ${item.highlighted ? `color: white; transform: scale(1.05); box-shadow: 0 20px 60px ${c.accentColor}30;` : ''} position: relative;">
                  ${item.highlighted ? '<div style="position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 50px; font-size: 0.75rem; font-weight: 600;">Popular</div>' : ''}
                  <h3 style="font-size: 1.2rem; margin: 0 0 5px;">${item.name}</h3>
                  <div style="margin: 20px 0;">
                    <span style="font-size: 2.5rem; font-weight: 800;">${item.price}</span>
                    <span style="font-size: 0.9rem; opacity: 0.7;">${item.period}</span>
                  </div>
                  <ul style="list-style: none; padding: 0; margin: 0; text-align: left;">
                    ${(item.features || []).map(f => `<li style="padding: 8px 0; border-bottom: 1px solid ${item.highlighted ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)'}; font-size: 0.9rem;">✅ ${f}</li>`).join('')}
                  </ul>
                  <button style="margin-top: 25px; width: 100%; padding: 14px; background: ${item.highlighted ? 'white' : c.accentColor}; color: ${item.highlighted ? c.textColor : 'white'}; border: none; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer;">Choose Plan</button>
                </div>
              `).join('')}
            </div>
          </div>
        </section>`;
    
    case 'team':
      return `
        <section style="background: ${c.bgColor}; color: ${c.textColor}; padding: 80px 20px;">
          <div style="max-width: 1100px; margin: 0 auto; text-align: center;">
            <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 700; margin: 0 0 10px;">${c.title}</h2>
            <p style="font-size: 1.1rem; opacity: 0.7; margin: 0 0 50px;">${c.subtitle}</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">
              ${(c.items || []).map(item => `
                <div style="background: ${isDark ? 'rgba(255,255,255,0.06)' : '#fff'}; border-radius: 16px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); transition: transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform=''">
                  <span style="font-size: 3rem; display: block; margin-bottom: 15px;">${item.avatar || '👤'}</span>
                  <h3 style="font-size: 1.1rem; font-weight: 600; margin: 0 0 5px;">${item.name}</h3>
                  <p style="font-size: 0.85rem; opacity: 0.7; margin: 0 0 10px;">${item.role}</p>
                  <p style="font-size: 0.85rem; opacity: 0.55; line-height: 1.6; margin: 0;">${item.bio}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </section>`;
    
    case 'cta':
      return `
        <section style="background: ${c.bgColor}; color: ${c.textColor}; padding: 80px 20px; text-align: center;">
          <div style="max-width: 700px; margin: 0 auto;">
            <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 700; margin: 0 0 15px;">${c.title}</h2>
            <p style="font-size: 1.1rem; opacity: 0.9; margin: 0 0 35px;">${c.subtitle}</p>
            <a href="${c.buttonLink || '#'}" style="display: inline-block; padding: 16px 45px; background: ${c.accentColor}; color: ${c.bgColor}; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1.1rem; transition: transform 0.3s, box-shadow 0.3s;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 10px 30px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='';this.style.boxShadow=''">${c.buttonText}</a>
          </div>
        </section>`;
    
    default:
      return `<section style="padding: 20px; background: #f0f0f0;"><p>Section: ${section.type}</p></section>`;
  }
}

function generateFullHTML(sections, siteTitle = 'My Website') {
  const sectionsHTML = sections.map(s => renderSectionToHTML(s)).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    img { max-width: 100%; }
    a { transition: all 0.3s ease; }
  </style>
</head>
<body>
${sectionsHTML}
  <script>
    // Smooth scroll for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  </script>
</body>
</html>`;
}

export default function WebsiteBuilder() {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [siteTitle, setSiteTitle] = useState('My Awesome Website');
  const [activeSection, setActiveSection] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [exporting, setExporting] = useState(false);
  const [notification, setNotification] = useState(null);
  const previewRef = useRef(null);

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addSection = (type) => {
    const template = SECTION_TEMPLATES[type];
    if (!template) return;
    const newSection = {
      id: `section-${Date.now()}`,
      type: template.type,
      label: template.label,
      icon: template.icon,
      content: JSON.parse(JSON.stringify(template.defaultContent))
    };
    setSections(prev => [...prev, newSection]);
    setActiveSection(newSection.id);
    showNotify(`Added ${template.label} section!`, 'success');
  };

  const removeSection = (id) => {
    setSections(prev => prev.filter(s => s.id !== id));
    if (activeSection === id) setActiveSection(null);
  };

  const duplicateSection = (id) => {
    const section = sections.find(s => s.id === id);
    if (!section) return;
    const newSection = {
      ...JSON.parse(JSON.stringify(section)),
      id: `section-${Date.now()}`
    };
    const idx = sections.findIndex(s => s.id === id);
    setSections(prev => {
      const updated = [...prev];
      updated.splice(idx + 1, 0, newSection);
      return updated;
    });
    showNotify('Section duplicated!', 'success');
  };

  const reorderSections = useCallback((reorderedSections) => {
    setSections(reorderedSections);
  }, []);

  const startEditing = (section) => {
    setEditingSection(section.id);
    setEditForm(JSON.parse(JSON.stringify(section.content)));
  };

  const saveEdit = () => {
    if (!editingSection) return;
    setSections(prev => prev.map(s => 
      s.id === editingSection ? { ...s, content: editForm } : s
    ));
    setEditingSection(null);
    showNotify('Section updated!', 'success');
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    
    const userMsg = { role: 'user', content: aiPrompt };
    setAiMessages(prev => [...prev, userMsg]);
    setAiLoading(true);
    setAiPrompt('');

    try {
      const res = await api.post('/ai/generate-website', {
        description: aiPrompt,
        pages: sections.map(s => s.type).join(', '),
        style: 'modern, professional, responsive'
      });

      if (res.data.success && res.data.website) {
        const website = res.data.website;
        
        // Add AI-generated sections if they don't exist
        const aiSectionTypes = website.sections || [];
        aiSectionTypes.forEach(type => {
          const exists = sections.some(s => s.type === type);
          if (!exists && SECTION_TEMPLATES[type]) {
            const template = SECTION_TEMPLATES[type];
            const newSection = {
              id: `section-${Date.now()}-${type}`,
              type: template.type,
              label: template.label,
              icon: template.icon,
              content: JSON.parse(JSON.stringify(template.defaultContent))
            };
            setSections(prev => [...prev, newSection]);
          }
        });

        // Update site title
        if (website.title) setSiteTitle(website.title);

        const aiResponse = {
          role: 'assistant',
          content: `✨ **Website generated!** Added sections: ${(website.sections || []).join(', ')}. Preview it below!`
        };
        setAiMessages(prev => [...prev, aiResponse]);
        showNotify('Website generated with AI!', 'success');
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Error: ${errMsg}. Try again or use manual mode.` 
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const exportHTML = () => {
    setExporting(true);
    try {
      const html = generateFullHTML(sections, siteTitle);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${siteTitle.toLowerCase().replace(/\s+/g, '-')}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showNotify('Website exported!', 'success');
    } catch (err) {
      showNotify('Failed to export: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const clearAll = () => {
    if (sections.length === 0) return;
    if (confirm('Clear all sections?')) {
      setSections([]);
      setActiveSection(null);
      showNotify('All sections cleared', 'info');
    }
  };

  // Render live preview HTML
  const getPreviewHTML = () => {
    if (sections.length === 0) return '';
    return generateFullHTML(sections, siteTitle);
  };

  return (
    <div className="flex gap-0 min-h-[700px]" style={{ height: '700px' }}>
      {/* Left Panel - Section Library + AI */}  
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
        {/* Site Title */}
        <div className="p-4 border-b border-gray-100">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Site Title</label>
          <input
            type="text"
            value={siteTitle}
            onChange={e => setSiteTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-gebeya-500/30 focus:border-gebeya-500"
            placeholder="My Website"
          />
        </div>

        {/* Add Sections */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Add Sections</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{sections.length} added</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto">
            {Object.entries(SECTION_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => addSection(key)}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-gray-100 hover:border-gebeya-200 hover:bg-gebeya-50/40 transition-all text-xs"
              >
                <span className="text-base">{template.icon}</span>
                <span className="font-medium text-gray-700 truncate">{template.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Panel Toggle */}
        <button
          onClick={() => setShowAiPanel(!showAiPanel)}
          className={`mx-4 mt-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            showAiPanel 
              ? 'bg-gebeya-600 text-white shadow-sm' 
              : 'bg-gradient-to-r from-gebeya-50 to-purple-50 text-gebeya-700 border border-gebeya-100 hover:border-gebeya-300'
          }`}
        >
          <Sparkles size={16} />
          {showAiPanel ? 'Hide AI Assistant' : 'AI Website Generator'}
        </button>

        {/* AI Chat Panel */}
        <AnimatePresence>
          {showAiPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-gray-100 overflow-hidden"
            >
              <div className="p-4">
                <div className="mb-3 max-h-[200px] overflow-y-auto space-y-2">
                  {aiMessages.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      Describe the website you want and AI will generate sections for you.
                    </p>
                  ) : (
                    aiMessages.map((msg, i) => (
                      <div key={i} className={`p-2.5 rounded-lg text-xs ${
                        msg.role === 'user' 
                          ? 'bg-gebeya-50 text-gebeya-800 ml-4' 
                          : 'bg-gray-50 text-gray-700 mr-4'
                      }`}>
                        {msg.content}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && generateWithAI()}
                    placeholder="e.g., A modern business website..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-gebeya-500/30 focus:border-gebeya-500"
                    disabled={aiLoading}
                  />
                  <button
                    onClick={generateWithAI}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="px-3 py-2 bg-gebeya-600 text-white rounded-lg hover:bg-gebeya-700 transition-all disabled:opacity-50"
                  >
                    {aiLoading ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="p-4 mt-auto border-t border-gray-100">
          <div className="flex gap-2">
            <button
              onClick={exportHTML}
              disabled={sections.length === 0 || exporting}
              className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {exporting ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
              Export HTML
            </button>
            <button
              onClick={() => setShowPreview(true)}
              disabled={sections.length === 0}
              className="px-3 py-2 bg-gebeya-600 text-white rounded-lg text-xs font-medium hover:bg-gebeya-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Eye size={12} />
              Preview
            </button>
            {sections.length > 0 && (
              <button
                onClick={clearAll}
                className="px-3 py-2 bg-red-50 text-red-500 rounded-lg text-xs font-medium hover:bg-red-100 transition-all flex items-center justify-center"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Center - Section List (Drag & Drop) */}
      <div className="flex-1 bg-gray-50 overflow-y-auto p-4">
        {sections.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Layout size={36} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Building Your Website</h3>
              <p className="text-sm text-gray-500 mb-4">
                Add sections from the left panel, then drag to reorder. Use AI to auto-generate content!
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['hero', 'features', 'about', 'contact'].map(key => (
                  <button
                    key={key}
                    onClick={() => addSection(key)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gebeya-300 hover:text-gebeya-600 transition-all shadow-sm"
                  >
                    {SECTION_TEMPLATES[key].icon} Add {SECTION_TEMPLATES[key].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Reorder.Group axis="y" values={sections} onReorder={reorderSections} className="space-y-3">
            <AnimatePresence>
              {sections.map((section) => (
                <Reorder.Item key={section.id} value={section}>
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                    className={`bg-white rounded-xl border shadow-sm transition-all ${
                      activeSection === section.id ? 'border-gebeya-400 ring-2 ring-gebeya-500/20' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Section Header */}
                    <div className="flex items-center gap-2 px-4 py-3 cursor-grab active:cursor-grabbing">
                      <GripVertical size={16} className="text-gray-300 shrink-0" />
                      <span className="text-lg">{section.icon}</span>
                      <span className="text-sm font-semibold text-gray-800">{section.label}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{section.type}</span>
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => startEditing(section)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gebeya-600 hover:bg-gebeya-50 transition-all"
                          title="Edit"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => duplicateSection(section.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gebeya-600 hover:bg-gebeya-50 transition-all"
                          title="Duplicate"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => removeSection(section.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Remove"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Section Content (editable) */}
                    {editingSection === section.id ? (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3" onClick={e => e.stopPropagation()}>
                        <SectionEditor 
                          section={section} 
                          form={editForm} 
                          setForm={setEditForm} 
                        />
                        <div className="flex gap-2 mt-3">
                          <button onClick={saveEdit} className="px-4 py-1.5 bg-gebeya-600 text-white rounded-lg text-xs font-medium hover:bg-gebeya-700 transition-all flex items-center gap-1.5">
                            <Save size={12} /> Save
                          </button>
                          <button onClick={() => setEditingSection(null)} className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-all">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-sm font-medium ${
              notification.type === 'success' ? 'bg-emerald-600 text-white' :
              notification.type === 'error' ? 'bg-red-600 text-white' :
              'bg-gray-800 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle size={16} /> :
             notification.type === 'error' ? <AlertCircle size={16} /> :
             <AlertCircle size={16} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Preview Toolbar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Eye size={18} /> Preview
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        previewMode === 'mobile' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Smartphone size={14} />
                    </button>
                    <button
                      onClick={() => setPreviewMode('tablet')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        previewMode === 'tablet' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Monitor size={14} />
                    </button>
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        previewMode === 'desktop' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Monitor size={14} />
                    </button>
                  </div>
                  <button
                    onClick={exportHTML}
                    disabled={exporting}
                    className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-all flex items-center gap-1.5"
                  >
                    {exporting ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
                    Export
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-auto bg-gray-100 p-6">
                <div className={`mx-auto transition-all ${
                  previewMode === 'mobile' ? 'max-w-[375px]' :
                  previewMode === 'tablet' ? 'max-w-[768px]' :
                  'max-w-full'
                }`}>
                  {sections.length > 0 ? (
                    <div className="bg-white rounded-xl overflow-hidden shadow-lg" style={{ minHeight: '400px' }}>
                      <iframe
                        ref={previewRef}
                        srcDoc={getPreviewHTML()}
                        title="Website Preview"
                        className="w-full"
                        style={{ height: 'calc(85vh - 140px)', border: 'none' }}
                        sandbox="allow-scripts"
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      Add sections to preview your website
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline editor for section content
function SectionEditor({ section, form, setForm }) {
  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateItemField = (itemsField, index, field, value) => {
    setForm(prev => {
      const items = [...(prev[itemsField] || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [itemsField]: items };
    });
  };

  const addItem = (itemsField) => {
    setForm(prev => ({
      ...prev,
      [itemsField]: [...(prev[itemsField] || []), { title: 'New Item', desc: 'Description', icon: '⭐' }]
    }));
  };

  const removeItem = (itemsField, index) => {
    setForm(prev => {
      const items = [...(prev[itemsField] || [])];
      items.splice(index, 1);
      return { ...prev, [itemsField]: items };
    });
  };

  const renderField = (field, label, type = 'text') => {
    const isColor = field.includes('Color') || field === 'bgColor' || field === 'textColor' || field === 'accentColor';
    if (isColor) {
      return (
        <div key={field} className="flex items-center gap-2">
          <label className="text-xs text-gray-500 w-20 shrink-0">{label || field}</label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={form[field] || '#000000'}
              onChange={e => updateField(field, e.target.value)}
              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={form[field] || ''}
              onChange={e => updateField(field, e.target.value)}
              className="w-24 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none"
            />
          </div>
        </div>
      );
    }
    if (type === 'textarea') {
      return (
        <div key={field}>
          <label className="text-xs text-gray-500 mb-1 block">{label || field}</label>
          <textarea
            value={form[field] || ''}
            onChange={e => updateField(field, e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-gebeya-500/30 focus:border-gebeya-500 resize-none"
            rows={3}
          />
        </div>
      );
    }
    return (
      <div key={field}>
        <label className="text-xs text-gray-500 mb-1 block">{label || field}</label>
        <input
          type={type}
          value={form[field] || ''}
          onChange={e => updateField(field, e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-gebeya-500/30 focus:border-gebeya-500"
        />
      </div>
    );
  };

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {/* Common fields */}
      {form.title !== undefined && renderField('title', 'Title')}
      {form.subtitle !== undefined && renderField('subtitle', 'Subtitle')}
      {form.body !== undefined && renderField('body', 'Body', 'textarea')}
      {form.text !== undefined && renderField('text', 'Text')}
      {form.cta !== undefined && renderField('cta', 'Button Text')}
      {form.ctaLink !== undefined && renderField('ctaLink', 'Button Link')}
      {form.buttonText !== undefined && renderField('buttonText', 'Button Text')}
      {form.buttonLink !== undefined && renderField('buttonLink', 'Button Link')}
      {form.email !== undefined && renderField('email', 'Email', 'email')}
      {form.phone !== undefined && renderField('phone', 'Phone')}
      {form.address !== undefined && renderField('address', 'Address')}
      {form.image !== undefined && renderField('image', 'Image URL', 'url')}

      {/* Colors */}
      {form.bgColor !== undefined && (
        <div className="flex flex-wrap gap-2 pt-1">
          {renderField('bgColor', 'Background')}
          {renderField('textColor', 'Text')}
          {renderField('accentColor', 'Accent')}
        </div>
      )}

      {/* Items arrays (features, pricing, team, testimonials, stats items) */}
      {form.items && Array.isArray(form.items) && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-500 font-medium">Items ({form.items.length})</label>
            <button onClick={() => addItem('items')} className="text-xs text-gebeya-600 hover:text-gebeya-700 flex items-center gap-1">
              <Plus size={10} /> Add
            </button>
          </div>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {form.items.map((item, i) => (
              <div key={i} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-400 font-medium">Item {i + 1}</span>
                  <button onClick={() => removeItem('items', i)} className="text-red-400 hover:text-red-500">
                    <X size={10} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {item.title !== undefined && (
                    <input value={item.title} onChange={e => updateItemField('items', i, 'title', e.target.value)}
                      placeholder="Title" className="col-span-2 px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                  )}
                  {item.desc !== undefined && (
                    <input value={item.desc} onChange={e => updateItemField('items', i, 'desc', e.target.value)}
                      placeholder="Description" className="col-span-2 px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                  )}
                  {item.icon !== undefined && (
                    <input value={item.icon} onChange={e => updateItemField('items', i, 'icon', e.target.value)}
                      placeholder="Icon" className="px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                  )}
                  {item.price !== undefined && (
                    <input value={item.price} onChange={e => updateItemField('items', i, 'price', e.target.value)}
                      placeholder="Price" className="px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                  )}
                  {item.name !== undefined && (
                    <input value={item.name} onChange={e => updateItemField('items', i, 'name', e.target.value)}
                      placeholder="Name" className="px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                  )}
                  {item.quote !== undefined && (
                    <input value={item.quote} onChange={e => updateItemField('items', i, 'quote', e.target.value)}
                      placeholder="Quote" className="col-span-2 px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                  )}
                  {item.number !== undefined && (
                    <input value={item.number} onChange={e => updateItemField('items', i, 'number', e.target.value)}
                      placeholder="Number" className="px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                  )}
                  {item.label !== undefined && (
                    <input value={item.label} onChange={e => updateItemField('items', i, 'label', e.target.value)}
                      placeholder="Label" className="px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {form.stats && Array.isArray(form.stats) && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-500 font-medium">Stats ({form.stats.length})</label>
            <button onClick={() => setForm(prev => ({ ...prev, stats: [...(prev.stats || []), { number: '0', label: 'New Stat' }] }))} 
              className="text-xs text-gebeya-600 hover:text-gebeya-700 flex items-center gap-1">
              <Plus size={10} /> Add
            </button>
          </div>
          <div className="space-y-1.5">
            {form.stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input value={stat.number} onChange={e => updateItemField('stats', i, 'number', e.target.value)}
                  placeholder="Number" className="flex-1 px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                <input value={stat.label} onChange={e => updateItemField('stats', i, 'label', e.target.value)}
                  placeholder="Label" className="flex-1 px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                <button onClick={() => {
                  const stats = [...(form.stats || [])];
                  stats.splice(i, 1);
                  setForm(prev => ({ ...prev, stats }));
                }} className="text-red-400 hover:text-red-500"><X size={10} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links (footer) */}
      {form.links && Array.isArray(form.links) && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-500 font-medium">Links</label>
            <button onClick={() => setForm(prev => ({ ...prev, links: [...(prev.links || []), 'New Link'] }))}
              className="text-xs text-gebeya-600 hover:text-gebeya-700 flex items-center gap-1">
              <Plus size={10} /> Add
            </button>
          </div>
          <div className="space-y-1">
            {form.links.map((link, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input value={link} onChange={e => {
                  const links = [...form.links];
                  links[i] = e.target.value;
                  setForm(prev => ({ ...prev, links }));
                }} className="flex-1 px-2 py-1 border border-gray-200 rounded text-[10px] outline-none" />
                <button onClick={() => {
                  const links = [...form.links];
                  links.splice(i, 1);
                  setForm(prev => ({ ...prev, links }));
                }} className="text-red-400 hover:text-red-500"><X size={10} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
