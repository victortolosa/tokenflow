
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { TokenGrid } from '../../components/TokenGrid';
import { fetchTokens, resolveTokenValue, flattenTokens } from '../../utils/token-utils';

const meta: Meta = {
    title: 'Design System/Colors',
    component: TokenGrid,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

export const Palettes: StoryObj = {
    render: () => {
        const [tokens, setTokens] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            async function loadTokens() {
                // Fetch Global tokens (Palettes are usually here)
                const globalTokens = await fetchTokens('/tokens/Snap%20Motif/Global.json');

                // Flatten and filter for colors
                // We know Global.json has a "Palette" group at the top level
                let paletteTokens: any[] = [];

                if (globalTokens.Palette) {
                    paletteTokens = flattenTokens(globalTokens.Palette, globalTokens, 'Palette');
                } else {
                    // fallback if structure is different
                    paletteTokens = flattenTokens(globalTokens, globalTokens).filter(t => t.type === 'color');
                }

                setTokens(paletteTokens);
                setLoading(false);
            }

            loadTokens();
        }, []);

        if (loading) return <div>Loading tokens...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Color Palettes</h2>
                <p className="mb-8 text-gray-600">Base color palettes used throughout the system.</p>
                <TokenGrid tokens={tokens} type="color" />
            </div>
        );
    },
};

export const SemanticColors: StoryObj = {
    render: () => {
        const [tokens, setTokens] = useState<any[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            async function loadTokens() {
                // We need both Global (for references) and Primary (for semantic definitions)
                const globalTokens = await fetchTokens('/tokens/Snap%20Motif/Global.json');
                const primaryTokens = await fetchTokens('/tokens/Snap%20Motif/Primary.json');

                // Combine for resolution context
                const allTokens = { ...globalTokens, ...primaryTokens, Palette: globalTokens.Palette };
                // Note context merging is tricky if keys collide, but here we just need lookup for references.
                // Usually references are like {Palette.Blue.v50}, so we need Palette at root.

                // Resolve Primary tokens
                const semanticTokens = flattenTokens(primaryTokens, allTokens).filter(t => t.type === 'color');

                setTokens(semanticTokens);
                setLoading(false);
            }

            loadTokens();
        }, []);

        if (loading) return <div>Loading tokens...</div>;

        return (
            <div>
                <h2 className="text-2xl font-bold mb-4">Semantic Colors (Primary Theme)</h2>
                <p className="mb-8 text-gray-600">
                    Colors assigned to specific UI roles. Showing "Primary" mode.
                </p>
                <TokenGrid tokens={tokens} type="color" />
            </div>
        );
    },
};
