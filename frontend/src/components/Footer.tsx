import { Heart, Github, Linkedin, Mail, Diamond } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
                    {/* Logo and Description */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-primary rounded-md">
                                <div className="w-6 h-8 bg-primary-foreground rounded-sm flex items-center justify-center">
                                    <span className="text-primary font-bold text-sm">
                                        <Diamond className="w-4 h-8" />
                                    </span>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                Planning Poker
                            </h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Streamline your agile estimation process with real-time
                            collaborative planning sessions.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                            Quick Links
                        </h4>
                        <ul className="space-y-2">
                            <li>
                                <a
                                    href="/"
                                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    Home
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/session-history"
                                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    Session History
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/about"
                                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    About
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/contact"
                                    className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                            Connect
                        </h4>
                        <div className="flex gap-3">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                aria-label="GitHub"
                            >
                                <Github className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </a>
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                aria-label="LinkedIn"
                            >
                                <Linkedin className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </a>
                            <a
                                href="mailto:contact@example.com"
                                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                aria-label="Email"
                            >
                                <Mail className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            © {currentYear} Planning Poker. All rights reserved.
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" />{" "}
                            by Your Team
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}

