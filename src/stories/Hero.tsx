import React from 'react';
import './hero.css';
import { Button } from './Button';
const DEFAULT_HERO_IMAGE = '/imgs/placeholder-portrait.png';

export interface HeroProps {
  eyebrow: string;
  title: string;
  titleEmphasis?: string;
  titleSuffix?: string;
  subtitle: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
  imageSrc?: string;
  imageAlt: string;
  showScrollButton?: boolean;
  curtainActive?: boolean;
}

export const Hero = ({
  eyebrow,
  title,
  titleEmphasis,
  titleSuffix,
  subtitle,
  body,
  primaryCta,
  secondaryCta,
  imageSrc = DEFAULT_HERO_IMAGE,
  imageAlt,
  showScrollButton = true,
  curtainActive = false,
}: HeroProps) => {
  return (
    <section className="hero" data-curtain={curtainActive ? 'active' : 'default'}>
      <div className="hero__inner">
        <div className="hero__content">
          <span className="hero__eyebrow">{eyebrow}</span>
          <h1 className="hero__title">
            {title}
            {titleEmphasis ? (
              <>
                {' '}
                <span className="hero__title-emphasis">{titleEmphasis}</span>
              </>
            ) : null}
            {titleSuffix ? ` ${titleSuffix}` : ''}
          </h1>
          <p className="hero__subtitle">{subtitle}</p>
          <p className="hero__body">{body}</p>
          <div className="hero__actions">
            <Button variant="primary" size="large" label={primaryCta} />
            <Button variant="secondary" size="large" label={secondaryCta} />
          </div>
          {showScrollButton ? (
            <button type="button" className="hero__scroll-button" aria-label="Scroll down">
              <span aria-hidden="true">↓</span>
            </button>
          ) : null}
        </div>
        <div className="hero__media">
          <img src={imageSrc} alt={imageAlt} loading="lazy" />
        </div>
      </div>
    </section>
  );
};
