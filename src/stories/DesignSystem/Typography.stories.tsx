
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { TokenGrid } from '../../components/TokenGrid';
import { fetchTokens, flattenTokens } from '../../utils/token-utils';

const meta: Meta = {
    title: 'Design System/Typography',
    component: TokenGrid,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

export const FontSizes: StoryObj = {
    render: () => {
        const [tokens, setTokens] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            async function loadTokens() {
                const globalTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Global.json');
                // Flatten and filter for fontSizes
                const fontSizes = flattenTokens(globalTokens, globalTokens).filter(t => t.type === 'fontSizes');
                setTokens(fontSizes);
                setLoading(false);
            }
            loadTokens();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Font Sizes</h2>
                <TokenGrid tokens={tokens} type="typography" />
            </div>
        );
    }
};

export const FontWeights: StoryObj = {
    render: () => {
        const [tokens, setTokens] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            async function loadTokens() {
                const globalTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Global.json');
                const weights = flattenTokens(globalTokens, globalTokens).filter(t => t.type === 'fontWeights');
                setTokens(weights);
                setLoading(false);
            }
            loadTokens();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Font Weights</h2>
                <TokenGrid tokens={tokens} type="typography" />
            </div>
        );
    }
};

export const FontFamilies: StoryObj = {
    render: () => {
        const [tokens, setTokens] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            async function loadTokens() {
                const globalTokens = await fetchTokens('/sample-json/tokens/Snap%20Motif/Global.json');
                const families = flattenTokens(globalTokens, globalTokens).filter(t => t.type === 'fontFamilies');
                setTokens(families);
                setLoading(false);
            }
            loadTokens();
        }, []);

        if (loading) return <div>Loading...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Font Families</h2>
                <TokenGrid tokens={tokens} type="typography" />
            </div>
        );
    }
};
