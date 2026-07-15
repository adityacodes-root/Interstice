interface ConceptData {
  explanation: string;
  concepts: Array<{ name: string; reason: string }>;
  questions: string[];
}

export const MOCK_EXPAND_DATABASE: Record<string, ConceptData> = {
  "kubernetes": {
    explanation: "Kubernetes is an open-source container orchestration engine that automates deploying, scaling, and operating application containers.",
    concepts: [
      { name: "Linux Containers", reason: "Kernel isolation tools managed by Kubernetes" },
      { name: "Docker", reason: "Standard tool to build and package application containers" },
      { name: "Pods", reason: "Smallest deployable execution units in a Kubernetes cluster" },
      { name: "Microservices", reason: "Architectural style highly suited for container orchestration" },
      { name: "Service Mesh", reason: "Network layer managing secure service-to-service communication" }
    ],
    questions: [
      "What is the role of namespaces in container isolation?",
      "How does a Kubernetes pod differ from a single container?",
      "What are cgroups in the Linux kernel?"
    ]
  },
  "linux containers": {
    explanation: "Linux Containers are lightweight, OS-level virtualization features that run isolated Linux environments on a single host.",
    concepts: [
      { name: "Unix", reason: "Linux containers share file and process patterns designed by Unix" },
      { name: "Control Groups (cgroups)", reason: "Linux kernel feature that limits and monitors process resource usage" },
      { name: "Namespaces", reason: "Linux kernel feature isolating mounts, processes, and networks" },
      { name: "Chroot", reason: "Historical Unix command that changes the apparent root directory for processes" }
    ],
    questions: [
      "What are the security limits of shared-kernel virtualization?",
      "How did namespaces evolve in the Linux kernel?",
      "Why did cgroups become a standard container primitive?"
    ]
  },
  "unix": {
    explanation: "Unix is a family of multitasking, multiuser computer operating systems developed in the 1970s at Bell Labs.",
    concepts: [
      { name: "Bell Labs", reason: "Research hub where Ken Thompson and Dennis Ritchie created Unix" },
      { name: "C Programming Language", reason: "Language created by Dennis Ritchie to write and compile Unix" },
      { name: "GNU Project", reason: "Free software project initiated to create a fully Unix-compatible system" },
      { name: "UTF-8", reason: "Character encoding designed by Unix creators to standardize text display" }
    ],
    questions: [
      "What is the Unix philosophy for software design?",
      "Why was Unix rewritten in the C programming language?",
      "How did BSD fork from the original Unix codebase?"
    ]
  },
  "bell labs": {
    explanation: "Bell Labs is a legendary industrial research and scientific development company that pioneered major computing advancements.",
    concepts: [
      { name: "Claude Shannon", reason: "Researcher who laid mathematical foundations of communication here" },
      { name: "Transistor", reason: "Solid-state electronic device invented at Bell Labs in 1947" },
      { name: "Information Theory", reason: "Mathematical study of communications pioneered by Claude Shannon at the labs" }
    ],
    questions: [
      "What other inventions did Bell Labs pioneer?",
      "How did AT&T's monopoly status fund basic scientific research?",
      "Why did Bell Labs build the first vacuum tube amplifiers?"
    ]
  },
  "claude shannon": {
    explanation: "Claude Shannon was an American mathematician and electronic engineer known as the 'father of information theory'.",
    concepts: [
      { name: "Information Theory", reason: "Discipline founded by Shannon's 1948 landmark scientific paper" },
      { name: "Boolean Algebra", reason: "Shannon proved that Boolean logic could design switching circuits" },
      { name: "Cryptography", reason: "Shannon made fundamental mathematical contributions to wartime cryptography" }
    ],
    questions: [
      "What is the Shannon entropy formula?",
      "How did Shannon contribute to artificial intelligence?",
      "What was the Shannon's Mouse experiment?"
    ]
  },
  "information theory": {
    explanation: "Information Theory is the mathematical study of the coding of information in the form of sequences of symbols, pulses, or signals.",
    concepts: [
      { name: "Entropy", reason: "Measure of uncertainty or randomness in a message source" },
      { name: "Linguistics", reason: "Information theory provides mathematical models for vocabulary and grammar distribution" },
      { name: "Data Compression", reason: "Determined the absolute mathematical limit to lossless file compression" }
    ],
    questions: [
      "What is Shannon's source coding theorem?",
      "How does information entropy map to thermodynamics?",
      "Why is language redundancy useful for error correction?"
    ]
  },
  "japanese language": {
    explanation: "Japanese is an East Asian language spoken by about 128 million people, famous for its unique honorific systems and writing script.",
    concepts: [
      { name: "Kanji", reason: "Adopted Chinese logographic characters used in the Japanese writing system" },
      { name: "Linguistics", reason: "Study of structural, phonetic, and historical traits of human languages" },
      { name: "Hiragana", reason: "Phonetic syllabary used for grammatical particles and native words" },
      { name: "UTF-8", reason: "Global text standard that allows Japanese characters to render on computer screens" }
    ],
    questions: [
      "How does Japanese grammar compare to English syntax?",
      "Where did the Japonic language family originate?",
      "What are the historical roots of Kanji characters?"
    ]
  },
  "quantum physics": {
    explanation: "Quantum Physics is the branch of physics that studies behavior at the atomic and subatomic scales, where classical mechanics breaks down.",
    concepts: [
      { name: "Quantum Entanglement", reason: "State where paired particles remain connected across arbitrary space" },
      { name: "Wave-Particle Duality", reason: "Subatomic entities exhibit properties of both waves and particles" },
      { name: "Schrodinger Equation", reason: "Mathematical equation describing the wave function of a quantum system" },
      { name: "Superposition", reason: "Principle that physical systems exist in multiple states simultaneously" }
    ],
    questions: [
      "What is the Copenhagen interpretation of quantum mechanics?",
      "How does quantum superposition power qubits in computing?",
      "What is the quantum double-slit experiment?"
    ]
  },
  "ancient rome": {
    explanation: "Ancient Rome was a civilization that grew from an agrarian community in the 8th century BC to a colossal empire spanning the Mediterranean.",
    concepts: [
      { name: "Roman Republic", reason: "The representative republic era prior to autocratic emperors" },
      { name: "Roman Law", reason: "The legal framework that forms the basis of continental European law" },
      { name: "Pax Romana", reason: "A 200-year golden age of relative stability and empire expansion" },
      { name: "Aqueducts", reason: "Architectural conduits built to transport water to cities" }
    ],
    questions: [
      "Why did the Roman Republic fall to Augustus Caesar?",
      "How did Roman roads facilitate military logistics?",
      "What was the Justinian Code?"
    ]
  },
  "neuroplasticity": {
    explanation: "Neuroplasticity is the brain's ability to reorganize itself by forming new neural connections throughout life in response to learning.",
    concepts: [
      { name: "Synaptic Pruning", reason: "Process where the brain eliminates unused synapses to increase efficiency" },
      { name: "Neurogenesis", reason: "The growth and development of new neurons in the adult brain" },
      { name: "Cognition", reason: "Mental processes of acquiring knowledge which shape brain pathways" },
      { name: "Myelination", reason: "Process of coating axon paths to speed electrical signals" }
    ],
    questions: [
      "Can adults trigger neurogenesis in the hippocampus?",
      "How does learning a new language affect brain structure?",
      "What is Hebbians theory of synaptic learning?"
    ]
  },
  "epigenetics": {
    explanation: "Epigenetics is the study of how behaviors and environment can cause changes that affect the way genes work without altering DNA sequences.",
    concepts: [
      { name: "DNA Methylation", reason: "Chemical process that turns genes on or off by appending methyl tags" },
      { name: "Histone Modification", reason: "Proteins around which DNA wraps undergo changes that block transcription" },
      { name: "Gene Expression", reason: "The cellular execution of genetic codes based on chemical markers" }
    ],
    questions: [
      "Can epigenetic markers be inherited across generations?",
      "How does stress alter epigenetic tags?",
      "What is the role of histone acetylation in transcription?"
    ]
  }
};

export function getMockExpand(concept: string, mode: string): ConceptData {
  const cleanKey = concept.trim().toLowerCase();
  
  if (MOCK_EXPAND_DATABASE[cleanKey]) {
    return MOCK_EXPAND_DATABASE[cleanKey];
  }

  const formattedName = concept.charAt(0).toUpperCase() + concept.slice(1);
  return {
    explanation: `An exploration of ${formattedName} through a ${mode} lens. This concept forms a crucial node in your active journey.`,
    concepts: [
      { name: `${formattedName} Fundamentals`, reason: `Lays the foundational core properties and definitions of ${formattedName}.` },
      { name: `Advanced ${formattedName}`, reason: `Investigates advanced implementations, systems, or edge theories.` },
      { name: `Applications of ${formattedName}`, reason: `Examines how ${formattedName} is applied practically across fields.` },
      { name: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Context of ${formattedName}`, reason: `Applies your active ${mode} mode to expand the theme.` },
      { name: `Pioneers of ${formattedName}`, reason: `Investigates the history, creators, and key figures who discovered ${formattedName}.` }
    ],
    questions: [
      `What are the core mechanics of ${formattedName}?`,
      `How does ${formattedName} relate to neighbouring disciplines?`,
      `What is the future outlook for ${formattedName}?`
    ]
  };
}

export function getMockConnect(conceptA: string, conceptB: string): { path: any[] } {
  const keyA = conceptA.toLowerCase().trim();
  const keyB = conceptB.toLowerCase().trim();

  if (
    (keyA === "kubernetes" && keyB === "japanese language") ||
    (keyA === "japanese language" && keyB === "kubernetes")
  ) {
    const forwardPath = [
      { name: "Kubernetes", reason: "Origin concept", explanation: "An open-source container orchestration engine." },
      { name: "Linux Containers", reason: "Kubernetes is built to schedule and run isolated Linux containers.", explanation: "Lightweight OS-level virtualization tools." },
      { name: "Unix", reason: "Linux operating systems implement file and shell standards designed by Unix.", explanation: "Foundational multiuser OS created at Bell Labs." },
      { name: "UTF-8", reason: "Created by Unix co-developers Thompson and Pike to encode global characters.", explanation: "Universal character encoding standard." },
      { name: "Japanese Language", reason: "National language of Japan, rendered globally on modern operating systems via UTF-8.", explanation: "East Asian language spoken by over 128 million people." }
    ];
    return { path: keyA === "kubernetes" ? forwardPath : [...forwardPath].reverse() };
  }

  return {
    path: [
      { name: conceptA, reason: "Origin concept", explanation: `Initial topic entered: ${conceptA}.` },
      { name: `${conceptA} Infrastructure`, reason: `Provides the mechanical baseline and operational architecture for ${conceptA}.`, explanation: "Infrastructure systems backing operations." },
      { name: "Universal Standards", reason: "Protocols and global encoding rules bridging distinct domains.", explanation: "Common formatting standards." },
      { name: `${conceptB} Application`, reason: `Applies global standards to enable the operations of ${conceptB}.`, explanation: "Practical integrations." },
      { name: conceptB, reason: "Target destination concept reached.", explanation: `Final target topic: ${conceptB}.` }
    ]
  };
}
