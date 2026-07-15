# Interstice: Knowledge Exploration Engine

An **interstice** is a space between things.

Interstice is an interactive web application for exploring spaces between ideas. Starting from any concept, it builds dynamic visual knowledge graphs that reveal relationships across technology, history, philosophy, science, and beyond.

Powered by Wikipedia and large language models, Interstice contextualizes concepts in real time, generating thematic clusters, adjacent subjects, and pathways between seemingly unrelated domains.

At its core, Interstice is designed to answer a simple question:

> *What lies between the things we already know?*

## Screenshots

### Landing Page 
![Landing Page Dark Mode](/public/screenshots/landing_dark.png)

### Concept Graph Explorer

![Concept Explorer Light Mode](/public/screenshots/graph_light.png)

---

## Core Features

- **Exploration Lenses (Sidebar Modes)**
  * Customize the perspective of the generator. Switching modes shifts the thematic lens through which new concepts are dynamically spawned:
    * **Default**: Well-rounded, general-purpose relationship mapping.
    * **Contrarian**: Highlights debates, paradoxes, criticisms, and counterargument.
    * **Technical**: Focuses on architecture, code, algorithms, and engineering.
    * **Historical**: Traces historical progression, origins, and chronological impact.
    * **Business**: Maps market dynamics, business models, and economic loops.
    * **Philosophical**: Explores epistemological roots, ethics, and abstract constructs.

- **Connection Finder**
  * Enter any two concepts (e.g., *Quantum Mechanics* and *Ancient Rome*) to find a path connecting them.
  * The engine computes a logical transition chain and renders the connecting bridge directly onto the active workspace.

- **Favorites & Journey History**
  * Star nodes to pin them to your saved shelf.
  * Re-explore previous search journeys and reload saved graphs at any time.

---

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adityacodes-root/interstice.git
   cd interstice
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env.local` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
   ```
   *Note: You can obtain a free API key at [console.groq.com](https://console.groq.com).*

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---


## Navigation & Controls

| Action | Control | Result |
|---|---|---|
| **Select Node** | `Click` | Focuses the concept and slides open detailed context, Wikipedia pages, and related suggestions in the sidebar. |
| **Expand Node** | `Double-Click` | Triggers the generator to spawn a new set of related surrounding concepts. |
| **Move Node** | `Drag Node` | Repositions any node on the workspace to custom-organize your map. |
| **Pan Workspace** | `Drag Canvas` | Slides the view across the coordinate space. |
| **Zoom View** | `Scroll Wheel` | Zooms in or out of the concept graph. |

---

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── connect/        # Pathfinding API route
│   │   │   ├── expand/         # Graph expansion API route
│   │   │   ├── explain-journey/# Journey narratives
│   │   │   └── why-seeing-this/# Contextual relationships
│   │   ├── globals.css         # Typography, themes, and animations
│   │   ├── layout.tsx          # Font loading & layout config
│   │   └── page.tsx            # Root Next.js entrypoint
│   ├── components/
│   │   ├── graph/              # Concept nodes, custom edges, zones
│   │   ├── pages/              # Landing, Explorer, Paths, and Saved tab
│   │   ├── ui/                 # Dither shader & visual overlays
│   │   └── AppLayout.tsx       # Sidebar, Help modal, and controls
│   ├── store/
│   │   └── useIntersticeStore.ts # Zustand state management
│   └── utils/
│       ├── ai.ts               # LLM system configurations
│       └── wikipedia.ts        # Wikipedia API integration
└── next.config.ts              # Next.js build options
```

---

## Acknowledgments

* **Dither Background**: The dither background on the landing page was adapted from the React components provided by [React Bits](https://reactbits.dev/).

---

## License

MIT License

