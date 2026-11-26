const icons = {
  dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" />,
  set: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.63-.24-1.2-.64-1.62M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.63.24-1.2.64-1.62M10 12a3 3 0 100-6 3 3 0 000 6zm4 3v1a2 2 0 002 2h4a2 2 0 002-2v-1a3.5 3.5 0 00-3-3.47M10 9h4" />,
  bird: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7h3a5 5 0 014.9 6.16.5.5 0 01-.56.53A1.5 1.5 0 0121 15.4V17a2 2 0 01-2 2h-4m0 0H7a2 2 0 01-2-2v-1.6a1.5 1.5 0 01-1.34-1.71.5.5 0 01-.56-.53A5 5 0 018 7h3m6 10a5 5 0 01-4 2m0 0h-4a5 5 0 01-4-2m10-6a1 1 0 11-2 0 1 1 0 012 0z" />,
  egg: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3c4.97 5 7 8.4 7 12a7 7 0 11-14 0c0-3.6 2.03-7 7-12z" />,
  stock: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 6h18M5 6v14a1 1 0 001 1h12a1 1 0 001-1V6M3 6l1.5-3h15L21 6M9 11h6" />,
  price: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h10M12 3v18M8 12h8a5 6 0 01-16 2" />,
  feed: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 21h14M7 21v-5a12 12 0 0010 0v5M6 6h12l-2-3H8L6 6zm-1 5h14M7 11V8m10 3V8" />,
  usage: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 3h-6a2 2 0 00-2 2v14a2 2 0 002 2h6m4-18l4 4-4 4M14 7h7M4 15h6" />,
  expense: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-2.21 0-4 1.34-4 3s1.79 3 4 3 4-1.34 4-3-1.79-3-4-3zm-4 5.2V16a2 2 0 108-1.65" />,
  customer: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  sale: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.29 4.6A1 1 0 005.7 19H17M16 23a1 1 0 100-2 1 1 0 000 2zm-8 0a1 1 0 100-2 1 1 0 000 2z" />,
  payment: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18V7a2 2 0 00-2-2H5a2 2 0 00-2 2v3zm2 0V8m14 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4m4 1h3" />,
  report: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-6m4 6V7m4 10v-4M4 21h16M5 21V5m14 16V5" />,
  mortality: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3a7 7 0 00-7 7c0 2.6 1.4 4.1 2.3 5.2V17.2A2.3 2.3 0 009.6 19.5h4.8a2.3 2.3 0 002.3-2.3v-2c.9-1.1 2.3-2.6 2.3-5.2a7 7 0 00-7-7zm0 8.5a1.75 1.75 0 110 3.5 1.75 1.75 0 010-3.5zm-1.5-3a1 1 0 100 2 1 1 0 000-2zm3 0a1 1 0 100 2 1 1 0 000-2z" />,
  audit: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3M12 21a9 9 0 100-18 9 9 0 000 18z" />,
  settings: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.32 4.32a1.5 1.5 0 012.12 0 1.5 1.5 0 002.12 0l-1.06-1.06a1.5 1.5 0 010-2.12M6.5 9.5l-2 1.73-1.73 2 2.12 2.12M18 19l1.73-2-2-1.73a1.5 1.5 0 012.12 0l1.06 1.06" />,
  profile: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  logout: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
  chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3v18h18M8 17v-5m4 5V8m4 9v-3" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />,
  edit: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.6-9.4z" />,
  trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.87 12.14A2 2 0 0116.14 21H7.86a2 2 0 01-1.99-1.86L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />,
  search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />,
  download: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />,
  eye: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-3-7C5 5 2 12 2 12s3 7 10 7 10-7 10-7-3-7-10-7z" />,
  share: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.68 14a4 4 0 100-3.93m2.65 4.2a4 4 0 007.4-.43 4 4 0 10-6.14-3.9m.34 3.54a3 3 0 10.74-4.2M9 11l3-4m-2 7l-3 4" />,
  split: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 4h4v4M4 8V4l8 8m6 4h-4v-4m2 4l-8-8" />,
};

export default function Icon({ name, className = 'h-5 w-5' }) {
  const paths = icons[name] || icons.dashboard;
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      {paths}
    </svg>
  );
}