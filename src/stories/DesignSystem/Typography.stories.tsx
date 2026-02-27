
import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { TokenGrid } from '../../components/TokenGrid';
import { fetchTokens, flattenTokens, deepMerge } from '../../utils/token-utils';

const meta: Meta = {
    title: 'Design System/Typography',
    component: TokenGrid,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

const TypographySection = ({
    title,
    types,
    description,
}: {
    title: string;
    types: string[] | string;
    description?: string;
}) => {
    const [tokens, setTokens] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const filterTypes = Array.isArray(types) ? types : [types];
    const filterKey = filterTypes.join('|');

    useEffect(() => {
        async function loadTokens() {
            const globalTokens = await fetchTokens('/tokens/Snap%20Motif/Global.json');
            const primaryTokens = await fetchTokens('/tokens/Snap%20Motif/Primary.json');
            const merged = deepMerge(globalTokens, primaryTokens);
            const typographyTokens = flattenTokens(merged, merged).filter(t => filterTypes.includes(t.type));
            setTokens(typographyTokens);
            setLoading(false);
        }
        loadTokens();
    }, [filterKey]);

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            {description && <p className="mb-6 text-gray-600">{description}</p>}
            <TokenGrid tokens={tokens} type="typography" />
        </div>
    );
};

export const FontSizes: StoryObj = {
    render: () => (
        <TypographySection
            title="Font Sizes"
            types="fontSizes"
        />
    ),
};

export const FontWeights: StoryObj = {
    render: () => (
        <TypographySection
            title="Font Weights"
            types="fontWeights"
        />
    ),
};

export const FontFamilies: StoryObj = {
    render: () => (
        <TypographySection
            title="Font Families"
            types="fontFamilies"
        />
    ),
};

export const LineHeights: StoryObj = {
    render: () => (
        <TypographySection
            title="Line Heights"
            types="lineHeights"
            description="Line height tokens applied to a multi-line sample."
        />
    ),
};

export const LetterSpacing: StoryObj = {
    render: () => (
        <TypographySection
            title="Letter Spacing"
            types="letterSpacing"
            description="Tracking values shown on sample text."
        />
    ),
};

export const TextCase: StoryObj = {
    render: () => (
        <TypographySection
            title="Text Case"
            types="textCase"
            description="Text transform tokens applied to the same phrase."
        />
    ),
};

export const TextDecoration: StoryObj = {
    render: () => (
        <TypographySection
            title="Text Decoration"
            types="textDecoration"
            description="Decoration tokens applied to link-style text."
        />
    ),
};
