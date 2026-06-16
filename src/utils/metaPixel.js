const fbq = (...args) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
};

export const trackLead = () => fbq('track', 'Lead');
export const trackSchedule = () => fbq('track', 'Schedule');
export const trackContact = () => fbq('track', 'Contact');
