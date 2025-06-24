def generate_random_project_name():
    """Generate a random project name for the room"""
    import random

    # Cool tech-inspired adjectives
    adjectives = [
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
    ]

    # Futuristic/cool nouns
    nouns = [
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
    ]

    # Optional: Cool codenames/suffixes (used sometimes)
    codenames = [
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
    ]

    adjective = random.choice(adjectives)
    noun = random.choice(nouns)

    # 30% chance to add a codename suffix
    if random.random() < 0.3:
        codename = random.choice(codenames)
        return f"{adjective} {noun} {codename}"
    else:
        return f"{adjective} {noun}"
