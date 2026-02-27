import { Button } from './Button';
import './header.css';

export interface NavItem {
  label: string;
  href?: string;
  dropdown?: boolean;
  active?: boolean;
}

export interface HeaderProps {
  pageName?: string;
  navItems?: NavItem[];
  showSearch?: boolean;
  showButtonGroup?: boolean;
  primaryCta?: { label: string; onClick?: () => void };
  secondaryCta?: { label: string; onClick?: () => void };
  onSearch?: () => void;
  breakpoint?: 'desktop' | 'mobile';
}

const WaffleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="3" y="3" width="4" height="4" rx="1" />
    <rect x="10" y="3" width="4" height="4" rx="1" />
    <rect x="17" y="3" width="4" height="4" rx="1" />
    <rect x="3" y="10" width="4" height="4" rx="1" />
    <rect x="10" y="10" width="4" height="4" rx="1" />
    <rect x="17" y="10" width="4" height="4" rx="1" />
    <rect x="3" y="17" width="4" height="4" rx="1" />
    <rect x="10" y="17" width="4" height="4" rx="1" />
    <rect x="17" y="17" width="4" height="4" rx="1" />
  </svg>
);

const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="3" y="6" width="18" height="2" rx="1" fill="currentColor" />
    <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" />
    <rect x="3" y="16" width="18" height="2" rx="1" fill="currentColor" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="none" fillRule="evenodd">
      <path d="M10 0h12a10 10 0 0110 10v12a10 10 0 01-10 10H10A10 10 0 010 22V10A10 10 0 0110 0z" fill="#FFF" />
      <path d="M5.3 10.6l10.4 6v11.1l-10.4-6v-11zm11.4-6.2l9.7 5.5-9.7 5.6V4.4z" fill="#555AB9" />
      <path d="M27.2 10.6v11.2l-10.5 6V16.5l10.5-6zM15.7 4.4v11L6 10l9.7-5.5z" fill="#91BAF8" />
    </g>
  </svg>
);

export const Header = ({
  pageName = 'Page Name',
  navItems = [],
  showSearch = true,
  showButtonGroup = true,
  primaryCta,
  secondaryCta,
  onSearch,
  breakpoint = 'desktop',
}: HeaderProps) => {
  if (breakpoint === 'mobile') {
    return (
      <header className="header header--mobile">
        <button className="header__icon-btn" aria-label="Open menu">
          <HamburgerIcon />
        </button>
        <div className="header__logo header__logo--centered">
          <LogoIcon />
        </div>
        <div className="header__actions">
          {primaryCta && (
            <button className="header__cta-flat" onClick={primaryCta.onClick}>
              {primaryCta.label}
            </button>
          )}
          {showSearch && (
            <button className="header__search-btn" onClick={onSearch} aria-label="Search">
              <SearchIcon />
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="header header--desktop">
      <div className="header__logo-section">
        <button className="header__icon-btn" aria-label="App menu">
          <WaffleIcon />
        </button>
        <div className="header__logo">
          <LogoIcon />
        </div>
        {pageName && <span className="header__page-name">{pageName}</span>}
      </div>

      {navItems.length > 0 && (
        <nav className="header__nav" aria-label="Main navigation">
          {navItems.map((item, i) => (
            <a
              key={i}
              href={item.href ?? '#'}
              className={`header__nav-item${item.active ? ' header__nav-item--active' : ''}`}
            >
              {item.label}
              {item.dropdown && (
                <span className="header__nav-chevron">
                  <ChevronDownIcon />
                </span>
              )}
            </a>
          ))}
        </nav>
      )}

      <div className="header__actions">
        {showButtonGroup && (
          <>
            {secondaryCta && (
              <Button variant="secondary" size="small" onClick={secondaryCta.onClick} label={secondaryCta.label} />
            )}
            {primaryCta && (
              <Button variant="primary" size="small" onClick={primaryCta.onClick} label={primaryCta.label} />
            )}
          </>
        )}
        {showSearch && (
          <button className="header__search-btn" onClick={onSearch} aria-label="Search">
            <SearchIcon />
          </button>
        )}
      </div>
    </header>
  );
};
