
import React from 'react';
import './typography.css';

export const Typography = () => {
    return (
        <div className="typography-container">
            <div className="typography-item">
                <span className="typography-label">H1 - Desktop</span>
                <h1>The quick brown fox jumps over the lazy dog</h1>
            </div>
            <div className="typography-item">
                <span className="typography-label">H2 - Desktop</span>
                <h2>The quick brown fox jumps over the lazy dog</h2>
            </div>
            <div className="typography-item">
                <span className="typography-label">H3 - Desktop</span>
                <h3>The quick brown fox jumps over the lazy dog</h3>
            </div>
            <div className="typography-item">
                <span className="typography-label">H4 - Desktop</span>
                <h4>The quick brown fox jumps over the lazy dog</h4>
            </div>
            <div className="typography-item">
                <span className="typography-label">H5 - Desktop</span>
                <h5>The quick brown fox jumps over the lazy dog</h5>
            </div>
            <div className="typography-item">
                <span className="typography-label">H6 - Desktop</span>
                <h6>The quick brown fox jumps over the lazy dog</h6>
            </div>
        </div>
    );
};
