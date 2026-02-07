This Markdown file is structured as a **Technical Specification & Implementation Prompt**. You can drop this directly into a tool like Claude or ChatGPT to have it begin generating the codebase for **TokenFlow**.

---

# Project Specification: TokenFlow

## 1. Overview

**TokenFlow** is a web-based design system "tuner" that bridges **Tokens Studio (JSON)** and **Storybook**. It allows for real-time manipulation of design tokens via a UI panel, reflecting changes instantly in an embedded Storybook iframe using CSS Custom Properties.

## 2. Technical Stack

* **Framework:** Next.js (App Router)
* **Token Engine:** Style Dictionary (Headless)
* **Preview:** Storybook (via iframe)
* **UI Components:** Radix UI / Tailwind CSS
* **State Management:** Zustand

---

## 3. The Architecture Plan

### A. Data Pipeline

1. **Ingestion:** App accepts `tokens.json` from Tokens Studio.
2. **Transformation:** Style Dictionary resolves aliases and math.
3. **Mapping:** Composite tokens (Typography/Shadows) are broken down into individual CSS Variables.

### B. The Live Bridge

* **Emitter:** The Next.js parent app sends `window.postMessage` payloads when sliders/inputs are adjusted.
* **Receiver:** A Storybook Decorator inside the iframe listens for these messages and executes `document.documentElement.style.setProperty()`.

---

## 4. Implementation Details

### Style Dictionary Configuration

The parser must handle "Composite Tokens" from Tokens Studio.

```javascript
// Transformer for Composite Typography
StyleDictionary.registerTransform({
  name: 'ts/typography/composite',
  type: 'value',
  transitive: true,
  matcher: (token) => token.type === 'typography',
  transformer: (token) => {
    const { fontFamily, fontWeight, lineHeight, fontSize } = token.value;
    return `${fontWeight} ${fontSize}/${lineHeight} ${fontFamily}`;
  }
});

```

### Storybook Decorator (The Receiver)

```javascript
// .storybook/preview.js
export const decorators = [
  (Story) => {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_TOKEN') {
        const { name, value } = event.data.payload;
        document.documentElement.style.setProperty(`--${name}`, value);
      }
    });
    return <Story />;
  },
];

```

---

## 5. UI Requirements (The "Tuner")

* **Typography Section:** Needs a "Composite Card" UI that groups `font-family`, `size`, `weight`, and `line-height`.
* **Color Section:** Hex input + Opacity slider.
* **Spacing Section:** Range sliders (0px to 128px) with `rem` conversion logic.
* **Sync Logic:** A "Download Updated JSON" button that reconstructs the Tokens Studio format based on the current state.

---

## 6. Development Roadmap

1. **Phase 1:** Build the JSON uploader and Style Dictionary resolver logic.
2. **Phase 2:** Implement the Iframe preview window with `postMessage` handshake.
3. **Phase 3:** Create the dynamic UI controls that map to the parsed token list.
4. **Phase 4:** Build the "Export" functionality to push changes back to the design source.

---

**Next Step:** Would you like me to generate the **Zustand store** code that will manage the token state and handle the iframe communication?