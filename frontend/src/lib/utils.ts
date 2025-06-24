import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const randomRoomNameGernetor = () => {
  const adjectives = [
    "Quantum",
    "Cyber",
    "Neural",
    "Fusion",
    "Phoenix",
    "Stellar",
    "Nexus",
    "Vector",
    "Matrix",
    "Atomic",
    "Digital",
    "Cosmic",
    "Turbo",
    "Ultra",
    "Hyper",
    "Meta",
    "Alpha",
    "Beta",
    "Sigma",
    "Neon",
    "Chrome",
    "Plasma",
    "Laser",
    "Thunder",
    "Lightning",
    "Shadow",
    "Ghost",
    "Phantom",
    "Vortex",
    "Prism",
    "Crystal",
  ];
  const nouns = [
    "Protocol",
    "Engine",
    "Reactor",
    "Core",
    "Hub",
    "Network",
    "Circuit",
    "Portal",
    "Gateway",
    "Forge",
    "Lab",
    "Station",
    "Terminal",
    "Interface",
    "Drive",
    "Sphere",
    "Cluster",
    "Grid",
    "Node",
    "Pulse",
    "Wave",
    "Beam",
    "Storm",
    "Force",
    "Prime",
    "Genesis",
    "Odyssey",
    "Infinity",
    "Eclipse",
    "Spectrum",
    "Flux",
  ];
  const condnames = [
    "Alpha",
    "X",
    "Zero",
    "One",
    "Prime",
    "Max",
    "Pro",
    "Elite",
    "Ultra",
    "2077",
    "3000",
    "Neo",
    "Alpha",
    "Beta",
    "Omega",
    "Infinity",
  ];

  const randomCondname =
    condnames[Math.floor(Math.random() * condnames.length)];
  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  // Fix: Always return a value with proper random selection
  const randomChoice = Math.random();
  if (randomChoice < 0.33) {
    return `${randomAdjective} ${randomNoun} ${randomCondname}`;
  } else if (randomChoice < 0.66) {
    return `${randomAdjective} ${randomCondname} ${randomNoun}`;
  } else {
    return `${randomNoun} ${randomAdjective} ${randomCondname}`;
  }
};
