import { Link, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Search, FileText, Shield, Store, HelpCircle, Lock, Star, Phone, Users, Handshake, LinkIcon, Gem, Building2, Globe, Briefcase, Image, BookOpen, Trophy, Award, Heart, Target, Zap, Sparkles, Bell, Clock, CheckCircle, AlertTriangle, Info, Settings, Menu, Plus, X, TrendingUp } from 'lucide-react';

const pages = {
  'terms': {
    title: 'Terms of Service',
    icon: <FileText size={32} />,
    subtitle: 'Last updated: July 2024',
    sections: [
      { heading: '1. Acceptance of Terms', content: 'By accessing or using Erq Marketplace ("Erq"), you agree to be bound by these Terms of Service. If you do not agree to all the terms, you may not access or use our services.' },
      { heading: '2. Description of Service', content: 'Erq is an online freelance marketplace connecting clients with freelancers. We provide a platform for users to post jobs, create gigs, communicate, and process payments through our integrated TeleBirr escrow system.' },
      { heading: '3. User Accounts', content: 'You must create an account to use our services. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate, current, and complete information.' },
      { heading: '4. User Conduct', content: 'Users agree to: (a) not misuse the platform; (b) comply with all applicable laws; (c) not engage in fraudulent activities; (d) respect intellectual property rights; (e) communicate professionally with other users.' },
      { heading: '5. Payments & Escrow', content: 'All payments are processed through our TeleBirr escrow system. Funds are held securely until work is approved by the client. Erq charges a service fee on completed transactions.' },
      { heading: '6. Dispute Resolution', content: 'In case of disputes, users may request admin review. The platform administrator will investigate and make a final decision regarding fund release or refund. Both parties agree to abide by the admin\'s decision.' },
      { heading: '7. Intellectual Property', content: 'Upon full payment, clients receive the rights to the delivered work. Freelancers retain the right to display work in their portfolio unless otherwise agreed.' },
      { heading: '8. Limitation of Liability', content: 'Erq is not liable for any direct, indirect, incidental, or consequential damages arising from the use of our platform. Our total liability is limited to the fees paid for the specific transaction in question.' },
      { heading: '9. Termination', content: 'We reserve the right to suspend or terminate accounts that violate these terms. Users may delete their accounts at any time through their profile settings.' },
      { heading: '10. Changes to Terms', content: 'We may modify these terms at any time. Users will be notified of material changes via email or platform notification. Continued use after changes constitutes acceptance.' },
      { heading: '11. Governing Law', content: 'These terms are governed by the laws of the Federal Democratic Republic of Ethiopia. Any disputes shall be resolved in the courts of Addis Ababa, Ethiopia.' },
      { heading: '12. Contact', content: 'For questions about these terms, please contact our support team through the Help Center or email legal@gebeya.com.' },
    ]
  },
  'privacy': {
    title: 'Privacy Policy',
    icon: <Shield size={32} />,
    subtitle: 'Last updated: July 2024',
    sections: [
      { heading: 'Information We Collect', content: 'We collect information you provide directly: name, email, phone number, city, profile picture, skills, and payment information. We also automatically collect usage data, IP addresses, and device information when you use our platform.' },
      { heading: 'How We Use Your Information', content: 'We use your information to: provide and improve our services; process transactions; send notifications; verify your identity; communicate with you; personalize your experience; and ensure platform safety and security.' },
      { heading: 'Information Sharing', content: 'We share your information with: other users as necessary for transactions (name, skills, rating); payment processors for TeleBirr integration; and when required by law. We never sell your personal information to third parties.' },
      { heading: 'Data Security', content: 'We implement industry-standard security measures including encryption, secure servers, and regular security audits. Your password is hashed and never stored in plain text.' },
      { heading: 'Your Rights', content: 'You have the right to: access your personal data; correct inaccurate data; delete your account and associated data; export your data; and object to certain data processing. Contact us to exercise these rights.' },
      { heading: 'Cookies', content: 'We use essential cookies for authentication and platform functionality. We also use analytics cookies to improve our service. You can control cookie settings through your browser preferences.' },
      { heading: 'Data Retention', content: 'We retain your information as long as your account is active. After account deletion, we retain certain data as required by law or for legitimate business purposes.' },
      { heading: 'Children\'s Privacy', content: 'Our services are not intended for users under 18 years of age. We do not knowingly collect information from minors.' },
      { heading: 'International Transfers', content: 'Your data may be transferred to and processed in servers located in Ethiopia and other countries where our service providers operate.' },
      { heading: 'Updates to Policy', content: 'We may update this policy periodically. We will notify users of material changes via email or platform notification.' },
      { heading: 'Contact Us', content: 'For privacy-related inquiries, contact our Data Protection Officer at privacy@gebeya.com.' },
    ]
  },
  'about': {
    title: 'About Erq',
    icon: <Store size={32} />,
    subtitle: 'Empowering Ethiopian Talent',
    sections: [
      { heading: 'Our Mission', content: 'Erq is Ethiopia\'s premier freelance marketplace, dedicated to connecting talented Ethiopian professionals with opportunities. We believe in the power of local talent and the potential of Ethiopia\'s digital economy.' },
      { heading: 'Our Story', content: 'Founded with a vision to transform Ethiopia\'s freelance economy, Erq has grown from a simple idea into a thriving marketplace. We\'ve helped thousands of freelancers find work and hundreds of businesses find the talent they need.' },
      { heading: 'What We Do', content: 'We provide a secure platform where clients can post jobs and freelancers can offer their services across categories including Translation, Graphic Design, Video Editing, Web Development, Virtual Assistance, and Social Media Management.' },
      { heading: 'Our Values', content: 'Trust, transparency, and quality are at the heart of everything we do. Our TeleBirr escrow system ensures secure payments, and our review system helps maintain high-quality standards.' },
      { heading: 'Our Impact', content: 'With 500+ registered freelancers, 1,000+ completed jobs, and over ETB 2 million paid out, we\'re proud to be driving Ethiopia\'s digital economy forward.' },
      { heading: 'Our Team', content: 'Erq is built by a dedicated team of Ethiopian developers, designers, and business professionals committed to creating opportunities for their fellow Ethiopians.' },
    ]
  },
  'help': {
    title: 'Help Center',
    icon: <HelpCircle size={32} />,
    subtitle: 'How can we help you?',
    sections: [
      { heading: 'Getting Started', content: 'New to Erq? Creating an account is free and easy. Choose whether you want to hire (Client) or find work (Freelancer), set up your profile, and you\'re ready to go!' },
      { heading: 'For Clients: Posting a Job', content: 'Click "Post a Job" from your dashboard. Describe your project, set a budget range, choose a category, and set a deadline. Freelancers will submit bids, and you can choose the best one.' },
      { heading: 'For Freelancers: Creating a Gig', content: 'Click "Create a Gig" from your dashboard. Describe your service, set your price, choose a category, and add portfolio images to showcase your work.' },
      { heading: 'Payments & Escrow', content: 'When you award a job, the funds are placed in escrow. The freelancer completes the work, you approve it, and the funds are released. This protects both parties.' },
      { heading: 'Messaging', content: 'Use the messaging feature to communicate directly with clients or freelancers. All messages are stored securely and can be referenced if disputes arise.' },
      { heading: 'Disputes', content: 'If something goes wrong, you can raise a dispute from the job page. Our admin team will review the case and make a fair decision.' },
      { heading: 'Account Settings', content: 'Manage your profile, update your information, change your password, and adjust your notification preferences from the Profile page.' },
      { heading: 'Safety Tips', content: 'Always communicate through the Erq platform. Never share your password. Verify the identity of the other party. Report suspicious activity immediately.' },
      { heading: 'Contact Support', content: 'Can\'t find what you\'re looking for? Email us at support@gebeya.com or use the Contact Sales form. We typically respond within 24 hours.' },
    ]
  },
  'trust-safety': {
    title: 'Trust & Safety',
    icon: <Shield size={32} />,
    subtitle: 'Your safety is our priority',
    sections: [
      { heading: 'Secure Platform', content: 'Erq uses industry-standard encryption to protect your data. All communications and transactions are secured.' },
      { heading: 'Verified Freelancers', content: 'Our admin team reviews and verifies freelancer accounts. Look for the "Verified" badge on freelancer profiles to ensure authenticity.' },
      { heading: 'TeleBirr Escrow', content: 'All payments are held in escrow through TeleBirr integration. Funds are only released when both parties are satisfied with the work.' },
      { heading: 'Identity Verification', content: 'We encourage all users to complete their profiles with accurate information. Admin may request additional verification for certain accounts.' },
      { heading: 'Dispute Resolution', content: 'Our dedicated admin team handles disputes fairly and promptly. We review all evidence before making a decision to release or refund funds.' },
      { heading: 'Report Concerns', content: 'If you encounter suspicious behavior, harassment, or policy violations, report it immediately. All reports are investigated promptly.' },
      { heading: 'Community Guidelines', content: 'Treat others with respect. Communicate professionally. Deliver quality work. Pay promptly. Together we build a trusted community.' },
    ]
  },
  'careers': {
    title: 'Careers at Erq',
    icon: <Briefcase size={32} />,
    subtitle: 'Join our growing team',
    sections: [
      { heading: 'Why Erq?', content: 'Join a passionate team building Ethiopia\'s leading freelance marketplace. We offer competitive compensation, flexible working arrangements, and the opportunity to make a real impact on Ethiopia\'s digital economy.' },
      { heading: 'Current Openings', content: 'We\'re always looking for talented individuals. Current openings include: Full-Stack Developer, UI/UX Designer, Marketing Specialist, Customer Support Representative, and Business Development Manager.' },
      { heading: 'Our Culture', content: 'We believe in innovation, collaboration, and continuous learning. Our diverse team brings together different perspectives to solve meaningful challenges.' },
      { heading: 'Benefits', content: 'Competitive salary, flexible remote work options, professional development budget, health insurance, and the opportunity to work with cutting-edge technology.' },
      { heading: 'How to Apply', content: 'Send your resume and cover letter to careers@gebeya.com. We review applications on a rolling basis and look forward to hearing from you!' },
    ]
  },
  'press': {
    title: 'Press & News',
    icon: <FileText size={32} />,
    subtitle: 'Latest updates and media coverage',
    sections: [
      { heading: 'In the News', content: 'Erq is making headlines! We\'ve been featured in Ethiopian business publications and tech blogs for our innovative approach to the freelance economy.' },
      { heading: 'Press Releases', content: 'Stay up to date with our latest announcements, partnerships, and platform updates. Follow us on social media for real-time updates.' },
      { heading: 'Media Kit', content: 'Download our media kit including logos, screenshots, and brand guidelines. For press inquiries, contact press@gebeya.com.' },
      { heading: 'Recent Milestones', content: '500+ freelancers registered. 1,000+ jobs completed. ETB 2M+ paid out to freelancers. Launch of TeleBirr escrow integration.' },
    ]
  },
  'investors': {
    title: 'Investor Relations',
    icon: <TrendingUp size={32} />,
    subtitle: 'Growth and investment opportunities',
    sections: [
      { heading: 'Our Vision', content: 'Erq aims to become the leading freelance marketplace in Africa, starting with Ethiopia. We\'re building the infrastructure for the continent\'s digital workforce.' },
      { heading: 'Growth Metrics', content: 'With consistent month-over-month growth in users, transactions, and revenue, Erq is positioned for scalable expansion across East Africa.' },
      { heading: 'Market Opportunity', content: 'Ethiopia has a young, tech-savvy population and a rapidly growing digital economy. The freelance market represents a significant opportunity for growth.' },
      { heading: 'Contact', content: 'For investment inquiries, please contact investors@gebeya.com.' },
    ]
  },
  'how-it-works': {
    title: 'How Erq Works',
    icon: <BookOpen size={32} />,
    subtitle: 'Your guide to the platform',
    sections: [
      { heading: 'Step 1: Create Your Account', content: 'Sign up as either a Client or Freelancer. Fill in your details and set up your profile. It\'s free and takes less than 2 minutes.' },
      { heading: 'Step 2: Post or Browse', content: 'Clients: Post a job describing your project. Freelancers: Browse available gigs or create your own service listing.' },
      { heading: 'Step 3: Connect & Collaborate', content: 'Use our messaging system to discuss requirements, negotiate terms, and ask questions. Communication is key to successful projects.' },
      { heading: 'Step 4: Secure Payment', content: 'When you agree on terms, funds are placed in TeleBirr escrow. This ensures both parties are protected throughout the project.' },
      { heading: 'Step 5: Deliver & Approve', content: 'Freelancers deliver the work. Clients review and approve. Once approved, funds are released to the freelancer.' },
      { heading: 'Step 6: Rate & Review', content: 'After completion, both parties can rate each other. Reviews help build trust and reputation within the community.' },
    ]
  },
  'quality-guide': {
    title: 'Quality Guide',
    icon: <Star size={32} />,
    subtitle: 'Standards for excellence',
    sections: [
      { heading: 'Quality Standards', content: 'All work delivered on Erq should meet professional standards. Clear communication, timely delivery, and attention to detail are expected.' },
      { heading: 'For Freelancers', content: 'Deliver work that matches or exceeds the agreed scope. Communicate progress regularly. Be responsive to client feedback. Respect deadlines.' },
      { heading: 'For Clients', content: 'Provide clear, detailed briefs. Give constructive feedback. Pay promptly upon satisfactory completion. Respect freelancers\' time and expertise.' },
      { heading: 'Ratings & Reviews', content: 'Honest reviews help the community. Rate based on actual experience with communication, quality, and timeliness.' },
    ]
  },
  'contact': {
    title: 'Contact Sales',
    icon: <Phone size={32} />,
    subtitle: 'Get in touch with our team',
    sections: [
      { heading: 'Sales Inquiries', content: 'Interested in enterprise solutions or partnership opportunities? Our sales team is ready to help. Email sales@gebeya.com or call +251-11-123-4567.' },
      { heading: 'Support', content: 'For general support, visit our Help Center or email support@gebeya.com. We aim to respond within 24 hours.' },
      { heading: 'Office Location', content: 'Erq Headquarters, Bole Road, Addis Ababa, Ethiopia. Office hours: Monday to Friday, 9:00 AM - 5:00 PM EAT.' },
      { heading: 'Partnerships', content: 'Interested in partnering with Erq? Email partnerships@gebeya.com with details about your organization and proposed collaboration.' },
    ]
  },
  'community': {
    title: 'Community Hub',
    icon: <Users size={32} />,
    subtitle: 'Connect with fellow members',
    sections: [
      { heading: 'Welcome to the Community', content: 'The Erq community is a vibrant space where freelancers and clients connect, share knowledge, and grow together.' },
      { heading: 'Forums', content: 'Join discussions about freelancing tips, project management, industry trends, and more. Share your expertise and learn from others.' },
      { heading: 'Events', content: 'Participate in webinars, workshops, and networking events organized by the Erq team. Stay tuned for upcoming events.' },
      { heading: 'Success Stories', content: 'Read inspiring stories from our community members who have found success on Erq. Share your own story to inspire others.' },
    ]
  },
  'partnerships': {
    title: 'Partnerships',
    icon: <Handshake size={32} />,
    subtitle: 'Grow with Erq',
    sections: [
      { heading: 'Partner With Us', content: 'We\'re looking for partners who share our vision of empowering Ethiopian talent. Collaborate with us to create more opportunities.' },
      { heading: 'Types of Partnerships', content: 'Training partnerships, corporate hiring programs, technology integrations, community sponsorships, and affiliate programs.' },
      { heading: 'Benefits', content: 'Access to our talent pool, co-branded opportunities, priority support, and joint marketing initiatives.' },
      { heading: 'Get Started', content: 'Email partnerships@gebeya.com to start the conversation. We\'ll set up a call to explore how we can work together.' },
    ]
  },
  'affiliates': {
    title: 'Affiliate Program',
    icon: <LinkIcon size={32} />,
    subtitle: 'Earn by referring',
    sections: [
      { heading: 'How It Works', content: 'Refer clients or freelancers to Erq and earn a commission on their transactions. It\'s a simple way to earn passive income while helping others.' },
      { heading: 'Commission Structure', content: 'Earn 5% of transaction fees from users you refer for the first 6 months. The more you refer, the more you earn.' },
      { heading: 'Join the Program', content: 'Sign up for the affiliate program through your dashboard. You\'ll receive a unique referral link to share with your network.' },
      { heading: 'Track Your Earnings', content: 'Monitor your referrals and earnings in real-time through your affiliate dashboard. Payouts are processed monthly via TeleBirr.' },
    ]
  },
  'pro': {
    title: 'Erq Pro',
    icon: <Gem size={32} />,
    subtitle: 'Premium freelancer program',
    sections: [
      { heading: 'What is Erq Pro?', content: 'Erq Pro is our premium program for top-rated freelancers. Pro members get priority visibility, dedicated support, and exclusive opportunities.' },
      { heading: 'Requirements', content: 'Maintain a 4.5+ star rating, complete 10+ jobs, have 100% response rate, and pass our quality review process.' },
      { heading: 'Benefits', content: 'Pro badge on your profile, priority in search results, dedicated account manager, early access to new features, and premium support.' },
      { heading: 'Apply Now', content: 'Eligible freelancers are automatically invited. Check your dashboard for the Pro application status.' },
    ]
  },
  'enterprise': {
    title: 'Enterprise Solutions',
    icon: <Building2 size={32} />,
    subtitle: 'For businesses of all sizes',
    sections: [
      { heading: 'Enterprise Hiring', content: 'Scale your workforce with vetted Ethiopian talent. Our enterprise solutions include dedicated account management, custom workflows, and volume pricing.' },
      { heading: 'Project Management', content: 'End-to-end project management services for businesses. We handle sourcing, vetting, onboarding, and quality assurance.' },
      { heading: 'Expert Sourcing', content: 'Need specialized talent? Our expert sourcing service finds the perfect match for your requirements, from individual freelancers to full teams.' },
      { heading: 'Get Started', content: 'Contact our enterprise sales team at enterprise@gebeya.com for a personalized consultation.' },
    ]
  },
  'social-impact': {
    title: 'Social Impact',
    icon: <Globe size={32} />,
    subtitle: 'Making a difference',
    sections: [
      { heading: 'Our Commitment', content: 'Erq is committed to creating positive social impact in Ethiopia. We believe in the power of digital work to transform lives and communities.' },
      { heading: 'Youth Employment', content: 'We provide opportunities for young Ethiopians to earn income, build skills, and gain professional experience through freelancing.' },
      { heading: 'Women in Tech', content: 'We actively support women freelancers through mentorship programs, flexible work arrangements, and community building initiatives.' },
      { heading: 'Rural Reach', content: 'Through partnerships with internet providers and community centers, we\'re working to bring freelance opportunities to rural areas.' },
      { heading: 'Skills Development', content: 'We offer free resources, webinars, and training programs to help freelancers develop their skills and advance their careers.' },
    ]
  }
};

export default function StaticPage() {
  const { page } = useParams();

  
  const pageContent = pages[page];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  if (!pageContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Search size={48} className="mx-auto mb-4 text-gray-300" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-gebeya-600 to-gebeya-400 rounded-xl flex items-center justify-center shadow-lg shadow-gebeya-200/30">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Erq</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="btn-ghost text-sm">Home</Link>
            <Link to="/marketplace" className="btn-ghost text-sm">Marketplace</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="gradient-hero relative py-16">
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <div className="flex justify-center mb-4 text-white/80">{pageContent.icon}</div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-3 depth-text">{pageContent.title}</h1>
          <p className="text-white/70 text-lg">{pageContent.subtitle}</p>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-white"></div>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {pageContent.sections.map((section, i) => (
            <div key={i} className="card-3d p-6 lg:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-gebeya-100 rounded-lg flex items-center justify-center text-gebeya-600 font-bold text-sm">{i + 1}</span>
                {section.heading}
              </h2>
              <p className="text-gray-600 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/" className="btn-primary">← Back to Home</Link>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-gray-400">
          <p>© 2024 Erq Marketplace</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link to="/help" className="hover:text-gray-600 transition-colors">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
