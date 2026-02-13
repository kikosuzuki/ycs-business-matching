import React from 'react';

/** プライバシーポリシー・利用規約へのリンクを表示するフッター */
const base = typeof window !== 'undefined' && window.location.pathname.startsWith('/match') ? '/match' : '';
const PRIVACY_PATH = `${base}/privacy.html`;
const TERMS_PATH = `${base}/terms.html`;

export const Footer: React.FC = () => (
  <footer className="mt-auto py-4 text-center text-sm text-gray-500 border-t border-gray-200 bg-white/50">
    <a
      href={PRIVACY_PATH}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-600 hover:text-purple-800 hover:underline"
    >
      プライバシーポリシー
    </a>
    <span className="mx-2">|</span>
    <a
      href={TERMS_PATH}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-600 hover:text-purple-800 hover:underline"
    >
      利用規約
    </a>
  </footer>
);

export default Footer;
