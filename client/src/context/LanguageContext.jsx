import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.marketplace': 'Marketplace',
    'nav.my.gigs': 'My Gigs',
    'nav.my.jobs': 'My Jobs',
    'nav.messages': 'Messages',
    'nav.profile': 'Profile',
    'nav.admin': 'Admin Dashboard',
    'nav.logout': 'Logout',
    'nav.login': 'Login',
    'nav.signup': 'Sign Up',
    'nav.browse.gigs': 'Browse Gigs',
    'nav.post.job': 'Post a Job',
    'nav.my.bids': 'My Bids',
    
    // Common
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort by',
    'common.category': 'Category',
    'common.price': 'Price',
    'common.budget': 'Budget',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.submit': 'Submit',
    'common.loading': 'Loading...',
    'common.no.results': 'No results found',
    'common.back': 'Back',
    'common.view': 'View',
    'common.send': 'Send',
    'common.type.message': 'Type your message...',
    
    // Auth
    'auth.welcome': 'Welcome to Erq',
    'auth.subtitle': 'Ethiopia\'s premier freelance marketplace',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullname': 'Full Name',
    'auth.phone': 'Phone Number',
    'auth.city': 'City',
    'auth.role': 'I want to',
    'auth.client': 'Hire freelancers (Client)',
    'auth.freelancer': 'Find work (Freelancer)',
    'auth.login': 'Login to your account',
    'auth.signup': 'Create your account',
    'auth.no.account': 'Don\'t have an account?',
    'auth.have.account': 'Already have an account?',
    'auth.login.btn': 'Login',
    'auth.signup.btn': 'Sign Up',
    
    // Marketplace
    'marketplace.title': 'Marketplace',
    'marketplace.subtitle': 'Find the perfect freelancer for your project',
    'marketplace.all.categories': 'All Categories',
    'marketplace.price.range': 'Price Range',
    'marketplace.sort.price.low': 'Price: Low to High',
    'marketplace.sort.price.high': 'Price: High to Low',
    'marketplace.sort.rating': 'Highest Rated',
    'marketplace.sort.newest': 'Newest',
    'marketplace.from': 'From',
    'marketplace.delivery': 'Delivery',
    'marketplace.days': 'days',
    'marketplace.per.project': 'per project',
    
    // Gig
    'gig.create': 'Create New Gig',
    'gig.title': 'Gig Title',
    'gig.description': 'Description',
    'gig.price': 'Price (ETB)',
    'gig.category': 'Category',
    'gig.delivery': 'Delivery Time (days)',
    'gig.images': 'Portfolio Images',
    'gig.my': 'My Gigs',
    'gig.no': 'No gigs yet',
    'gig.start': 'Create your first gig',
    
    // Job
    'job.create': 'Post a New Job',
    'job.title': 'Job Title',
    'job.description': 'Description',
    'job.budget.min': 'Minimum Budget (ETB)',
    'job.budget.max': 'Maximum Budget (ETB)',
    'job.category': 'Category',
    'job.deadline': 'Deadline',
    'job.my': 'My Jobs',
    'job.no': 'No jobs yet',
    'job.post': 'Post your first job',
    'job.bids': 'Bids',
    'job.award': 'Award',
    'job.deliver': 'Mark as Delivered',
    'job.complete': 'Approve & Complete',
    'job.open': 'Open',
    'job.in_progress': 'In Progress',
    'job.completed': 'Completed',
    'job.cancelled': 'Cancelled',
    
    // Profile
    'profile.title': 'Profile Settings',
    'profile.bio': 'Bio',
    'profile.skills': 'Skills',
    'profile.rating': 'Rating',
    'profile.reviews': 'Reviews',
    'profile.verified': 'Verified',
    'profile.not.verified': 'Not Verified',
    
    // Admin
    'admin.dashboard': 'Admin Dashboard',
    'admin.users': 'Users',
    'admin.gigs': 'Gigs',
    'admin.jobs': 'Jobs',
    'admin.transactions': 'Transactions',
    'admin.disputes': 'Disputes',
    'admin.stats': 'Statistics',
    'admin.total.users': 'Total Users',
    'admin.total.freelancers': 'Freelancers',
    'admin.total.clients': 'Clients',
    'admin.total.gigs': 'Total Gigs',
    'admin.total.jobs': 'Total Jobs',
    'admin.total.revenue': 'Total Revenue',
    'admin.escrow': 'In Escrow',
    'admin.disputes.count': 'Active Disputes',
    'admin.verify': 'Verify',
    'admin.unverify': 'Unverify',
    'admin.release': 'Release Payment',
    'admin.refund': 'Refund Payment',
    'admin.resolve': 'Resolve Dispute',
    
    // Messages
    'messages.title': 'Messages',
    'messages.no.conversations': 'No conversations yet',
    'messages.start': 'Start a conversation by sending a message to a freelancer or client',
    'messages.unread': 'unread',
    'messages.online': 'Online',
    'messages.offline': 'Offline',
    
    // Payments
    'payment.escrow': 'Payment in Escrow',
    'payment.release': 'Release Payment',
    'payment.dispute': 'Raise Dispute',
    'payment.initiate': 'Initiate Payment',
    'payment.confirm': 'Confirm Payment',
    'payment.reference': 'TeleBirr Reference',
    'payment.amount': 'Amount (ETB)',
    
    // Reviews
    'review.rate': 'Rate this user',
    'review.comment': 'Leave a comment',
    'review.submit': 'Submit Review',
    'review.stars': 'stars',
  },
  am: {
    // Navigation
    'nav.home': 'መነሻ',
    'nav.marketplace': 'ገበያ',
    'nav.my.gigs': 'የእኔ ጊጎች',
    'nav.my.jobs': 'የእኔ ስራዎች',
    'nav.messages': 'መልዕክቶች',
    'nav.profile': 'መገለጫ',
    'nav.admin': 'የአስተዳዳሪ ዳሽቦርድ',
    'nav.logout': 'ውጣ',
    'nav.login': 'ግባ',
    'nav.signup': 'ይመዝገቡ',
    'nav.browse.gigs': 'ጊጎችን ያስሱ',
    'nav.post.job': 'ስራ ይለጥፉ',
    'nav.my.bids': 'የእኔ ጨረታዎች',
    
    // Common
    'common.search': 'ፈልግ',
    'common.filter': 'አጣራ',
    'common.sort': 'ደርድር በ',
    'common.category': 'ምድብ',
    'common.price': 'ዋጋ',
    'common.budget': 'በጀት',
    'common.status': 'ሁኔታ',
    'common.actions': 'እርምጃዎች',
    'common.save': 'አስቀምጥ',
    'common.cancel': 'ሰርዝ',
    'common.delete': 'አጥፋ',
    'common.edit': 'አስተካክል',
    'common.create': 'ፍጠር',
    'common.submit': 'አስገባ',
    'common.loading': 'በመጫን ላይ...',
    'common.no.results': 'ምንም ውጤት አልተገኘም',
    'common.back': 'ተመለስ',
    'common.view': 'እይ',
    'common.send': 'ላክ',
    'common.type.message': 'መልዕክትዎን ይፃፉ...',
    
    // Auth
    'auth.welcome': 'እንኳን ወደ ገበያ በደህና መጡ',
    'auth.subtitle': 'የኢትዮጵያ ቀዳሚ የፍሪላንስ ገበያ ቦታ',
    'auth.email': 'ኢሜይል',
    'auth.password': 'የይለፍ ቃል',
    'auth.fullname': 'ሙሉ ስም',
    'auth.phone': 'ስልክ ቁጥር',
    'auth.city': 'ከተማ',
    'auth.role': 'እፈልጋለሁ',
    'auth.client': 'ፍሪላንሰሮችን ቀጥር (ደንበኛ)',
    'auth.freelancer': 'ስራ ፈልግ (ፍሪላንሰር)',
    'auth.login': 'ወደ መለያዎ ይግቡ',
    'auth.signup': 'መለያ ይፍጠሩ',
    'auth.no.account': 'መለያ የለዎትም?',
    'auth.have.account': 'አስቀድመው መለያ አለዎት?',
    'auth.login.btn': 'ግባ',
    'auth.signup.btn': 'ተመዝገብ',
    
    // Marketplace
    'marketplace.title': 'ገበያ',
    'marketplace.subtitle': 'ለፕሮጀክትዎ ፍጹም የሆነ ፍሪላንሰር ያግኙ',
    'marketplace.all.categories': 'ሁሉም ምድቦች',
    'marketplace.price.range': 'የዋጋ ገደብ',
    'marketplace.sort.price.low': 'ዋጋ፡ ከዝቅተኛ ወደ ከፍተኛ',
    'marketplace.sort.price.high': 'ዋጋ፡ ከከፍተኛ ወደ ዝቅተኛ',
    'marketplace.sort.rating': 'ከፍተኛ ደረጃ ያላቸው',
    'marketplace.sort.newest': 'አዲስ',
    'marketplace.from': 'ከ',
    'marketplace.delivery': 'አቅርቦት',
    'marketplace.days': 'ቀናት',
    'marketplace.per.project': 'በፕሮጀክት',
    
    // Gig
    'gig.create': 'አዲስ ጊግ ፍጠር',
    'gig.title': 'የጊግ ርዕስ',
    'gig.description': 'መግለጫ',
    'gig.price': 'ዋጋ (ETB)',
    'gig.category': 'ምድብ',
    'gig.delivery': 'የአቅርቦት ጊዜ (ቀናት)',
    'gig.images': 'የፖርትፎሊዮ ምስሎች',
    'gig.my': 'የእኔ ጊጎች',
    'gig.no': 'እስካሁን ምንም ጊጎች የሉም',
    'gig.start': 'የመጀመሪያ ጊግዎን ይፍጠሩ',
    
    // Job
    'job.create': 'አዲስ ስራ ለጥፍ',
    'job.title': 'የስራ ርዕስ',
    'job.description': 'መግለጫ',
    'job.budget.min': 'ዝቅተኛ በጀት (ETB)',
    'job.budget.max': 'ከፍተኛ በጀት (ETB)',
    'job.category': 'ምድብ',
    'job.deadline': 'የመጨረሻ ቀን',
    'job.my': 'የእኔ ስራዎች',
    'job.no': 'እስካሁን ምንም ስራዎች የሉም',
    'job.post': 'የመጀመሪያ ስራዎን ይለጥፉ',
    'job.bids': 'ጨረታዎች',
    'job.award': 'ሽልማት',
    'job.deliver': 'ተልኳል ምልክት አድርግ',
    'job.complete': 'ተቀበል እና አጠናቅቅ',
    'job.open': 'ክፍት',
    'job.in_progress': 'በሂደት ላይ',
    'job.completed': 'ተጠናቋል',
    'job.cancelled': 'ተሰርዟል',
    
    // Profile
    'profile.title': 'የመገለጫ ቅንብሮች',
    'profile.bio': 'የህይወት ታሪክ',
    'profile.skills': 'ክህሎቶች',
    'profile.rating': 'ደረጃ',
    'profile.reviews': 'ግምገማዎች',
    'profile.verified': 'የተረጋገጠ',
    'profile.not.verified': 'አልተረጋገጠም',
    
    // Admin
    'admin.dashboard': 'የአስተዳዳሪ ዳሽቦርድ',
    'admin.users': 'ተጠቃሚዎች',
    'admin.gigs': 'ጊጎች',
    'admin.jobs': 'ስራዎች',
    'admin.transactions': 'ግብይቶች',
    'admin.disputes': 'ክርክሮች',
    'admin.stats': 'ስታቲስቲክስ',
    'admin.total.users': 'ጠቅላላ ተጠቃሚዎች',
    'admin.total.freelancers': 'ፍሪላንሰሮች',
    'admin.total.clients': 'ደንበኞች',
    'admin.total.gigs': 'ጠቅላላ ጊጎች',
    'admin.total.jobs': 'ጠቅላላ ስራዎች',
    'admin.total.revenue': 'ጠቅላላ ገቢ',
    'admin.escrow': 'በእስክሮው ውስጥ',
    'admin.disputes.count': 'ንቁ ክርክሮች',
    'admin.verify': 'አረጋግጥ',
    'admin.unverify': 'አታረጋግጥ',
    'admin.release': 'ክፍያ ልቀቅ',
    'admin.refund': 'ክፍያ መልስ',
    'admin.resolve': 'ክርክር ፍታ',
    
    // Messages
    'messages.title': 'መልዕክቶች',
    'messages.no.conversations': 'እስካሁን ምንም ውይይቶች የሉም',
    'messages.start': 'ለፍሪላንሰር ወይም ለደንበኛ መልዕክት በመላክ ውይይት ይጀምሩ',
    'messages.unread': 'ያልተነበቡ',
    'messages.online': 'በመስመር ላይ',
    'messages.offline': 'ከመስመር ውጭ',
    
    // Payments
    'payment.escrow': 'ክፍያ በእስክሮው ውስጥ',
    'payment.release': 'ክፍያ ልቀቅ',
    'payment.dispute': 'ክርክር አንሳ',
    'payment.initiate': 'ክፍያ ጀምር',
    'payment.confirm': 'ክፍያ አረጋግጥ',
    'payment.reference': 'የቴሌ ብር ማጣቀሻ',
    'payment.amount': 'መጠን (ETB)',
    
    // Reviews
    'review.rate': 'ይህን ተጠቃሚ ደረጃ ይስጡ',
    'review.comment': 'አስተያየት ይስጡ',
    'review.submit': 'ግምገማ አስገባ',
    'review.stars': 'ኮከቦች',
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('gebeya_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('gebeya_lang', language);
    document.documentElement.lang = language === 'am' ? 'am' : 'en';
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'am' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
export { translations };
